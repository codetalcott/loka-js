# Incident triage (es) — end-to-end agent demo

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

# Terminal 3 — the agent
cd ~/projects/loka-js
node examples/incident-triage-es/agent.mjs
```

## What you'll see

The agent prints six phases:

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

Sample output excerpt (last few lines):

```
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

- An actual LLM consuming the action graph. The scripted agent's logic
  could be ported into a Claude API call where the LLM picks each step
  (or rejects steps that need human approval per `fx-confirm`); not done
  in this demo.
- Dynamic page generation. The HTML page is hand-coded for the
  10-affordance workflow. A real system would server-render this from
  the live Siren response, possibly with `<lse-intent>` elements.
- Failure recovery. The agent assumes every POST succeeds. A real agent
  would handle 409 (precondition not met — re-plan) and 4xx/5xx
  (different recovery paths).
- Page-level GRAIL state (e.g. showing which conditions are currently
  true based on a backend fetch). The page is purely static affordance
  metadata.
- Multi-locale agents. Only Spanish is wired up. The pattern extends to
  all 24 loka locales if their vocab tables get the incident-domain
  entries.

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

## Files

- [index.html](index.html) — Spanish affordance manifest (10 cards, one per affordance)
- [agent.mjs](agent.mjs) — deterministic backward-chaining agent (~140 lines)
- [README.md](README.md) — this file
