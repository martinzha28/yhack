import json
import math
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from leiden_communities import compute_leiden_communities

ROOT = Path(__file__).resolve().parent.parent
SLACK_DATA_PATH = ROOT / "data" / "slack_data.json"
EXTRACTED_PATH = ROOT / "data" / "extracted_projects.json"
OUTPUT_PATH = ROOT / "frontend" / "public" / "graph.json"

LAMBDA = 0.01
DM_MULTIPLIER = 1.0
GROUP_MULTIPLIER = 0.3
MENTION_MULTIPLIER = 0.5

REFERENCE_DATE = datetime(2025, 3, 15)


def parse_timestamp(ts: str) -> datetime:
    return datetime.fromisoformat(ts.replace("Z", "+00:00")).replace(tzinfo=None)


def days_since(ts: str) -> float:
    return (REFERENCE_DATE - parse_timestamp(ts)).total_seconds() / 86400


def recency_decay(days: float) -> float:
    return math.exp(-LAMBDA * days)


def recipient_multiplier(n_recipients: int, max_recipients: int) -> float:
    """Interpolate linearly between 1.0 (DM, n=1) and 0.3 (broadcast to all, n=max_recipients)."""
    if max_recipients <= 1:
        return DM_MULTIPLIER
    t = (n_recipients - 1) / (max_recipients - 1)
    t = max(0.0, min(1.0, t))  # clamp to [0, 1]
    return DM_MULTIPLIER + (GROUP_MULTIPLIER - DM_MULTIPLIER) * t


def compute_graph(input_path=None, output_path=None):
    input_path = input_path or SLACK_DATA_PATH
    output_path = output_path or OUTPUT_PATH

    with open(input_path) as f:
        data = json.load(f)

    # Load enrichment data from the extraction pipeline (optional — graceful fallback)
    enrichment: dict = {}
    extracted_path = EXTRACTED_PATH if input_path == SLACK_DATA_PATH else None
    if extracted_path and extracted_path.exists():
        with open(extracted_path) as f:
            enrichment = json.load(f)

    person_summaries: dict = enrichment.get("person_summaries", {})
    person_weights: dict = enrichment.get("person_weights", {})
    person_roles: dict = enrichment.get("person_roles", {})

    people_by_id = {p["id"]: p for p in data["people"]}
    all_people_ids = set(people_by_id.keys())

    raw_weights: dict[tuple[str, str], float] = defaultdict(float)
    max_recipients = (
        len(all_people_ids) - 1
    )  # maximum possible recipients (everyone except the sender)

    for msg in data["messages"]:
        sender = msg["from"]
        recipients = msg["to"]
        ts = msg["timestamp"]
        mentions = set(msg.get("mentions", []))

        decay = recency_decay(days_since(ts))

        if "all" in recipients:
            resolved = all_people_ids - {sender}
        else:
            resolved = set(recipients) - {sender}

        # Scale weight by recipient count: 1.0 for a 1-to-1 DM, down to 0.3 for a broadcast to all
        multiplier = recipient_multiplier(len(resolved), max_recipients)

        for recipient in resolved:
            if recipient == sender or recipient not in all_people_ids:
                continue
            a, b = tuple(sorted([sender, recipient]))
            raw_weights[(a, b)] += multiplier * decay

        # @mentions get an additional weight boost on top of the to[] edge
        for mentioned in mentions:
            if mentioned == sender or mentioned not in all_people_ids:
                continue
            a, b = tuple(sorted([sender, mentioned]))
            raw_weights[(a, b)] += MENTION_MULTIPLIER * decay

    # Sqrt-scale to spread weights without over-compressing the range
    scaled_weights = {k: math.sqrt(v) for k, v in raw_weights.items()}
    max_weight = max(scaled_weights.values()) if scaled_weights else 1.0

    # ── Leiden community detection on the weighted graph ────────────────
    node_ids = list(people_by_id.keys())
    names = {pid: p["name"] for pid, p in people_by_id.items()}
    community_map = compute_leiden_communities(node_ids, scaled_weights, names=names)

    nodes = []
    for pid, person in people_by_id.items():
        summary = person_summaries.get(pid, {})

        # Build project_roles: {project_id -> {weight, role}} from extracted data,
        # falling back to an empty dict so the frontend can always rely on the key.
        proj_roles: dict = {}
        for proj_id, w in person_weights.get(pid, {}).items():
            proj_roles[proj_id] = {
                "weight": round(w, 3),
                "role": person_roles.get(pid, {}).get(proj_id, "contributor"),
            }

        nodes.append(
            {
                "id": pid,
                "name": person["name"],
                "role": person.get("role", ""),
                "team": person.get("team", ""),
                "expertise": person.get("expertise", []),
                # Keep static project list for backward-compat; project_roles is richer
                "projects": person.get("projects", []),
                "project_roles": proj_roles,
                "skills_summary": summary.get("skills_summary", ""),
                "work_summary": summary.get("work_summary", ""),
                "community": community_map.get(pid),
            }
        )

    links = []
    for (a, b), raw_w in raw_weights.items():
        normalized = scaled_weights[(a, b)] / max_weight
        links.append(
            {
                "source": a,
                "target": b,
                "weight": round(normalized, 4),
            }
        )

    links.sort(key=lambda l: l["weight"], reverse=True)

    graph = {"nodes": nodes, "links": links}

    with open(output_path, "w") as f:
        json.dump(graph, f, indent=2)

    print(f"\nGraph computed: {len(nodes)} nodes, {len(links)} links")
    print(f"Weight range: {links[-1]['weight']:.4f} — {links[0]['weight']:.4f}")

    top5 = links[:5]
    print("\nTop 5 strongest connections:")
    for l in top5:
        s = people_by_id[l["source"]]["name"]
        t = people_by_id[l["target"]]["name"]
        print(f"  {s} <-> {t}  weight={l['weight']}")

    chris_links = [l for l in links if "chris_long" in (l["source"], l["target"])]
    print(f"\nChris Long connections: {len(chris_links)}")
    for l in chris_links[:5]:
        other = l["target"] if l["source"] == "chris_long" else l["source"]
        print(f"  {people_by_id[other]['name']}  weight={l['weight']}")

    return graph


if __name__ == "__main__":
    compute_graph()
