# Hop Onboard (YHack 2026)

## Youtube Demo
[![Youtube Demo](https://i.ytimg.com/vi/Qe4SlK1q7FE/hqdefault.jpg)](https://www.youtube.com/watch?v=Qe4SlK1q7FE "Now in Android: 55")

## Inspiration
Hop Onboard was inspired by our personal experiences working in corporate environments for previous internships. We learned first-hand how difficult it is to get acquainted in a new company due to sheer organization size, lack of personalized onboarding, and poor information documentation. New hires are thus left with gaps in understanding about nuanced cross-team relationships, which knowledge experts to contact for help, and who is working on what projects. Our solution arose from these struggles.

## What it does
Hop Onboard is an interactive and dynamic tool that enables new hires and all existing employees a way to quickly understand the dynamics of their organization. Specifically, we developed 2 organizational views.
1. **The person view** shows which employees actually work closely with each other and employees that are implicitly close due to direct teammates' interactions. When the user clicks on a specific employee node, an informational panel on the right displays LLM generated summaries of that person’s role within the company, their key projects organized by involvement, and key people they work with. 

2. **The project view** displays all the company’s projects (active and inactive). The user can visually see larger circles represent larger projects, and the connections between 2 nodes as the number of overlapping people contributing to both. Clicking on a project note opens an informational panel on the right that displays an LLM generated summary of the project, key skills required, and the main people working on it.

Another key feature is the AI chatbot powered by K2 Think V2. This enables the user to dive deeper into the data by asking questions. 


## How we built it

We used K2 Think V2 to generate ~1,000 realistic Slack messages simulating a real enterprise environment, complete with project channels, team and cross-team channels, DMs, and everyday noise. The mock org has 20 people across backend, frontend, design, data, and product teams, spread across ~10 concurrent projects.

Graph computation edge weights between people are computed from message frequency, scaled by recency decay and recipient count (DMs weigh more than broadcasts). We then run K2 Think V2 to pass over the raw messages to semantically assess each person's importance to each project, producing per-person project weights and roles (lead, core, contributor, peripheral). A final LLM pass generates skills and work summaries for every person. Community detection uses the Leiden algorithm on the weighted graph. 

The frontend is built with Next.js and uses D3.js force-directed graphs for interactive exploration. People nodes are sized by connection degree, colored by team, and clustered by detected community. The integrated chatbot runs on K2 Think V2, with full access to the graph data, semantic analysis, and person/project summaries, so you can ask natural-language questions about the org like "who works most closely with Alice?" or "which teams overlap on billing-v2?" and get grounded answers. Take a look at the [full architecture diagram here.](https://raw.githubusercontent.com/martinzha28/yhack/refs/heads/main/Architecture.drawio.png?token=GHSAT0AAAAAADZAOFCUUUEXWMK7G4SWIDJI2OJJIQQ)

## Challenges we ran into
- Finding a clustering algorithm without strict cartesian coordinates
- Efficiently running AI to process a large amount of data
- Parsing AI output to fit the needs of the application

## Accomplishments that we're proud of
- Building something so big in so short time
- Solving a problem we encountered first-hand, that is high-impact
- Managing energy well to have the highest output
- Playing to each other’s strengths and weaknesses

## What we learned
- How to implement fast ideation
- Simple data modelling
- Algorithms
- Transition to continuous improvement
- Task prioritization and objective management

## What's next for Hop Onboard
- Scaling
- Add integrations to pull real data (Slack, Discord, Jira, Microsoft Teams, Outlook, GitHub)
- More advanced weighting algorithms (embeddings)
- Larger overview that includes both people and projects and their relationships
- Filtering projects and interactions between people based on time window. 
- Encode more information: location, company hierarchy 
