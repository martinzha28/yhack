# Bsus Corp — Fake Slack Dataset Specification

This is a generative spec for producing a realistic synthetic Slack dataset for a fictional software company called **Bsus Corp**. Use this to generate or regenerate the data.

---

## People (20 total)

**Backend Team (6)**
- `alice_chen` — Senior Engineer, leads auth/security work. One of the most active communicators. Previously worked closely with `dave_patel` on billing-v2 — they still DM occasionally even though they share no current project.
- `bob_kim` — Engineer, owns database schema and migrations. Works across auth-refactor + infra-migration. Previously worked with `henry_zhao` and `eve_johnson` on platform-api.
- `charlie_ross` — Engineer, builds and maintains APIs. Very tight working pair with `dave_patel` on infra-migration — they're in constant contact about deployments and k8s configs. Also previously collaborated with `alice_chen` on billing-v2.
- `dave_patel` — Engineer, infrastructure and deployments. Leads infra-migration. His closest collaborators are `charlie_ross` and `bob_kim`. Has a fading but still-visible bond with `alice_chen` from billing-v2 — they don't share a current project but have history.
- `karen_wu` — Staff Engineer, security expert. **HIDDEN EXPERT**: sends very few messages (max ~13) but gets @mentioned 20+ times with specific technical context explaining why. People seek her out for security review. Previously worked with `henry_zhao` on platform-api.
- `mike_torres` — Tech Lead. **BRIDGE NODE**: works across Backend and Frontend. His messages naturally mix auth vocabulary AND design system vocabulary. Has a strong bond with `eve_johnson` from both platform-api history and current auth-refactor. Previously worked with `henry_zhao` on platform-api — they don't currently share a project but still check in.

**Frontend Team (6)**
- `eve_johnson` — Senior Engineer, owns the design system implementation and storybook. Very close with `mike_torres` (shared history on platform-api + current overlap on auth-refactor and design-system-v2). Works tightly with `grace_park` on design-system-v2.
- `frank_li` — Engineer, performance optimization. Inseparable working pair with `henry_zhao` on mobile-app — they DM constantly about builds, perf, and React Native. Previously worked with `iris_wang` and `lisa_chen` on brand-refresh (fading connection).
- `grace_park` — Engineer, builds React components. A connector — works on design-system-v2 + onboarding-redesign, so she touches many people. She's `jordan_kim`'s closest collaborator and de facto mentor on the onboarding-redesign project.
- `henry_zhao` — Engineer, leads mobile (React Native). Tightest pair is with `frank_li`. Has fading legacy connections to `bob_kim`, `mike_torres`, and `karen_wu` from platform-api.
- `nina_scott` — Design Engineer. **BRIDGE NODE**: sits between Frontend and Design. Her messages mix component implementation vocabulary with Figma/design token vocabulary. Previously worked with `priya_mehta` on brand-refresh.

**Design Team (4)**
- `iris_wang` — Senior Designer, visual design and Figma. Previously worked with `frank_li` on brand-refresh — a faint cross-team connection.
- `jack_brown` — Designer, UX and user flows. Works on design-system-v2 + onboarding-redesign.
- `lisa_chen` — Designer, motion and animation. Quieter communicator. Previously worked with `frank_li` on brand-refresh.
- `oscar_lee` — Design Lead. Participates in the leadership sync group DM with `mike_torres` and `sofia_martinez`.

**Product Team (4)**
- `priya_mehta` — Product Manager, growth and mobile. Previously worked with `nina_scott` on brand-refresh — a fading cross-team bond.
- `quinn_davis` — Product Manager, platform. Previously worked with `alice_chen` on billing-v2.
- `ryan_nguyen` — Product Analyst. Mostly connected within mobile-app. Previously worked with `alice_chen` and `dave_patel` on billing-v2 — those connections have largely faded.
- `sofia_martinez` — Head of Product. Participates in leadership sync group DM. Less frequent communicator for her seniority.

**New Employee (1)**
- `jordan_kim` — New Engineer, 2 weeks in. Sends very few messages (max ~14). Connected mainly to `grace_park` (closest collaborator on onboarding-redesign), `mike_torres` (onboarding buddy), and `sofia_martinez`. Messages show someone learning the ropes — asking where to find docs, confirming understanding, small contributions.

---

## Interpersonal Relationships

These describe the relationship dynamics the messages should create. The graph is built from message patterns, so these relationships must emerge naturally from who DMs whom, who's in group DMs together, and who @mentions whom.

### Tight Working Pairs (should be the strongest edges)
- **Frank Li ↔ Henry Zhao** — Inseparable on mobile-app. Constant DMs about React Native, TestFlight builds, bundle size, perf profiling. Should be the single strongest connection in the dataset.
- **Charlie Ross ↔ Dave Patel** — Infra-migration core duo. War room group DM, deployment coordination, k8s troubleshooting. Very high volume.
- **Eve Johnson ↔ Grace Park** — Design-system-v2 implementation partners. Component handoffs, storybook PRs, accessibility reviews.
- **Bob Kim ↔ Dave Patel** — Both on infra-migration. Bob handles DB migration steps while Dave handles k8s. Frequent coordination.
- **Alice Chen ↔ Charlie Ross** — Auth-refactor core. Alice leads auth, Charlie builds the APIs. Tight technical collaboration.
- **Alice Chen ↔ Bob Kim** — Auth-refactor. Alice leads, Bob owns the session_tokens DB schema. Regular DMs about migrations and indexing.

### Bonds Strengthened by History
- **Eve Johnson ↔ Mike Torres** — Strong current bond AND shared platform-api history. They already trusted each other before auth-refactor started. Should feel like two people who've worked together for a long time.
- **Grace Park ↔ Jordan Kim** — Grace is Jordan's go-to person on onboarding-redesign. Jordan asks Grace questions, Grace reviews Jordan's PRs. Should be Jordan's strongest connection by far.

### Legacy Bonds (Faded but Visible)
These pairs collaborated on a completed historical project but share NO current project. They should still DM occasionally — referencing old work, checking in — but far less than active collaborators.

- **Alice Chen ↔ Dave Patel** — billing-v2 (Sep-Oct 2024). They built the billing system together. Still friendly, might DM about something that reminds them of a billing edge case.
- **Mike Torres ↔ Henry Zhao** — platform-api (Nov-Dec 2024). Mike architected the API, Henry built the SDK. Occasionally reference old platform-api decisions.
- **Bob Kim ↔ Henry Zhao** — platform-api. Worked on the API schema together. Fading connection.
- **Nina Scott ↔ Priya Mehta** — brand-refresh (Oct-Nov 2024). Nina implemented the marketing site, Priya managed the launch. Occasional check-ins.
- **Frank Li ↔ Iris Wang / Lisa Chen** — brand-refresh. Frank optimized the marketing site perf while they did design. Very faint.
- **Quinn Davis / Ryan Nguyen ↔ Alice Chen** — billing-v2. Quinn drove requirements, Ryan built dashboards. Fading.

### People Who Should NOT Be Close
- `karen_wu` ↔ anyone in Design — no shared project ever, no reason to DM
- `ryan_nguyen` ↔ anyone in Design — no overlap
- `jordan_kim` ↔ most of Backend — jordan is new and only works on onboarding-redesign
- `dave_patel` ↔ anyone in Design — infra engineer, no design touchpoints

---

## Projects (8 total: 5 active + 3 historical)

### Active Projects (Jan–Mar 2025)

| Project | Teams | Members | Time Range |
|---|---|---|---|
| **auth-refactor** | Backend + Frontend | alice_chen, bob_kim, charlie_ross, karen_wu, eve_johnson, mike_torres | Jan–Mar 2025 |
| **design-system-v2** | Frontend + Design | eve_johnson, grace_park, nina_scott, iris_wang, jack_brown, oscar_lee, lisa_chen | Jan–Mar 2025 |
| **mobile-app** | Frontend + Product | henry_zhao, frank_li, priya_mehta, ryan_nguyen, grace_park | Feb–Mar 2025 |
| **onboarding-redesign** | Product + Design + New | quinn_davis, sofia_martinez, jack_brown, grace_park, jordan_kim | Mar 2025 |
| **infra-migration** | Backend | dave_patel, charlie_ross, bob_kim | Jan–Mar 2025 |

auth-refactor and design-system-v2 should have the most messages. infra-migration the fewest (small team).

### Historical Projects (Completed, Sep–Dec 2024)

These projects are finished. Their messages create "legacy connections" — edges that are visible but decayed by recency. Generate fewer messages for these than active projects.

| Project | Teams | Members | Time Range |
|---|---|---|---|
| **billing-v2** | Backend + Product | alice_chen, dave_patel, charlie_ross, quinn_davis, ryan_nguyen | Sep–Oct 2024 |
| **brand-refresh** | Design + Frontend + Product | iris_wang, oscar_lee, lisa_chen, nina_scott, frank_li, priya_mehta | Oct–Nov 2024 |
| **platform-api** | Backend + Frontend | bob_kim, mike_torres, eve_johnson, henry_zhao, karen_wu | Nov–Dec 2024 |

### Project Vocabulary

Each project uses distinctive vocabulary so messages are identifiable by content alone:

- **auth-refactor**: OAuth2, JWT, refresh tokens, token rotation, PKCE, scopes, session_tokens table, auth-service, login endpoint, auth middleware
- **design-system-v2**: design tokens, Figma, storybook, WCAG, semantic colors, spacing scale, button variants, tokens.json, dark mode, color palette
- **mobile-app**: React Native, iOS, Android, push notifications, deep links, bundle size, TestFlight, Hermes engine, metro bundler, activation metrics
- **onboarding-redesign**: user activation, first-time experience, empty states, onboarding checklist, progressive disclosure, drop-off rate, wizard, tooltips, activation funnel
- **infra-migration**: Kubernetes, Docker, Terraform, AWS EKS, GitHub Actions, staging environment, rollback, zero-downtime deployment, Datadog, helm charts
- **billing-v2**: Stripe, invoicing, usage-based pricing, billing cycles, proration, invoice_items table, billing-service, MRR, payment webhook
- **brand-refresh**: brand guidelines, logo redesign, typography system, marketing site, brand book, hero animation, Figma brand file, lighthouse score, LCP
- **platform-api**: REST API, API versioning, rate limiting, developer portal, OpenAPI spec, SDK, webhook subscriptions, cursor-based pagination

---

## Channels

- `general` — everyone (20 people)
- `engineering-general` — all engineers, backend + frontend (12 people)
- `backend` — backend team only (6 people)
- `frontend` — frontend team only (6 people)
- `design` — design team only (4 people)
- `product` — product team only (4 people)
- `onboarding` — jordan_kim, mike_torres, sofia_martinez (3 people)
- DMs between any two people: `"channel": null`

Channel messages should set `"to"` to the channel's member list (not `["all"]`), so edges are scoped correctly.

---

## Group DMs

Multi-person DM groups (3-5 people) representing standups, syncs, and coordination threads. These are stronger signals than channel posts.

| Group | Members | Purpose |
|---|---|---|
| infra-migration war room | bob_kim, charlie_ross, dave_patel | Deployment coordination, incidents. Highest volume group DM — these three live in this chat. |
| auth-refactor standup | alice_chen, bob_kim, charlie_ross, mike_torres | Sprint status, blockers, PR reviews |
| design-system-v2 sync | eve_johnson, iris_wang, nina_scott | Token updates, Figma-to-code handoffs |
| mobile-app standup | frank_li, henry_zhao, priya_mehta | TestFlight builds, metrics, release planning |
| onboarding-redesign planning | grace_park, jack_brown, quinn_davis | Wireframe reviews, implementation planning |
| leadership sync | mike_torres, oscar_lee, sofia_martinez | Cross-team coordination, resourcing, roadmap |

Group DMs have `"channel": null` and `"to"` lists all other group members (excluding sender).

---

## Cross-Project Messages

Include ~30-40 messages where someone explicitly references work from a DIFFERENT project, creating inter-cluster edges:

- auth-refactor needs design-system-v2 button components for the login page
- mobile-app needs auth-refactor SSO before mobile login ships
- design-system-v2 components being reused in onboarding-redesign
- infra-migration affecting auth-refactor deployment pipeline
- onboarding-redesign needs mobile-app deep links for the welcome flow
- brand-refresh (historical) assets referenced in current design-system-v2

These messages mention both projects by name in the text.

---

## Noise Messages (~80-90)

Messages NOT related to any project (`"project": null`). Realistic workplace Slack chatter:

- Lunch/coffee plans, weekend chat, birthday celebrations
- Meeting logistics, zoom links, schedule changes
- Praise and thanks, team announcements
- Off-topic DMs between friends: jokes, recommendations, venting
- Non-project questions: wifi password, conf room booking
- WFH/commute/weather chat, happy hours

---

## Volume and Distribution

- **~735 messages total** (~650 project + ~85 noise)
- **Time span**: September 2024 – March 2025 (7 months)
- **Message mix**: ~60% 1:1 DMs, ~10% group DMs, ~30% channel messages
- **Timestamps**: working hours Mon–Fri, 9am–6pm ET
- Historical projects (Sep–Dec 2024) should have fewer messages per month than active projects (Jan–Mar 2025)
- January should be the heaviest month (multiple projects kicking off)

### Volume Constraints
- `karen_wu`: max ~13 sent messages, but @mentioned in 20+ others with specific technical context
- `jordan_kim`: max ~14 sent messages (new and quiet)
- `lisa_chen`, `sofia_martinez`: low volume (~15-20 each)
- `alice_chen`, `mike_torres`, `eve_johnson`, `grace_park`: high volume (~50-65 each) — these are the most active communicators
- Volume should be **skewed**: a few people send a lot, most send a moderate amount, a few are quiet

---

## Semantic Richness Rules

1. **Use project-specific vocabulary.** Messages must be identifiable by content alone — without relying on the `project` field.
2. **Name specific artifacts.** "the `session_tokens` table migration" not "the migration." "tokens.json" not "the config file." "the EKS cluster" not "the server."
3. **Bridge node messages mix vocabulary.** mike_torres mixes auth AND design-system terms. nina_scott mixes React components AND Figma terms.
4. **@mentions need context.** `"hey @karen_wu can you review the token rotation logic in auth-service?"` not `"@karen_wu can you check this?"`
5. **Longer messages for complex topics.** PR reviews, blockers, status updates: 2-4 sentences. Quick replies can be short.
6. **70% semantically rich**, 30% short replies ("sounds good", "on it", "merged!", "lgtm").

---

## Output Schema

```json
{
  "company": "Bsus Corp",
  "generated_at": "2025-01-01T00:00:00Z",
  "people": [
    {
      "id": "alice_chen",
      "name": "Alice Chen",
      "role": "Senior Engineer",
      "team": "backend",
      "expertise": ["authentication", "security", "oauth"],
      "projects": ["auth-refactor", "billing-v2"]
    }
  ],
  "projects": [
    {
      "id": "auth-refactor",
      "name": "Auth Refactor",
      "members": ["alice_chen", "bob_kim", "charlie_ross", "karen_wu", "eve_johnson", "mike_torres"],
      "keywords": ["OAuth2", "JWT", "refresh tokens", "session management", "auth-service"]
    },
    {
      "id": "billing-v2",
      "name": "Billing v2",
      "status": "completed",
      "time_range": "Sep-Oct 2024",
      "members": ["alice_chen", "dave_patel", "charlie_ross", "quinn_davis", "ryan_nguyen"],
      "keywords": ["Stripe", "invoicing", "usage-based pricing", "billing-service"]
    }
  ],
  "messages": [
    {
      "id": "msg_0001",
      "from": "alice_chen",
      "to": ["bob_kim"],
      "channel": null,
      "text": "hey the session_tokens table needs an index on expires_at — the auth middleware is doing a full table scan on every token validation request",
      "timestamp": "2025-01-06T09:23:00Z",
      "project": "auth-refactor"
    },
    {
      "id": "msg_0002",
      "from": "alice_chen",
      "to": ["bob_kim", "charlie_ross", "mike_torres"],
      "channel": null,
      "text": "quick standup check — bob how's the session_tokens migration looking? charlie any blockers on the login endpoint?",
      "timestamp": "2025-01-06T09:45:00Z",
      "project": "auth-refactor"
    }
  ]
}
```
