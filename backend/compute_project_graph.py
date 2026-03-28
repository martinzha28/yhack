"""
Compute the V2 project-to-project graph.

Nodes are projects. An edge between two projects exists when people
work on both, weighted by the sum of min(weight_a, weight_b) across
all shared members. This captures how tightly coupled two projects
are through shared personnel.

Reads:  data/extracted_projects.json
Writes: frontend/public/project_graph.json
"""

import json
import math
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent
EXTRACTED_PATH = ROOT / "data" / "extracted_projects.json"
OUTPUT_PATH = ROOT / "frontend" / "public" / "project_graph.json"

MIN_PERSON_WEIGHT = 0.2


def compute_project_graph():
    with open(EXTRACTED_PATH) as f:
        data = json.load(f)

    projects = data["projects"]
    person_weights = data["person_weights"]
    person_roles = data.get("person_roles", {})

    project_ids = [p["id"] for p in projects]

    # Build project -> list of (person_id, weight, role)
    project_people: dict[str, list[tuple[str, float, str]]] = defaultdict(list)
    for pid, weights in person_weights.items():
        roles = person_roles.get(pid, {})
        for proj_id, w in weights.items():
            if w >= MIN_PERSON_WEIGHT:
                project_people[proj_id].append((pid, w, roles.get(proj_id, "contributor")))

    # Compute edges: for each pair of projects, sum min(weight_a, weight_b)
    # for every person who works on both
    raw_edges: dict[tuple[str, str], dict] = {}

    for i, proj_a in enumerate(project_ids):
        people_a = {pid: (w, r) for pid, w, r in project_people.get(proj_a, [])}
        for proj_b in project_ids[i + 1:]:
            people_b = {pid: (w, r) for pid, w, r in project_people.get(proj_b, [])}

            shared = set(people_a.keys()) & set(people_b.keys())
            if not shared:
                continue

            overlap_score = sum(
                min(people_a[pid][0], people_b[pid][0])
                for pid in shared
            )

            shared_details = []
            for pid in shared:
                shared_details.append({
                    "id": pid,
                    "weight_a": people_a[pid][0],
                    "role_a": people_a[pid][1],
                    "weight_b": people_b[pid][0],
                    "role_b": people_b[pid][1],
                })
            shared_details.sort(key=lambda x: -min(x["weight_a"], x["weight_b"]))

            a, b = tuple(sorted([proj_a, proj_b]))
            raw_edges[(a, b)] = {
                "score": overlap_score,
                "shared_count": len(shared),
                "shared_people": shared_details,
            }

    # Normalize edge weights to [0, 1]
    max_score = max((e["score"] for e in raw_edges.values()), default=1.0)

    # Build nodes
    nodes = []
    for p in projects:
        members = project_people.get(p["id"], [])
        members.sort(key=lambda x: -x[1])
        nodes.append({
            "id": p["id"],
            "name": p["name"],
            "status": p.get("status", "active"),
            "time_range": p.get("time_range", ""),
            "keywords": p.get("keywords", []),
            "member_count": len(members),
            "members": [
                {"id": pid, "weight": w, "role": r}
                for pid, w, r in members
            ],
        })

    # Build links
    links = []
    for (a, b), edge in raw_edges.items():
        links.append({
            "source": a,
            "target": b,
            "weight": round(edge["score"] / max_score, 4),
            "shared_count": edge["shared_count"],
            "shared_people": edge["shared_people"],
        })

    links.sort(key=lambda l: l["weight"], reverse=True)

    graph = {"nodes": nodes, "links": links}

    with open(OUTPUT_PATH, "w") as f:
        json.dump(graph, f, indent=2)

    print(f"Project graph: {len(nodes)} nodes, {len(links)} links")
    print(f"Weight range: {links[-1]['weight']:.4f} — {links[0]['weight']:.4f}")

    print("\nAll connections (sorted by strength):")
    for l in links:
        people_str = ", ".join(p["id"] for p in l["shared_people"][:4])
        print(f"  {l['source']} ↔ {l['target']}  weight={l['weight']:.2f}  "
              f"({l['shared_count']} shared: {people_str})")

    print("\nProject sizes:")
    for n in sorted(nodes, key=lambda x: -x["member_count"]):
        members_str = ", ".join(m["id"] for m in n["members"][:5])
        print(f"  {n['id']}: {n['member_count']} members ({members_str})")


if __name__ == "__main__":
    compute_project_graph()
