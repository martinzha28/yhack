#!/usr/bin/env python3
"""
Merge all project chunks into a single slack_data.json.
Run this after generate.py to rebuild the final dataset.

Usage:
  python merge.py
"""

import json
from pathlib import Path

DATA_DIR = Path(__file__).parent
CHUNKS_DIR = DATA_DIR / "chunks"


def merge():
    with open(DATA_DIR / "people.json") as f:
        people = json.load(f)
    with open(DATA_DIR / "projects.json") as f:
        projects = json.load(f)

    all_messages = []
    chunk_files = sorted(CHUNKS_DIR.glob("*_messages.json"))

    if not chunk_files:
        print("No chunk files found in /chunks. Run generate.py first.")
        return

    for chunk_file in chunk_files:
        with open(chunk_file) as f:
            messages = json.load(f)
        all_messages.extend(messages)
        print(f"  Loaded {len(messages):3d} messages from {chunk_file.name}")

    # Sort by timestamp
    all_messages.sort(key=lambda m: m.get("timestamp", ""))

    # Reassign clean sequential IDs
    for i, msg in enumerate(all_messages):
        msg["id"] = f"msg_{i+1:04d}"

    output = {
        "company": "Bsus Corp",
        "generated_at": "2025-01-01T00:00:00Z",
        "people": people,
        "projects": projects,
        "messages": all_messages,
    }

    output_path = DATA_DIR / "slack_data.json"
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nMerged {len(all_messages)} total messages → {output_path}")

    by_project = {}
    for msg in all_messages:
        p = msg.get("project") or "noise"
        by_project[p] = by_project.get(p, 0) + 1

    print("\nMessage count by project:")
    for project, count in sorted(by_project.items(), key=lambda x: (x[0] is None, x[0] or "")):
        print(f"  {str(project):30s} {count}")


if __name__ == "__main__":
    merge()
