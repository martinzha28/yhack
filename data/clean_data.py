#!/usr/bin/env python3
"""
Post-process slack_data.json to fix two issues:

1. Scope channel messages to the right audience instead of ["all"]
2. Parse @mentions from message text and add them to the to[] field

Usage:
  python clean_data.py              # writes cleaned slack_data.json in place
  python clean_data.py --dry-run    # prints stats without writing
"""

import json
import re
import argparse
from pathlib import Path
from collections import defaultdict

DATA_DIR = Path(__file__).parent
SLACK_DATA_PATH = DATA_DIR / "slack_data.json"

MENTION_RE = re.compile(r"@(\w+)")

CHANNEL_MEMBERSHIP = {
    "general": None,  # None = everyone
    "engineering-general": {"backend", "frontend"},
    "backend": {"backend"},
    "frontend": {"frontend"},
    "design": {"design"},
    "product": {"product"},
    "onboarding": {"jordan_kim", "mike_torres", "sofia_martinez"},
}


def get_channel_members(channel: str, people_by_id: dict, people_by_team: dict) -> set[str]:
    """Resolve a channel name to the set of person IDs who belong to it."""
    spec = CHANNEL_MEMBERSHIP.get(channel)
    if spec is None:
        return set(people_by_id.keys())

    # onboarding channel is defined by explicit person IDs
    if all(s in people_by_id for s in spec):
        return spec

    # otherwise spec is a set of team names
    members = set()
    for team in spec:
        members.update(people_by_team.get(team, set()))
    return members


def clean(dry_run: bool = False):
    with open(SLACK_DATA_PATH) as f:
        data = json.load(f)

    people_by_id = {p["id"]: p for p in data["people"]}
    people_by_team: dict[str, set[str]] = defaultdict(set)
    for p in data["people"]:
        people_by_team[p["team"]].add(p["id"])

    all_ids = set(people_by_id.keys())

    stats = {
        "channel_scoped": 0,
        "mentions_added": 0,
        "messages_with_new_mentions": 0,
        "total_channel_msgs": 0,
        "total_dms": 0,
    }

    for msg in data["messages"]:
        sender = msg["from"]
        channel = msg.get("channel")

        # --- Fix 1: scope channel messages ---
        if channel and "all" in msg["to"]:
            stats["total_channel_msgs"] += 1
            members = get_channel_members(channel, people_by_id, people_by_team)
            scoped = sorted(members - {sender})
            msg["to"] = scoped
            stats["channel_scoped"] += 1
        else:
            if not channel:
                stats["total_dms"] += 1

        # --- Fix 2: parse @mentions from text and store as metadata ---
        text_mentions = set(MENTION_RE.findall(msg["text"]))
        valid_mentions = text_mentions & all_ids - {sender}

        msg["mentions"] = sorted(valid_mentions) if valid_mentions else []

        existing_to = set(msg["to"])
        new_mentions = valid_mentions - existing_to

        if new_mentions:
            msg["to"] = sorted(set(msg["to"]) | new_mentions)
            stats["mentions_added"] += len(new_mentions)
            stats["messages_with_new_mentions"] += 1

    # Print stats
    print(f"Total messages: {len(data['messages'])}")
    print(f"  DMs: {stats['total_dms']}")
    print(f"  Channel messages: {stats['total_channel_msgs']}")
    print()
    print(f"Channel messages scoped (was 'all', now team-specific): {stats['channel_scoped']}")
    print(f"@mentions extracted from text and added to 'to': {stats['mentions_added']}")
    print(f"  across {stats['messages_with_new_mentions']} messages")

    # Show channel audience sizes
    print()
    print("Channel audience sizes (excluding sender):")
    for ch in sorted(CHANNEL_MEMBERSHIP.keys()):
        members = get_channel_members(ch, people_by_id, people_by_team)
        print(f"  {ch:25s} → {len(members)} people")

    if dry_run:
        print("\n[DRY RUN] No files written.")
        return

    with open(SLACK_DATA_PATH, "w") as f:
        json.dump(data, f, indent=2)
    print(f"\nWritten → {SLACK_DATA_PATH}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    clean(dry_run=args.dry_run)
