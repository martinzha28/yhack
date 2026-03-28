import json
import math
from datetime import datetime
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SLACK_DATA_PATH = ROOT / "data" / "slack_data.json"
OUTPUT_PATH = ROOT / "data" / "graph.json"

LAMBDA = 0.01
DM_MULTIPLIER = 1.0
GROUP_MULTIPLIER = 0.3

REFERENCE_DATE = datetime(2025, 3, 15)


def parse_timestamp(ts: str) -> datetime:
    return datetime.fromisoformat(ts.replace("Z", "+00:00")).replace(tzinfo=None)


def days_since(ts: str) -> float:
    return (REFERENCE_DATE - parse_timestamp(ts)).total_seconds() / 86400


def recency_decay(days: float) -> float:
    return math.exp(-LAMBDA * days)


def compute_graph(input_path=None, output_path=None):
    input_path = input_path or SLACK_DATA_PATH
    output_path = output_path or OUTPUT_PATH

    with open(input_path) as f:
        data = json.load(f)

    people_by_id = {p["id"]: p for p in data["people"]}
    all_people_ids = set(people_by_id.keys())

    raw_weights: dict[tuple[str, str], float] = defaultdict(float)

    for msg in data["messages"]:
        sender = msg["from"]
        recipients = msg["to"]
        ts = msg["timestamp"]

        decay = recency_decay(days_since(ts))

        if "all" in recipients:
            resolved = all_people_ids - {sender}
            multiplier = GROUP_MULTIPLIER
        elif len(recipients) > 1:
            resolved = set(recipients) - {sender}
            multiplier = GROUP_MULTIPLIER
        else:
            resolved = set(recipients)
            multiplier = DM_MULTIPLIER

        for recipient in resolved:
            if recipient == sender or recipient not in all_people_ids:
                continue
            a, b = tuple(sorted([sender, recipient]))
            raw_weights[(a, b)] += multiplier * decay

    max_weight = max(raw_weights.values()) if raw_weights else 1.0

    nodes = []
    for pid, person in people_by_id.items():
        nodes.append({
            "id": pid,
            "name": person["name"],
            "role": person.get("role", ""),
            "team": person.get("team", ""),
            "expertise": person.get("expertise", []),
            "projects": person.get("projects", []),
        })

    links = []
    for (a, b), raw_w in raw_weights.items():
        normalized = raw_w / max_weight
        links.append({
            "source": a,
            "target": b,
            "weight": round(normalized, 4),
        })

    links.sort(key=lambda l: l["weight"], reverse=True)

    graph = {"nodes": nodes, "links": links}

    with open(output_path, "w") as f:
        json.dump(graph, f, indent=2)

    print(f"Graph computed: {len(nodes)} nodes, {len(links)} links")
    print(f"Weight range: {links[-1]['weight']:.4f} — {links[0]['weight']:.4f}")

    top5 = links[:5]
    print("\nTop 5 strongest connections:")
    for l in top5:
        s = people_by_id[l["source"]]["name"]
        t = people_by_id[l["target"]]["name"]
        print(f"  {s} <-> {t}  weight={l['weight']}")

    jordan_links = [l for l in links if "jordan_kim" in (l["source"], l["target"])]
    print(f"\nJordan Kim connections: {len(jordan_links)}")
    for l in jordan_links[:5]:
        other = l["target"] if l["source"] == "jordan_kim" else l["source"]
        print(f"  {people_by_id[other]['name']}  weight={l['weight']}")

    return graph


if __name__ == "__main__":
    compute_graph()
