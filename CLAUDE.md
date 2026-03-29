# OrgGraph — YHack Project

## What This Is

An AI-powered org chart for enterprise onboarding. Instead of a rigid HR hierarchy, this tool analyzes communication patterns (Slack messages, emails) to surface who actually works with who, what they work on, and who the real experts are. The primary use case is a new employee understanding the organization before their first week.

Track: **Personal Agents for Enterprise**

---

## Current State

- `data/slack_data.json` — 500 fake Slack messages, 20 people, 5 projects, generated and ready
- `data/people.json` — static people definitions with roles, teams, expertise, project membership
- `data/projects.json` — static project definitions with members and keyword vocabulary
- `data/chunks/` — per-project message chunks (can regenerate individual projects without touching others)

The dataset has intentional structure:
- **3 clear team clusters** (Backend, Frontend/Design, Product)
- **Bridge nodes**: `mike_torres` (Backend↔Frontend), `nina_scott` (Frontend↔Design)
- **Hidden expert**: `karen_wu` (few messages, heavily @mentioned)
- **New employee**: `jordan_kim` (isolated, few connections, onboarding-redesign project)
- **~80 noise messages** (`"project": null`) for realism

---

## Tech Stack

- **Frontend**: Next.js + React
- **Visualization**: D3.js (force-directed graph)
- **LLM queries**: Next.js API routes → Anthropic/OpenAI
- **Data**: Pre-computed JSON, no backend needed for the demo
- **Storage**: Static files in `/data` — no database for now

No separate backend. All graph computation happens at build/load time from the static dataset.

---

## Data Schema

```json
// slack_data.json
{
  "people": [{ "id", "name", "role", "team", "expertise", "projects" }],
  "projects": [{ "id", "name", "members", "keywords" }],
  "messages": [{
    "id", "from", "to": ["person_id"],
    "channel": null | "channel-name",
    "text", "timestamp", "project": "project-id" | null
  }]
}
```

**Group message handling**: a message sent to a channel is treated as a DM to every recipient in `to[]`. Edge weight is lower than a direct DM (see weight formula below).

---

## Edge Weight Formula

```
weight(a, b) = Σ messages * type_multiplier * recency_decay

type_multiplier:
  DM (1:1)          → 1.0
  Group message      → 0.3   (split across all recipients)

recency_decay:
  e^(-λ * days_since_message)   where λ = 0.01
```

Final weights normalized to [0, 1] across all edges.

---

## Graph Architecture

### View 1 — Individual Graph (BUILDING NOW)
Force-directed graph. Nodes = people. Edge thickness = weight. Proximity = closeness. Click a node to see that person's connections and expertise.

### View 2 — Ego Network (stretch)
Center on one person. Concentric rings of social distance. Built for the "new employee perspective" — show Jordan's network at day 1 vs day 90.

### View 3 — Collapsed Team Graph (stretch)
Collapse clusters into single nodes. Edges = inter-team communication volume. Shows silos.

---

## Immediate Next Steps (Do This Now)

### Step 1 — Compute graph weights
Write `data/compute_graph.js` (or a Next.js API route / build script) that:
1. Reads `slack_data.json`
2. For each message, adds weighted edges between `from` and every person in `to[]`
3. Applies type multiplier (DM vs group) and recency decay
4. Normalizes all edge weights to [0, 1]
5. Outputs `data/graph.json` with this shape:

```json
{
  "nodes": [
    { "id": "alice_chen", "name": "Alice Chen", "team": "backend", "expertise": [...] }
  ],
  "links": [
    { "source": "alice_chen", "target": "bob_kim", "weight": 0.84 }
  ]
}
```

### Step 2 — Scaffold Next.js app
```bash
npx create-next-app@latest app --typescript --tailwind --app
cd app && npm install d3
```

### Step 3 — Build D3 force-directed graph
Create `app/components/OrgGraph.tsx`:
- Nodes sized by degree centrality
- Edge thickness mapped to weight
- Only render edges above a minimum weight threshold (start at 0.1, add a slider later)
- Color nodes by team
- Click node → highlight that node's edges, fade everything else

### Step 4 — Verify the story
Check that the graph visually shows:
- Clear Backend / Frontend / Product clusters
- mike_torres and nina_scott sitting between clusters
- jordan_kim isolated with one or two edges
- karen_wu as a small but well-connected node

---

## Key Design Decisions

- **No backend during demo** — all data is pre-computed JSON loaded at page load
- **Edge threshold slider** — don't render all edges, only above a weight cutoff. Without this the graph is a hairball.
- **Fixed layout seed** — D3 force simulation is non-deterministic. After first stabilization, save node positions so the layout is consistent across demo runs.
- **Noise messages included** — `"project": null` messages contribute to relationship weights but not project clustering. They add realism to who talks to who.

---

## Stretch Goals (Post-Core)

- LLM query interface: "who should I meet first?" "who's the expert on auth?"
- Expertise extraction from message content per person
- Ego network view (View 2)
- Chord diagram for team-to-team communication (View 3)
- Time slider — watch the graph evolve over Jan–Mar 2025
- Bottleneck detector — highlight high betweenness centrality nodes
- User JSON upload (final stretch)
