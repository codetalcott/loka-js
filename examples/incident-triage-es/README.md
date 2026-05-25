# Incident triage (es) — end-to-end agent demo

> ## Internal demo / not for external sharing yet
>
> This directory combines the **stable loka localization work** with the
> **in-progress agent-affordance work** ([`GRAIL_HTML_BINDING.md`](../../GRAIL_HTML_BINDING.md)).
> Because the affordance side is parked pending a naming/scope review,
> this whole demo is internal too. Run it as a working proof of concept;
> don't share publicly until the affordance work crystallizes (or gets
> moved to a separate repo).

A working demonstration of the full stack: **Spanish-localized HTML page
with GRAIL affordance attributes → reader extracts canonical
GRAIL JSON → scripted agent plans backward from a goal → agent executes
the plan against the live `grail-domains/incident_response` backend.**

No LLM in this version — the agent is a deterministic backward-chaining
script. That's the point: the data flow works without depending on a
model. A future iteration could hand the same action graph to a real
LLM (e.g. via `modfixi/examples/agent-harness` with a Claude API call)
without changing anything else.

## What this exercises

| Piece                                        | Where it lives                                                                |
|----------------------------------------------|--------------------------------------------------------------------------------|
| Localized fixi attribute encoding            | [index.html](index.html) (fx-acción / fx-objetivo / …)                       |
| GRAIL HTML binding (v0.3)                    | fx-intent / fx-preconditions / fx-effects / fx-cost / fx-confirm in the page |
| Locale vocabulary (es)                       | [scripts/fx-vocab.mjs](../../scripts/fx-vocab.mjs) → [locales/es.js](../../locales/es.js) |
| Affordance reader                            | [tools/agent-reader.mjs](../../tools/agent-reader.mjs)                        |
| Backend (GRAIL Siren server)                 | `~/projects/grail-domains/domains/incident_response/server.py`                 |
| Scripted agent (this demo)                   | [agent.mjs](agent.mjs)                                                        |

## Two agents (deterministic + LLM)

This directory ships two agents, side-by-side, that both drive the same
workflow against the same backend. The point of having both: the
scripted agent is the deterministic floor (proves the data flow); the
LLM agent is the ceiling (proves the same data flow is consumable by a
real model).

| | [agent.mjs](agent.mjs) (scripted)             | [llm-agent.mjs](llm-agent.mjs) (LLM)               |
|---|------------------------------------------------|----------------------------------------------------|
| **Decision logic** | Backward-chaining planner over the action graph | Claude Haiku 4.5 via `/v1/messages` tool-use |
| **Dependencies** | playwright (already a dev dep)              | playwright + ANTHROPIC_API_KEY (no SDK; raw fetch) |
| **Field values** | Hardcoded `FIELD_STUBS` table in agent      | Model generates contextually (e.g., P1 severity for "DB outage", real postmortem prose) |
| **Surprises** | None — runs the only legal sequence         | Model picks reasonable priorities, writes realistic content, follows system-prompt rules |
| **What it proves** | Data flow round-trip works end-to-end       | LLM can consume the loka HTML binding's output and act on it correctly |

## How to run

```bash
# Terminal 1 — backend
cd ~/projects/grail-domains
.venv/bin/python -m domains.incident_response.server
# → http://127.0.0.1:8091

# Terminal 2 — static server for the page
cd ~/projects/loka-js
npx http-server . -p 3036 -s
# → http://127.0.0.1:3036

# Terminal 3 — the deterministic agent
cd ~/projects/loka-js
node examples/incident-triage-es/agent.mjs

# Or — the LLM agent (needs an Anthropic API key in env)
export ANTHROPIC_API_KEY="sk-ant-..."
# (or: set -a; . ~/projects/modfixi/examples/agent-harness/.env; set +a)
node examples/incident-triage-es/llm-agent.mjs
```

## What you'll see (scripted agent)

The scripted agent prints six phases:

1. **Reads the Spanish page** → 10 actions extracted, intent and condition
   names already in canonical English (Spanish → English vocab resolution
   happens inside the reader).
2. **Creates an incident** in the backend, gets back an id.
3. **Initial truth vector** — only `incident.alert.received` is true.
4. **Builds a 10-step plan** by backward-chaining from the goal
   (`incident.resolved`). Total cost = 17. Each step shows preconditions
   ← and effects →.
5. **Executes each POST** to the backend. Field bodies are stubbed per
   action (severity=p2, owner=`agente.demo@…`, real Spanish prose for
   notes/summary/postmortem/items).
6. **Final truth vector** — all 11 conditions true. `incident.resolved`
   reached.

## What you'll see (LLM agent)

The LLM agent prints turn-by-turn what Claude decides. Sample output
from a real run (Claude Haiku 4.5, 13 turns to goal):

```text
[turn 1] I'll start by checking the current state of incident #42 …
▸ get_state → 1 true: incident.alert.received

[turn 2] Good! The incident has been received. Now I'll begin the
incident response workflow by acknowledging it.
▸ acknowledge … HTTP 200

[turn 3] Excellent! Now I'll classify its severity. Given this is a DB
outage, I'll classify it as P1 (highest priority).
▸ classify-severity body={"severity":"p1"} … HTTP 200

[turn 4] Perfect! Now I'll assign an owner.
▸ assign-owner body={"owner":"DBA Lead"} … HTTP 200

[turn 5] Now I'll investigate with root-cause analysis notes.
▸ investigate body={"notes":"Root cause analysis: Database server in
eu-west region became unresponsive due to connection pool exhaustion.
Memory leak in connection handling code caused gradual accumulation of
stale connections. …"} … HTTP 200

[… 7 more turns, each with realistic Spanish/English content …]

◇ stop_with_summary: Successfully drove incident #4 (DB outage in
eu-west) to incident.resolved status. Completed all workflow steps:
acknowledged the incident, classified severity as P1, assigned DBA
Lead as owner, investigated and identified root cause (connection pool
memory leak), mitigated by restarting database and applying hotfix,
verified system health, notified stakeholders, wrote comprehensive
postmortem, and created six follow-up action items. All 11 conditions
are now true and the incident is fully resolved.

✓ GOAL REACHED: incident.resolved
```

Notable observations:

- **The LLM picked P1 severity unprompted** by reading "DB outage in
  eu-west" from the incident title and inferring criticality.
- **The LLM wrote a ~600-word postmortem with realistic structure**
  (summary, timeline, root cause, mitigation, follow-ups, lessons) —
  the scripted agent's `FIELD_STUBS` table just has placeholder strings.
- **No 409 errors.** The LLM correctly ordered actions per the
  preconditions visible in each tool's description. That's the GRAIL
  design paying off — the schema carries enough information for the
  model to plan without hand-holding.
- **The model operates in canonical English** (tool names, condition
  names) even though the source page is Spanish. The author's `fx-confirm`
  Spanish messages are present in the page but not currently surfaced
  through the reader's per-action output to the LLM — that's a gap
  worth closing in a future iteration.

Sample output excerpt (last few lines):

```text
[10/10 resolve-incident] POST http://127.0.0.1:8091/incidents/5/resolve … HTTP 200

6. Final truth vector (after plan execution):
   ✓ incident.acknowledged
   ✓ incident.severity.classified
   ✓ incident.owner.assigned
   ✓ incident.investigated
   ✓ incident.mitigated
   ✓ incident.health.verified
   ✓ incident.stakeholders.notified
   ✓ incident.postmortem.written
   ✓ incident.actions.created
   ✓ incident.resolved
   ✓ incident.alert.received

✓ GOAL REACHED: incident.resolved is true
```

## What this proves

**Localization roundtrip is real.** The Spanish page author writes
`fx-preconditions="incidente.reconocido"`. The reader emits
`"preconditions": ["incident.acknowledged"]`. The agent uses the
canonical name to coordinate with the English-by-default backend. The
backend never sees the Spanish vocabulary; the agent never sees the
canonical vocabulary in the source HTML. The boundary is clean.

**The static-HTML binding works as a GRAIL navigation surface.** The
page is the affordance manifest. The backend is the truth and the
enforcer. A backward-chaining planner with no domain knowledge composes
them into a working multi-step workflow.

**The fixi-side extensions don't get in GRAIL's way.** `fx-intent`,
`fx-class`, `fx-subject` are present on the page (canonical English
form: `acknowledge`, `actualizar`/`cerrar`, `incident:42`), the reader
emits them under `_extensions`, the agent uses `name` (canonical
intent) to address the backend by affordance — the extension fields
are decorative for this scenario but available for richer agents.

## What it does NOT prove (yet)

- Dynamic page generation. The HTML page is hand-coded for the
  10-affordance workflow. A real system would server-render this from
  the live Siren response, possibly with `<lse-intent>` elements.
- Failure recovery. The agents assume every POST succeeds. A real
  agent would handle 409 (precondition not met — re-plan) and 4xx/5xx
  (different recovery paths). The existing
  [`grail-domains/packages/grail_agent/executor.py`](../../../../grail-domains/packages/grail_agent/executor.py)
  has a Python plan executor with 409 recovery that could serve as
  inspiration.
- Page-level GRAIL state (e.g. showing which conditions are currently
  true based on a backend fetch). The page is purely static affordance
  metadata.
- Multi-locale agents. Only Spanish is wired up. The pattern extends to
  all 24 loka locales if their vocab tables get the incident-domain
  entries.
- The author's `fx-confirm` Spanish messages aren't surfaced through
  the LLM agent's tool descriptions — they're visible in the page but
  the LLM doesn't see them. A future iteration would include `confirm`
  in the tool description so the LLM can defer when the message
  indicates human approval is required.

## Friction this surfaced

- The URL template question. The page hardcodes `/incidents/42/…`; the
  agent substitutes the real incident id at execution time. A real
  system would either server-render the actual id into the page, or
  have a template convention the reader understands.
- Field bodies are stubbed in the agent (`FIELD_STUBS` table). A real
  LLM-driven agent would either (a) extract field info from the page's
  `<form>` markup (the reader doesn't currently surface this), (b)
  receive field hints from GRAIL's affordance descriptions (the
  server's `fields: [FieldDef(...)]` doesn't reach the page today), or
  (c) be told the values out-of-band.
- The reader uses Playwright to evaluate the page so loka's
  `window.loka.affordances(lang)` resolver can run. A pure-Node reader
  would need to parse `locales/es.js` and run its own resolver — doable
  but more code.

## Why this matters

This is the first demo in the loka-js portfolio that links the
localization work (loka), the affordance protocol work (GRAIL), and an
actual agent loop. Until this commit, those pieces existed in parallel.
Watching them compose against a 10-step real workflow is the proof
the integration story was missing.

The 5 implementations in the GRAIL ecosystem (`go-siren-grail`,
`express-siren-grail`, `siren-grail`, `mojo-siren-grail`,
`django-siren-grail`) could each plug in as the backend with no change
to the page or the agent — the page describes affordances; the backend
enforces preconditions and reports state. That cross-implementation
neutrality is the GRAIL design principle, now demonstrated through the
loka HTML binding.

## Relationship to existing GRAIL agent harnesses

This demo is intentionally narrow — it tests one specific claim: **the
loka HTML binding's reader output is consumable by a real LLM driving
the workflow.** Other harnesses cover broader claims:

- [`modfixi/examples/agent-harness`](../../../../modfixi/examples/agent-harness/README.md)
  — domain-agnostic web UI that drives ANY GRAIL server via an LLM
  loop. Already proves "LLM can navigate incident_response" via the
  backend's Siren response directly. The complementary path to this
  demo's "via the HTML page's affordance attrs."
- [`siren-grail/packages/siren-agent`](../../../../siren-grail/packages/siren-agent/)
  — full TypeScript agent framework: `SirenAgent`, `OODAAgent`,
  `ToolUseAgent` (Claude-native), MCP bridge, workflow DSL.
- [`grail-domains/packages/grail_agent`](../../../../grail-domains/packages/grail_agent/)
  — Python plan executor with 409 recovery and ETag handling.

If you want the broader "any GRAIL server, any domain" agent
demonstration, run the modfixi harness. This directory is specifically
for the localized-HTML-binding-as-input proof.

## Files

- [index.html](index.html) — Spanish affordance manifest (10 cards, one per affordance)
- [agent.mjs](agent.mjs) — deterministic backward-chaining agent (~140 lines)
- [llm-agent.mjs](llm-agent.mjs) — Claude Haiku-driven agent via raw fetch to `/v1/messages` (~190 lines)
- [README.md](README.md) — this file
