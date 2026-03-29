"""
Discover projects and per-person association weights from Slack messages.

Multi-pass approach with caching:
  Pass 1: Identify projects from a sample of messages
  Pass 2: Assign each message to a project in batches
  Pass 3: Semantic per-person project associations (LLM) (ignores chats in large groups)
  Pass 4: Per-person skills & work summaries (LLM, batched)
  Pass 5: LLM project summarization (uses 15 longest messages)

Collaborator pre-computation is done programmatically from message
interaction counts — no extra LLM calls needed for that step.

Caches raw LLM responses to data/llm_pass*.txt so interrupted runs
can resume without re-calling the API.

Outputs: data/extracted_projects.json
"""

from __future__ import annotations

import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

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
        messages.append(
            {
                "id": m["id"],
                "from": m["from"],
                "to": m["to"],
                "channel": m.get("channel"),
                "text": m["text"],
                "timestamp": m["timestamp"],
            }
        )
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
                    return json.loads(cleaned[i : last_end + 1])
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
                    return json.loads(cleaned[i : last_end + 1])
                except json.JSONDecodeError:
                    break
    return None


def pass1_discover_projects(
    client: OpenAI, people: list[dict], messages: list[dict]
) -> list[dict]:
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
    "name": "Short Title",
    "keywords": ["term1", "term2", "term3"],
    "status": "active",
    "time_range": "Jan-Mar 2025"
  }}
]

Rules:
- "name" must be 2-4 words maximum — a short title only, NO subtitles, NO dashes, NO descriptions after the title (good: "Billing v2", "Auth Refactor", "Design System v2"; bad: "Billing v2 – Usage-Based Pricing Redesign")
- "id" should be a concise kebab-case slug matching the name (e.g. "billing-v2", "auth-refactor")
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
                print(
                    f"  Pass 2: Batch {batch_num}/{total_batches} — cached ({len(result)} assignments)"
                )
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
        f"- {p['id']}: {p['name']} ({p.get('status', '?')}) — keywords: {', '.join(p.get('keywords', [])[:6])}"
        for p in projects
    )

    # Group messages by sender (only DMs and small groups, skip large channels)
    person_msgs = defaultdict(list)
    for m in messages:
        person_msgs[m["from"]].append(m)

    all_results = {}
    batches = [people[i : i + batch_size] for i in range(0, len(people), batch_size)]

    print(f"\n  Pass 3: Analyzing {len(people)} people in {len(batches)} batches...")

    for batch_num, batch in enumerate(batches, 1):
        cache_path = CACHE_DIR / f"llm_pass3_batch{batch_num}_raw.txt"

        if cache_path.exists():
            raw = cache_path.read_text()
            if len(raw) > 100:
                result = extract_json_dict(raw)
                if result and len(result) >= len(batch) * 0.8:
                    print(
                        f"  Pass 3: Batch {batch_num}/{len(batches)} — cached ({len(result)} people)"
                    )
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
            received = [
                m
                for m in messages
                if pid in m["to"] and not m.get("channel") and m["from"] != pid
            ]
            recv_lines = []
            for m in received[:20]:
                recv_lines.append(
                    f"  [{m['timestamp'][:10]}] {m['from']}→them: {m['text']}"
                )
            recv_text = "\n".join(recv_lines) if recv_lines else "  (no DMs received)"

            person_sections.append(f"""### {pid} ({p["name"]}, {p.get("role", "")})
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

People to classify: {json.dumps([p["id"] for p in batch])}"""

        print(
            f"  Pass 3: Batch {batch_num}/{len(batches)} ({', '.join(p['id'] for p in batch)})..."
        )
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


def compute_top_collaborators(
    people: list[dict],
    messages: list[dict],
    top_n: int = 5,
) -> dict[str, list[dict]]:
    """Programmatically rank each person's collaborators by interaction strength.

    Scoring (no LLM needed):
      - Direct mention (@mention): +3 per occurrence
      - DM or small-group message (no channel, ≤3 recipients): +2 per edge
      - Channel message: +1 per edge
    """
    person_ids = {p["id"] for p in people}
    pid_to_name = {p["id"]: p["name"] for p in people}
    interaction: dict[tuple[str, str], float] = defaultdict(float)

    for m in messages:
        sender = m["from"]
        if sender not in person_ids:
            continue

        channel = m.get("channel")
        recipients = [r for r in m["to"] if r != sender and r in person_ids]
        mentions = [r for r in m.get("mentions", []) if r != sender and r in person_ids]

        # Weight per edge based on message type
        if not channel and len(recipients) <= 3:
            edge_weight = 2.0
        else:
            edge_weight = 1.0

        for r in recipients:
            key = tuple(sorted([sender, r]))
            interaction[key] += edge_weight

        for mentioned in mentions:
            key = tuple(sorted([sender, mentioned]))
            interaction[key] += 3.0

    # Build per-person ranked list
    from_person: dict[str, list[tuple[str, float]]] = defaultdict(list)
    for (a, b), score in interaction.items():
        from_person[a].append((b, score))
        from_person[b].append((a, score))

    result: dict[str, list[dict]] = {}
    for p in people:
        pid = p["id"]
        ranked = sorted(from_person.get(pid, []), key=lambda x: -x[1])
        result[pid] = [
            {"id": cid, "name": pid_to_name.get(cid, cid), "score": round(score, 1)}
            for cid, score in ranked[:top_n]
        ]
    return result


def pass4_person_summaries(
    client: OpenAI,
    people: list[dict],
    person_weights: dict[str, dict[str, float]],
    person_roles: dict[str, dict[str, str]],
    projects: list[dict],
    top_collaborators: dict[str, list[dict]],
    messages: list[dict],
    batch_size: int = 5,
) -> dict[str, dict]:
    """Generate natural-language skills & work summaries for every person.

    Each LLM call handles `batch_size` people at once.  We feed it
    pre-computed structured context (projects + collaborators) plus a
    small sample of each person's own messages, keeping token usage low.
    """
    project_by_id = {p["id"]: p for p in projects}

    # Index messages by sender once — reused across all batches
    person_msgs: dict[str, list[dict]] = defaultdict(list)
    for m in messages:
        person_msgs[m["from"]].append(m)

    all_results: dict[str, dict] = {}
    batches = [people[i : i + batch_size] for i in range(0, len(people), batch_size)]
    total = len(batches)

    print(f"\n  Pass 4: Summarizing {len(people)} people in {total} batches...")

    for batch_num, batch in enumerate(batches, 1):
        cache_path = CACHE_DIR / f"llm_pass4_batch{batch_num}_raw.txt"

        if cache_path.exists():
            raw = cache_path.read_text()
            if len(raw) > 100:
                result = extract_json_dict(raw)
                if result and len(result) >= len(batch) * 0.8:
                    print(
                        f"  Pass 4: Batch {batch_num}/{total} — cached ({len(result)} people)"
                    )
                    all_results.update(result)
                    continue
                print(f"  Pass 4: Batch {batch_num} cache invalid, re-calling")

        person_sections: list[str] = []
        for p in batch:
            pid = p["id"]

            # ── Projects context ──────────────────────────────────────────
            proj_lines: list[str] = []
            for proj_id, weight in person_weights.get(pid, {}).items():
                role = person_roles.get(pid, {}).get(proj_id, "contributor")
                pname = project_by_id.get(proj_id, {}).get("name", proj_id)
                status = project_by_id.get(proj_id, {}).get("status", "active")
                proj_lines.append(
                    f"  - {pname} [{status}] weight={weight:.2f} role={role}"
                )
            proj_text = "\n".join(proj_lines) if proj_lines else "  - (none identified)"

            # ── Collaborators context ─────────────────────────────────────
            collabs = top_collaborators.get(pid, [])
            collab_str = (
                ", ".join(f"{c['name']} (score={c['score']})" for c in collabs)
                if collabs
                else "none"
            )

            # ── Representative sent messages (up to 25, skip very short ones) ──
            sent = [m for m in person_msgs.get(pid, []) if len(m["text"]) > 30][:25]
            msg_lines: list[str] = []
            for m in sent:
                dest = m.get("channel") or ", ".join(m["to"][:2])
                msg_lines.append(
                    f"  [{m['timestamp'][:10]}] →{dest}: {m['text'][:200]}"
                )
            msg_text = (
                "\n".join(msg_lines) if msg_lines else "  (no substantive messages)"
            )

            person_sections.append(
                f"### {pid}\n"
                f"Name: {p['name']} | Role: {p.get('role', '?')} | Team: {p.get('team', '?')}\n"
                f"Listed expertise: {', '.join(p.get('expertise', [])) or 'none'}\n"
                f"Project involvement:\n{proj_text}\n"
                f"Top collaborators: {collab_str}\n"
                f"Sample messages:\n{msg_text}"
            )

        context = "\n\n".join(person_sections)
        batch_ids = [p["id"] for p in batch]

        prompt = f"""You are writing concise profile summaries for engineers at a software company based on their Slack activity.

For each person below write exactly two fields:
1. "skills_summary" (2-3 sentences): What this person is skilled at technically or professionally. Be specific — name technologies, patterns, or domain areas and calibrate depth/breadth to their role.
2. "work_summary" (2-3 sentences): Who they collaborate with most and what projects they contribute to. Reference actual collaborator names and project names from the context.

People to summarize:
{context}

Return ONLY a valid JSON object — no markdown fences, no explanation:
{{
  "person_id": {{
    "skills_summary": "...",
    "work_summary": "..."
  }}
}}

IDs to include: {json.dumps(batch_ids)}"""

        print(f"  Pass 4: Batch {batch_num}/{total} ({', '.join(batch_ids)})...")
        raw = call_llm(client, prompt, max_tokens=3000)
        cache_path.write_text(raw)

        result = extract_json_dict(raw)
        if result:
            all_results.update(result)
        else:
            print(f"    Batch {batch_num} failed to parse — skipping")

    return all_results


def pass5_project_summaries(
    client: OpenAI,
    projects: list[dict],
    person_weights: dict[str, dict[str, float]],
    person_roles: dict[str, dict[str, str]],
    messages: list[dict],
    message_assignments: dict[str, str | None],
    batch_size: int = 4,
) -> dict[str, dict]:
    """Generate a concise natural-language summary for each project.

    Efficiency:
      - Index messages by ID once (O(n)), then group by project in one
        pass over message_assignments (O(n)) — no repeated scans.
      - Sample the 15 most substantive messages per project (longest text).
      - Batch `batch_size` projects per LLM call to minimise API round-trips.
    """
    # ── Build lookup structures in two O(n) passes ────────────────────────────
    msg_by_id: dict[str, dict] = {m["id"]: m for m in messages}

    project_msgs: dict[str, list[dict]] = defaultdict(list)
    for msg_id, proj_id in message_assignments.items():
        if proj_id is not None:
            m = msg_by_id.get(msg_id)
            if m and len(m["text"]) > 30:
                project_msgs[proj_id].append(m)

    # ── Pre-compute member lines (used in every prompt) ───────────────────────
    proj_member_lines: dict[str, str] = {}
    for p in projects:
        pid = p["id"]
        members = sorted(
            (
                (person_id, w, person_roles.get(person_id, {}).get(pid, "contributor"))
                for person_id, weights in person_weights.items()
                for proj, w in weights.items()
                if proj == pid
            ),
            key=lambda x: -x[1],
        )
        proj_member_lines[pid] = (
            ", ".join(
                f"{person_id.replace('_', ' ').title()} ({role})"
                for person_id, _, role in members[:6]
            )
            or "unknown"
        )

    all_results: dict[str, dict] = {}
    batches = [
        projects[i : i + batch_size] for i in range(0, len(projects), batch_size)
    ]
    total = len(batches)

    print(f"\n  Pass 5: Summarizing {len(projects)} projects in {total} batches...")

    for batch_num, batch in enumerate(batches, 1):
        cache_path = CACHE_DIR / f"llm_pass5_batch{batch_num}_raw.txt"

        if cache_path.exists():
            raw = cache_path.read_text()
            if len(raw) > 100:
                result = extract_json_dict(raw)
                if result and len(result) >= len(batch) * 0.8:
                    print(
                        f"  Pass 5: Batch {batch_num}/{total} — cached ({len(result)} projects)"
                    )
                    all_results.update(result)
                    continue
                print(f"  Pass 5: Batch {batch_num} cache invalid, re-calling")

        project_sections: list[str] = []
        for p in batch:
            proj_id = p["id"]

            # Top-15 messages by text length (most substantive first)
            msgs = sorted(project_msgs.get(proj_id, []), key=lambda m: -len(m["text"]))[
                :15
            ]
            msg_lines: list[str] = []
            for m in msgs:
                dest = m.get("channel") or ", ".join(m["to"][:2])
                msg_lines.append(
                    f"  [{m['timestamp'][:10]}] {m['from']}→{dest}: {m['text'][:220]}"
                )
            msgs_text = "\n".join(msg_lines) if msg_lines else "  (no messages)"

            project_sections.append(
                f"### {proj_id}\n"
                f"Name: {p['name']} | Status: {p.get('status', 'active')} | Period: {p.get('time_range', '?')}\n"
                f"Keywords: {', '.join(p.get('keywords', [])[:8])}\n"
                f"Team: {proj_member_lines[proj_id]}\n"
                f"Sample messages:\n{msgs_text}"
            )

        context = "\n\n".join(project_sections)
        batch_ids = [p["id"] for p in batch]

        prompt = f"""You are writing project descriptions for an internal company org chart.

For each project below write a "summary" of 2-3 sentences covering:
1. What the project builds or what problem it solves
2. The main technical approach or key deliverables
3. Current status or outcome

Projects:
{context}

Return ONLY a valid JSON object — no markdown fences, no explanation:
{{
  "project_id": {{
    "summary": "..."
  }}
}}

IDs to include: {json.dumps(batch_ids)}"""

        print(f"  Pass 5: Batch {batch_num}/{total} ({', '.join(batch_ids)})...")
        raw = call_llm(client, prompt, max_tokens=2000)
        cache_path.write_text(raw)

        result = extract_json_dict(raw)
        if result:
            all_results.update(result)
        else:
            print(f"    Batch {batch_num} failed to parse — skipping")

    return all_results


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
    print(
        f"  {len(messages)} messages from {len(set(m['from'] for m in messages))} people"
    )

    # Pass 1: Discover projects
    projects = pass1_discover_projects(client, people, messages)
    project_ids = [p["id"] for p in projects]
    print(f"\n  Discovered {len(projects)} projects:")
    for p in projects:
        print(f"    {p['id']}: {p['name']} ({p.get('status', '?')})")

    # Pass 2: Assign messages in batches
    all_assignments: dict[str, str | None] = {}
    batches = [
        messages[i : i + BATCH_SIZE] for i in range(0, len(messages), BATCH_SIZE)
    ]

    print(f"\n  Assigning {len(messages)} messages in {len(batches)} batches...")
    for i, batch in enumerate(batches, 1):
        try:
            batch_assignments = pass2_assign_batch(
                client, batch, project_ids, i, len(batches)
            )
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
    person_weights, person_roles = build_final_weights(
        people, llm_associations, projects
    )
    project_members = compute_project_members(person_weights)

    for pid, weights in sorted(person_weights.items()):
        if weights:
            entries = []
            for k, v in list(weights.items())[:3]:
                role = person_roles.get(pid, {}).get(k, "?")
                entries.append(f"{k}: {v:.2f} ({role})")
            print(f"  {pid}: {', '.join(entries)}")

    # Pass 4: Skills & work summaries (people)
    print("\nComputing collaborator rankings...")
    top_collaborators = compute_top_collaborators(people, messages)
    for pid, collabs in sorted(top_collaborators.items()):
        names = ", ".join(c["name"] for c in collabs[:3])
        print(f"  {pid}: {names}")

    person_summaries = pass4_person_summaries(
        client,
        people,
        person_weights,
        person_roles,
        projects,
        top_collaborators,
        messages,
    )

    print(f"\n  Generated summaries for {len(person_summaries)} people")
    for pid, summary in sorted(person_summaries.items()):
        skills_preview = summary.get("skills_summary", "")[:80]
        print(f"  {pid}: {skills_preview}...")

    # Pass 5: Project summaries
    project_summaries = pass5_project_summaries(
        client,
        projects,
        person_weights,
        person_roles,
        messages,
        all_assignments,
    )

    print(f"\n  Generated summaries for {len(project_summaries)} projects")
    for proj_id, summary in sorted(project_summaries.items()):
        preview = summary.get("summary", "")[:80]
        print(f"  {proj_id}: {preview}...")

    output = {
        "projects": projects,
        "person_weights": person_weights,
        "person_roles": person_roles,
        "project_members": dict(project_members),
        "message_assignments": all_assignments,
        "top_collaborators": top_collaborators,
        "person_summaries": person_summaries,
        "project_summaries": project_summaries,
    }

    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nSaved to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
