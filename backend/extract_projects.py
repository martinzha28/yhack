"""
Discover projects and per-person association weights from Slack messages.

Two-pass approach with caching:
  Pass 1: Identify projects from a sample of messages
  Pass 2: Assign each message to a project in batches

Caches raw LLM responses to data/llm_pass*.txt so interrupted runs
can resume without re-calling the API.

Outputs: data/extracted_projects.json
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from collections import defaultdict

from openai import OpenAI

ROOT = Path(__file__).resolve().parent.parent
SLACK_DATA_PATH = ROOT / "data" / "slack_data.json"
OUTPUT_PATH = ROOT / "data" / "extracted_projects.json"
CACHE_DIR = ROOT / "data"

BASE_URL = "https://api.k2think.ai/v1"
MODEL = "MBZUAI-IFM/K2-Think-v2"

BATCH_SIZE = 100


def load_env_key() -> str | None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return None
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line.startswith("K2_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def load_messages() -> tuple[list[dict], list[dict]]:
    with open(SLACK_DATA_PATH) as f:
        data = json.load(f)

    people = data["people"]
    messages = []
    for m in data["messages"]:
        messages.append({
            "id": m["id"],
            "from": m["from"],
            "to": m["to"],
            "channel": m.get("channel"),
            "text": m["text"],
            "timestamp": m["timestamp"],
        })
    return people, messages


def format_messages_compact(messages: list[dict]) -> str:
    lines = []
    for m in messages:
        to_str = m["channel"] or ", ".join(m["to"][:3])
        if len(m["to"]) > 3:
            to_str += f" +{len(m['to']) - 3}"
        lines.append(f"[{m['id']}] {m['from']}→{to_str}: {m['text']}")
    return "\n".join(lines)


def call_llm(client: OpenAI, prompt: str, max_tokens: int = 4000) -> str:
    response = client.chat.completions.create(
        model=MODEL,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = response.choices[0].message.content
    usage = response.usage
    if usage:
        print(f"    [{usage.prompt_tokens} in / {usage.completion_tokens} out]")
    return raw


def extract_json_dict(text: str) -> dict | None:
    """Extract the last valid JSON dict from text (ignoring arrays)."""
    cleaned = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
    last_end = cleaned.rfind("}")
    if last_end == -1:
        return None
    depth = 0
    for i in range(last_end, -1, -1):
        if cleaned[i] == "}":
            depth += 1
        elif cleaned[i] == "{":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(cleaned[i:last_end + 1])
                except json.JSONDecodeError:
                    break
    return None


def extract_json_array(text: str) -> list | None:
    """Extract the last valid JSON array from text."""
    cleaned = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
    last_end = cleaned.rfind("]")
    if last_end == -1:
        return None
    depth = 0
    for i in range(last_end, -1, -1):
        if cleaned[i] == "]":
            depth += 1
        elif cleaned[i] == "[":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(cleaned[i:last_end + 1])
                except json.JSONDecodeError:
                    break
    return None


def pass1_discover_projects(client: OpenAI, people: list[dict], messages: list[dict]) -> list[dict]:
    cache_path = CACHE_DIR / "llm_pass1_raw.txt"

    if cache_path.exists():
        raw = cache_path.read_text()
        if len(raw) > 100:
            print("  Pass 1: Using cached response")
            result = extract_json_array(raw)
            if result and isinstance(result, list) and len(result) > 0:
                return result
            # Try as dict with "projects" key
            d = extract_json_dict(raw)
            if d and "projects" in d:
                return d["projects"]
            print("  Pass 1: Cache invalid, re-calling API")

    sample = messages[::3]
    formatted = format_messages_compact(sample)
    people_list = ", ".join(f"{p['id']} ({p.get('role', '')})" for p in people)

    prompt = f"""Analyze these Slack messages from a software company and identify ALL distinct projects or work streams.

People: {people_list}

Messages (sample of {len(sample)} from {len(messages)} total):
{formatted}

Return ONLY a JSON array of projects. No explanation, no markdown fences, just the JSON array:
[
  {{
    "id": "kebab-case-id",
    "name": "Human Readable Name",
    "keywords": ["term1", "term2", "term3"],
    "status": "active",
    "time_range": "Jan-Mar 2025"
  }}
]

Rules:
- status is "active" or "completed"
- Include both current AND historical/completed projects
- Each project should have 5-10 keywords that identify it in messages
- Return ONLY the JSON array, nothing else"""

    print("  Pass 1: Discovering projects...")
    raw = call_llm(client, prompt, max_tokens=3000)
    cache_path.write_text(raw)

    result = extract_json_array(raw)
    if result:
        return result
    d = extract_json_dict(raw)
    if d and "projects" in d:
        return d["projects"]
    raise ValueError("Could not parse projects from pass 1 response")


def pass2_assign_batch(
    client: OpenAI,
    batch: list[dict],
    project_ids: list[str],
    batch_num: int,
    total_batches: int,
) -> dict[str, str | None]:
    cache_path = CACHE_DIR / f"llm_pass2_batch{batch_num}_raw.txt"

    if cache_path.exists():
        raw = cache_path.read_text()
        if len(raw) > 100:
            result = extract_json_dict(raw)
            if result and len(result) >= len(batch) * 0.8:
                print(f"  Pass 2: Batch {batch_num}/{total_batches} — cached ({len(result)} assignments)")
                return result
            print(f"  Pass 2: Batch {batch_num} cache invalid, re-calling")

    formatted = format_messages_compact(batch)
    project_list = ", ".join(project_ids)
    msg_ids = [m["id"] for m in batch]

    prompt = f"""Classify each Slack message into one of these projects: {project_list}
If a message is casual chat (lunch, weather, logistics), assign null.

Messages:
{formatted}

Return ONLY a JSON object mapping message ID to project ID (or null). No explanation.
Example: {{"msg_0001": "auth-refactor", "msg_0002": null}}

Message IDs to classify: {json.dumps(msg_ids)}"""

    print(f"  Pass 2: Batch {batch_num}/{total_batches} ({len(batch)} messages)...")
    raw = call_llm(client, prompt, max_tokens=4000)
    cache_path.write_text(raw)

    result = extract_json_dict(raw)
    if not result:
        raise ValueError(f"Could not parse assignments from batch {batch_num}")
    return result


def pass3_person_associations(
    client: OpenAI,
    people: list[dict],
    messages: list[dict],
    projects: list[dict],
    batch_size: int = 5,
) -> dict[str, dict]:
    """Ask the LLM to reason about each person's actual project involvement."""
    project_ids = [p["id"] for p in projects]
    project_summary = "\n".join(
        f"- {p['id']}: {p['name']} ({p.get('status','?')}) — keywords: {', '.join(p.get('keywords', [])[:6])}"
        for p in projects
    )

    # Group messages by sender (only DMs and small groups, skip large channels)
    person_msgs = defaultdict(list)
    for m in messages:
        person_msgs[m["from"]].append(m)

    all_results = {}
    batches = [people[i:i + batch_size] for i in range(0, len(people), batch_size)]

    print(f"\n  Pass 3: Analyzing {len(people)} people in {len(batches)} batches...")

    for batch_num, batch in enumerate(batches, 1):
        cache_path = CACHE_DIR / f"llm_pass3_batch{batch_num}_raw.txt"

        if cache_path.exists():
            raw = cache_path.read_text()
            if len(raw) > 100:
                result = extract_json_dict(raw)
                if result and len(result) >= len(batch) * 0.8:
                    print(f"  Pass 3: Batch {batch_num}/{len(batches)} — cached ({len(result)} people)")
                    all_results.update(result)
                    continue

        # Build per-person message summaries for this batch
        person_sections = []
        for p in batch:
            pid = p["id"]
            msgs = person_msgs.get(pid, [])
            # Include messages they sent (most informative for role analysis)
            sent_lines = []
            for m in msgs[:40]:
                to_str = m["channel"] or ", ".join(m["to"][:3])
                sent_lines.append(f"  [{m['timestamp'][:10]}] →{to_str}: {m['text']}")
            sent_text = "\n".join(sent_lines) if sent_lines else "  (no messages sent)"

            # Include messages where they were directly addressed (DMs only)
            received = [m for m in messages if pid in m["to"] and not m.get("channel") and m["from"] != pid]
            recv_lines = []
            for m in received[:20]:
                recv_lines.append(f"  [{m['timestamp'][:10]}] {m['from']}→them: {m['text']}")
            recv_text = "\n".join(recv_lines) if recv_lines else "  (no DMs received)"

            person_sections.append(f"""### {pid} ({p['name']}, {p.get('role', '')})
Messages sent ({len(msgs)} total):
{sent_text}

DMs received (sample):
{recv_text}""")

        people_text = "\n\n".join(person_sections)

        prompt = f"""You are analyzing who works on which projects at a software company based on their Slack messages.

## Projects
{project_summary}

## People to analyze
{people_text}

## Task
For each person, determine which projects they ACTUALLY work on based on evidence in their messages. Consider:
- What technical topics do they discuss? (not just overhear in channels)
- Who do they collaborate with on specific work?
- Are they a lead/core contributor or peripheral?
- Only include projects where there's clear evidence they do work, not just awareness

Return ONLY a JSON object. For each person, list their projects with:
- "weight": 0.0-1.0 (1.0 = primary project, 0.5+ = significant contributor, 0.2-0.5 = minor contributor)
- "role": "lead", "core", "contributor", or "peripheral"

Format:
{{
  "person_id": {{
    "projects": {{
      "project-id": {{"weight": 0.85, "role": "core"}},
      "other-project": {{"weight": 0.3, "role": "contributor"}}
    }}
  }}
}}

People to classify: {json.dumps([p['id'] for p in batch])}"""

        print(f"  Pass 3: Batch {batch_num}/{len(batches)} ({', '.join(p['id'] for p in batch)})...")
        raw = call_llm(client, prompt, max_tokens=4000)
        cache_path.write_text(raw)

        result = extract_json_dict(raw)
        if result:
            all_results.update(result)
        else:
            print(f"    Batch {batch_num} failed to parse")

    return all_results


def build_final_weights(
    people: list[dict],
    llm_associations: dict[str, dict],
    projects: list[dict],
) -> tuple[dict[str, dict[str, float]], dict[str, dict]]:
    """Build clean person_weights and person_roles from LLM pass 3 output."""
    project_ids = {p["id"] for p in projects}
    person_weights = {}
    person_roles = {}

    for p in people:
        pid = p["id"]
        assoc = llm_associations.get(pid, {})
        proj_data = assoc.get("projects", assoc)

        weights = {}
        roles = {}
        for proj_id, val in proj_data.items():
            if proj_id not in project_ids:
                continue
            if isinstance(val, dict):
                w = val.get("weight", 0)
                r = val.get("role", "contributor")
            elif isinstance(val, (int, float)):
                w = val
                r = "contributor"
            else:
                continue
            if w > 0:
                weights[proj_id] = round(float(w), 3)
                roles[proj_id] = r

        # Sort by weight descending
        weights = dict(sorted(weights.items(), key=lambda x: -x[1]))
        person_weights[pid] = weights
        person_roles[pid] = roles

    return person_weights, person_roles


def compute_project_members(
    person_weights: dict[str, dict[str, float]],
    threshold: float = 0.1,
) -> dict[str, list[dict]]:
    project_members: dict[str, list[dict]] = defaultdict(list)
    for pid, weights in person_weights.items():
        for proj, w in weights.items():
            if w >= threshold:
                project_members[proj].append({"id": pid, "weight": w})

    for proj in project_members:
        project_members[proj].sort(key=lambda x: -x["weight"])

    return dict(project_members)


def main():
    api_key = os.environ.get("K2_API_KEY") or load_env_key()
    if not api_key:
        print("Error: K2_API_KEY not found in environment or .env file")
        sys.exit(1)

    client = OpenAI(api_key=api_key, base_url=BASE_URL)

    print("Loading messages...")
    people, messages = load_messages()
    print(f"  {len(messages)} messages from {len(set(m['from'] for m in messages))} people")

    # Pass 1: Discover projects
    projects = pass1_discover_projects(client, people, messages)
    project_ids = [p["id"] for p in projects]
    print(f"\n  Discovered {len(projects)} projects:")
    for p in projects:
        print(f"    {p['id']}: {p['name']} ({p.get('status', '?')})")

    # Pass 2: Assign messages in batches
    all_assignments: dict[str, str | None] = {}
    batches = [messages[i:i + BATCH_SIZE] for i in range(0, len(messages), BATCH_SIZE)]

    print(f"\n  Assigning {len(messages)} messages in {len(batches)} batches...")
    for i, batch in enumerate(batches, 1):
        try:
            batch_assignments = pass2_assign_batch(client, batch, project_ids, i, len(batches))
            all_assignments.update(batch_assignments)
        except Exception as e:
            print(f"    Batch {i} failed: {e}")
            for m in batch:
                all_assignments[m["id"]] = None

    # Stats
    assigned = sum(1 for v in all_assignments.values() if v is not None)
    print(f"\n  Assigned: {assigned}/{len(messages)} messages")
    for pid in project_ids:
        count = sum(1 for v in all_assignments.values() if v == pid)
        if count > 0:
            print(f"    {pid}: {count}")
    null_count = sum(1 for v in all_assignments.values() if v is None)
    print(f"    (noise/unassigned: {null_count})")

    # Pass 3: Semantic person-project associations
    llm_associations = pass3_person_associations(client, people, messages, projects)

    print("\nBuilding final weights...")
    person_weights, person_roles = build_final_weights(people, llm_associations, projects)
    project_members = compute_project_members(person_weights)

    for pid, weights in sorted(person_weights.items()):
        if weights:
            entries = []
            for k, v in list(weights.items())[:3]:
                role = person_roles.get(pid, {}).get(k, "?")
                entries.append(f"{k}: {v:.2f} ({role})")
            print(f"  {pid}: {', '.join(entries)}")

    output = {
        "projects": projects,
        "person_weights": person_weights,
        "person_roles": person_roles,
        "project_members": dict(project_members),
        "message_assignments": all_assignments,
    }

    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nSaved to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
