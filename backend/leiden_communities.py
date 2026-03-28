import json
import math
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import igraph as ig
import leidenalg

ROOT = Path(__file__).resolve().parent.parent
SLACK_DATA_PATH = ROOT / "data" / "slack_data.json"

# ── Weight parameters (must match compute_graph.py) ─────────────────────────
LAMBDA = 0.01
DM_MULTIPLIER = 1.0
GROUP_MULTIPLIER = 0.3
MENTION_MULTIPLIER = 0.5
REFERENCE_DATE = datetime(2025, 3, 15)


def compute_leiden_communities(
    node_ids: list[str],
    scaled_weights: dict[tuple[str, str], float],
    names: dict[str, str] | None = None,
) -> dict[str, int]:
    """
    Build an igraph graph from the weighted edges and run the Leiden algorithm
    (leidenalg.ModularityVertexPartition with edge weights) to detect communities.

    Returns a dict mapping node_id -> community index (0-based).

    Package: leidenalg (https://leidenalg.readthedocs.io)
    Depends on: python-igraph
    Install: pip install leidenalg igraph

    Args:
        node_ids:       Ordered list of all node IDs.
        scaled_weights: Dict of (node_a, node_b) -> weight for every edge.
        names:          Optional dict of node_id -> display name used for logging.
                        When omitted, node IDs are printed instead.
    """
    idx = {nid: i for i, nid in enumerate(node_ids)}

    edges: list[tuple[int, int]] = []
    weights: list[float] = []
    for (a, b), w in scaled_weights.items():
        if a in idx and b in idx:
            edges.append((idx[a], idx[b]))
            weights.append(w)

    g = ig.Graph(n=len(node_ids), edges=edges, directed=False)
    g.es["weight"] = weights

    partition = leidenalg.find_partition(
        g,
        leidenalg.ModularityVertexPartition,
        weights="weight",
        seed=42,
    )

    membership = partition.membership  # list[int], one per vertex
    community_map = {nid: membership[idx[nid]] for nid in node_ids}

    _log_results(community_map, names)

    return community_map


def _log_results(
    community_map: dict[str, int],
    names: dict[str, str] | None,
) -> None:
    """Print a summary of Leiden community assignments to stdout."""
    num_communities = max(community_map.values()) + 1 if community_map else 0
    print(f"Leiden detected {num_communities} communities")

    comm_members: dict[int, list[str]] = defaultdict(list)
    for nid, comm in community_map.items():
        label = names[nid] if names and nid in names else nid
        comm_members[comm].append(label)

    for comm, members in sorted(comm_members.items()):
        print(
            f"  Community {comm + 1} ({len(members)} members): {', '.join(sorted(members))}"
        )


# ── Standalone entry point ───────────────────────────────────────────────────


def _parse_timestamp(ts: str) -> datetime:
    return datetime.fromisoformat(ts.replace("Z", "+00:00")).replace(tzinfo=None)


def _days_since(ts: str) -> float:
    return (REFERENCE_DATE - _parse_timestamp(ts)).total_seconds() / 86400


def _recency_decay(days: float) -> float:
    return math.exp(-LAMBDA * days)


def _compute_scaled_weights(
    data: dict,
) -> tuple[dict[tuple[str, str], float], dict[str, dict]]:
    """Reproduce the weight computation from compute_graph.py."""
    people_by_id: dict[str, dict] = {p["id"]: p for p in data["people"]}
    all_people_ids = set(people_by_id.keys())

    raw_weights: dict[tuple[str, str], float] = defaultdict(float)

    for msg in data["messages"]:
        sender = msg["from"]
        recipients = msg["to"]
        ts = msg["timestamp"]
        mentions = set(msg.get("mentions", []))

        decay = _recency_decay(_days_since(ts))

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

        for mentioned in mentions:
            if mentioned == sender or mentioned not in all_people_ids:
                continue
            a, b = tuple(sorted([sender, mentioned]))
            raw_weights[(a, b)] += MENTION_MULTIPLIER * decay

    scaled_weights = {k: math.sqrt(v) for k, v in raw_weights.items()}
    return scaled_weights, people_by_id


if __name__ == "__main__":
    print(f"Loading data from {SLACK_DATA_PATH}\n")
    with open(SLACK_DATA_PATH) as f:
        raw = json.load(f)

    scaled_weights, people_by_id = _compute_scaled_weights(raw)
    names = {pid: p["name"] for pid, p in people_by_id.items()}
    node_ids = list(people_by_id.keys())

    compute_leiden_communities(node_ids, scaled_weights, names=names)
