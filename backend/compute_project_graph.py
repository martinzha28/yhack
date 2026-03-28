import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PEOPLE_PATH = ROOT / "data" / "people.json"
PROJECTS_PATH = ROOT / "data" / "projects.json"
OUTPUT_PATH = ROOT / "frontend" / "public" / "project_graph.json"


def compute_project_graph(input_people=None, input_projects=None, output_path=None):
    input_people = input_people or PEOPLE_PATH
    input_projects = input_projects or PROJECTS_PATH
    output_path = output_path or OUTPUT_PATH

    with open(input_people) as f:
        people = json.load(f)

    with open(input_projects) as f:
        projects = json.load(f)

    # Build person → team mapping
    person_team: dict[str, str] = {p["id"]: p["team"] for p in people}

    # Build project nodes with per-team member distribution
    nodes = []
    for proj in projects:
        members: list[str] = proj["members"]
        team_counts: dict[str, int] = defaultdict(int)
        for member_id in members:
            team = person_team.get(member_id, "unknown")
            team_counts[team] += 1

        total = len(members)
        sorted_counts = sorted(team_counts.items(), key=lambda kv: -kv[1])
        team_distribution = [
            {
                "team": team,
                "count": count,
                "proportion": round(count / total, 4),
            }
            for team, count in sorted_counts
        ]

        nodes.append(
            {
                "id": proj["id"],
                "name": proj["name"],
                "members": members,
                "member_count": total,
                "status": proj.get("status", "active"),
                "time_range": proj.get("time_range", ""),
                "keywords": proj.get("keywords", []),
                "team_distribution": team_distribution,
            }
        )

    # Build project → member-set mapping for intersection calculation
    proj_members: dict[str, set[str]] = {
        proj["id"]: set(proj["members"]) for proj in projects
    }
    project_ids = [proj["id"] for proj in projects]

    # Compute raw shared-member count for every unordered project pair
    raw_links: list[tuple[str, str, int]] = []
    for i in range(len(project_ids)):
        for j in range(i + 1, len(project_ids)):
            a = project_ids[i]
            b = project_ids[j]
            shared = len(proj_members[a] & proj_members[b])
            if shared > 0:
                raw_links.append((a, b, shared))

    # Normalise weights to [0, 1] by dividing by the maximum shared count
    max_shared = max((s for _, _, s in raw_links), default=1)

    links = [
        {
            "source": a,
            "target": b,
            "shared_members": shared,
            "weight": round(shared / max_shared, 4),
        }
        for a, b, shared in raw_links
    ]
    links.sort(key=lambda lnk: lnk["weight"], reverse=True)

    graph = {"nodes": nodes, "links": links}

    with open(output_path, "w") as f:
        json.dump(graph, f, indent=2)

    print(f"Project graph computed: {len(nodes)} nodes, {len(links)} links")
    if links:
        print(f"Weight range: {links[-1]['weight']:.4f} — {links[0]['weight']:.4f}")

    print(f"\nMax shared members across any pair: {max_shared}")
    print("\nTop connections by shared-member count:")
    for lnk in links[:8]:
        print(
            f"  {lnk['source']:<25} <-> {lnk['target']:<25}"
            f"  shared={lnk['shared_members']}  weight={lnk['weight']:.4f}"
        )

    print("\nProject team breakdowns:")
    for n in nodes:
        dist_str = "  ".join(
            f"{s['team']}:{s['count']}" for s in n["team_distribution"]
        )
        print(f"  {n['name']:<30} ({n['member_count']} members)  {dist_str}")

    return graph


if __name__ == "__main__":
    compute_project_graph()
