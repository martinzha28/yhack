"""
Compute the V2 project-to-project graph.

Nodes are projects. An edge between two projects exists when people
work on both, weighted by the sum of min(weight_a, weight_b) across
all shared members. This captures how tightly coupled two projects
are through shared personnel.

Reads:  data/extracted_projects.json
        data/slack_data.json          (for person display names + teams)
Writes: frontend/public/project_graph.json
"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXTRACTED_PATH = ROOT / "data" / "extracted_projects.json"
SLACK_DATA_PATH = ROOT / "data" / "slack_data.json"
OUTPUT_PATH = ROOT / "frontend" / "public" / "project_graph.json"

MIN_PERSON_WEIGHT = 0.2


def _display_name(full_name: str) -> str:
    """Strip LLM-added parentheticals, e.g.
    'Auth Service Refactor (OAuth2 PKCE)' → 'Auth Service Refactor'
    'Billing System Revamp (Billing v2)' → 'Billing System Revamp'
    """
    return re.sub(r"\s*\(.*?\)", "", full_name).strip()


def compute_project_graph() -> None:
    # ── Load data ────────────────────────────────────────────────────────────
    with open(EXTRACTED_PATH) as f:
        data = json.load(f)

    with open(SLACK_DATA_PATH) as f:
        slack = json.load(f)

    # id → {name, team} for every person
    person_info: dict[str, dict[str, str]] = {
        p["id"]: {"name": p["name"], "team": p.get("team", "")} for p in slack["people"]
    }

    projects: list[dict] = data["projects"]
    person_weights: dict[str, dict[str, float]] = data["person_weights"]
    person_roles: dict[str, dict[str, str]] = data.get("person_roles", {})

    project_ids = [p["id"] for p in projects]

    # ── Build project → [(person_id, weight, role)] ───────────────────────────
    project_people: dict[str, list[tuple[str, float, str]]] = defaultdict(list)
    for pid, weights in person_weights.items():
        roles = person_roles.get(pid, {})
        for proj_id, w in weights.items():
            if w >= MIN_PERSON_WEIGHT:
                project_people[proj_id].append(
                    (pid, w, roles.get(proj_id, "contributor"))
                )

    # ── Compute edges ─────────────────────────────────────────────────────────
    # For each project pair, overlap score = Σ min(weight_a, weight_b)
    # across all people who work on both.
    raw_edges: dict[tuple[str, str], dict] = {}

    for i, proj_a in enumerate(project_ids):
        people_a = {pid: (w, r) for pid, w, r in project_people.get(proj_a, [])}
        for proj_b in project_ids[i + 1 :]:
            people_b = {pid: (w, r) for pid, w, r in project_people.get(proj_b, [])}

            shared = set(people_a) & set(people_b)
            if not shared:
                continue

            overlap_score = sum(
                min(people_a[pid][0], people_b[pid][0]) for pid in shared
            )

            shared_details: list[dict] = []
            for pid in shared:
                info = person_info.get(pid, {})
                shared_details.append(
                    {
                        "id": pid,
                        "name": info.get("name", pid.replace("_", " ").title()),
                        "team": info.get("team", ""),
                        "weight_a": people_a[pid][0],
                        "role_a": people_a[pid][1],
                        "weight_b": people_b[pid][0],
                        "role_b": people_b[pid][1],
                    }
                )
            # Sort by the stronger of the two weights so the most involved
            # people appear first in the UI.
            shared_details.sort(key=lambda x: -min(x["weight_a"], x["weight_b"]))

            a, b = tuple(sorted([proj_a, proj_b]))
            raw_edges[(a, b)] = {
                "score": overlap_score,
                "shared_count": len(shared),
                "shared_people": shared_details,
            }

    # ── Normalise edge weights to [0, 1] ──────────────────────────────────────
    max_score = max((e["score"] for e in raw_edges.values()), default=1.0)

    # ── Build nodes ───────────────────────────────────────────────────────────
    nodes: list[dict] = []
    for p in projects:
        members = project_people.get(p["id"], [])
        members.sort(key=lambda x: -x[1])  # descending weight

        nodes.append(
            {
                "id": p["id"],
                # Full LLM name kept for reference
                "name": p["name"],
                # Clean label used in UI (parentheticals stripped)
                "display_name": _display_name(p["name"]),
                "status": p.get("status", "active"),
                "time_range": p.get("time_range", ""),
                "keywords": p.get("keywords", []),
                "member_count": len(members),
                "members": [
                    {
                        "id": pid,
                        "name": person_info.get(pid, {}).get(
                            "name", pid.replace("_", " ").title()
                        ),
                        "team": person_info.get(pid, {}).get("team", ""),
                        "weight": round(w, 3),
                        "role": r,
                    }
                    for pid, w, r in members
                ],
            }
        )

    # ── Build links ───────────────────────────────────────────────────────────
    links: list[dict] = []
    for (a, b), edge in raw_edges.items():
        links.append(
            {
                "source": a,
                "target": b,
                "weight": round(edge["score"] / max_score, 4),
                "shared_count": edge["shared_count"],
                "shared_people": edge["shared_people"],
            }
        )

    links.sort(key=lambda l: l["weight"], reverse=True)

    # ── Write output ──────────────────────────────────────────────────────────
    graph = {"nodes": nodes, "links": links}

    with open(OUTPUT_PATH, "w") as f:
        json.dump(graph, f, indent=2)

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"Project graph: {len(nodes)} nodes, {len(links)} links")
    if links:
        print(f"Weight range: {links[-1]['weight']:.4f} — {links[0]['weight']:.4f}")

    print("\nAll connections (sorted by strength):")
    for lnk in links:
        people_str = ", ".join(p["name"] for p in lnk["shared_people"][:4])
        print(
            f"  {lnk['source']} ↔ {lnk['target']}  "
            f"weight={lnk['weight']:.2f}  "
            f"({lnk['shared_count']} shared: {people_str})"
        )

    print("\nProject sizes:")
    for n in sorted(nodes, key=lambda x: -x["member_count"]):
        members_str = ", ".join(m["name"] for m in n["members"][:5])
        print(f"  {n['id']}: {n['member_count']} members ({members_str})")


if __name__ == "__main__":
    compute_project_graph()
