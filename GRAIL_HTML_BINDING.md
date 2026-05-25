# HTML attribute binding for GRAIL

> ## Internal / parked
>
> This spec is **not ready for external use or public reference.** Two
> specific blockers, both noted in the [main README](README.md):
>
> 1. **Terminology under review.** The name "GRAIL" is borrowed from
>    [Mike Amundsen's work](https://www.amundsen.com/talks.html); the
>    sibling `~/projects/grail-spec` is the user's interpretation of
>    that framework, and may diverge from Amundsen's canonical spec.
>    Until coordinated with Amundsen (or renamed), treat this document
>    as a working draft, not a published name.
> 2. **Scope unclear vs. existing protocols.** The HTML-binding-for-
>    agents space already has Siren, schema.org Actions, LSE, OpenAPI,
>    JSON-LD. What this binding uniquely demonstrates is not yet
>    clearly differentiated from those.
>
> The file is kept in-repo because it documents real exploration and
> the [reference reader](tools/agent-reader.mjs) +
> [incident-triage demo](examples/incident-triage-es/) build against
> it. Use it internally; don't link to it publicly.

**Status:** v0.3 — a rewrite of the v0.1/v0.2 `AGENT_AFFORDANCES.md` after
discovering that the sibling `projects/grail-spec` (v1.0.0, released
2026-04-20) defines the canonical protocol for the problem space this
work was sketching. v0.3 aligns terminology with the user's grail-spec,
drops the parallel inventions, and positions the work as an HTML-
attribute binding for that protocol.

Pre-v1.0 and subject to change; feedback welcome at
<https://github.com/codetalcott/loka-js/issues>.

## What this is

A small set of HTML attributes that sit alongside the fixi family
(`fx-action`, `fx-method`, `fx-target`, ...) and encode an action's
**GRAIL affordance metadata** — preconditions, effects, cost, and
confirmation requirements — directly in the rendered page.

GRAIL's canonical binding is Siren over HTTP: the server emits Siren
entities whose actions carry `preconditions` / `effects` / `cost` /
`confirm` fields. This spec defines a parallel binding for pages that
don't have a Siren-aware backend (static HTML; fixi-only servers; pages
that simply prefer to keep affordance metadata co-located with the
element that triggers the action).

fixi-family libraries ignore every attribute defined here — they are
read only by downstream consumers: LLM agents that navigate or operate
the page, dev overlays, auditors, and tooling that wants to round-trip
HTML pages through GRAIL-aware agent harnesses (e.g.
`modfixi/examples/agent-harness`).

## Relationship to GRAIL

| GRAIL concept                  | This binding                                       |
|--------------------------------|----------------------------------------------------|
| `preconditions` (array)        | `fx-preconditions="..."` (space-separated)         |
| `effects` (array)              | `fx-effects="..."` (space-separated)               |
| `cost` (non-neg int)           | `fx-cost="N"`                                      |
| `confirm` (string message)     | `fx-confirm="..."` (non-empty = required)          |
| Action `name` / Siren `name`   | `fx-intent="..."` (the same idea, HTML-flavoured)  |
| Action `href`                  | `fx-action` (already in fixi)                      |
| Action `method`                | `fx-method` (already in fixi)                      |
| Action `fields`                | `<form>` fields under the action element           |

Condition names follow GRAIL's convention: dot-separated identifiers
like `post.exists`, `user.role.admin`, `order.status.processing`.
fixi-side conventions (no Siren entity for context) may also use
hyphenated forms; agents should treat both as opaque tokens.

## Design principles

1. **Pure binding.** Field names and value semantics match GRAIL
   exactly. The reader emits GRAIL-compatible affordance JSON.
2. **Additive to fixi.** No fixi-family library is modified. Every
   attribute here is invisible to fixi, moxi, paxi, ssexi, rexi.
3. **Colocated.** Affordance metadata lives on the same element that
   performs the action. No out-of-band manifest.
4. **Localizable.** Vocabulary is author-written strings, resolved
   through the same loka-js machinery applied to fixi attributes. See
   [Localization](#localization).
5. **Composable with full GRAIL.** A page using this binding can be
   served by a GRAIL backend (which would also emit Siren+GRAIL JSON)
   or by a static / non-GRAIL backend. Both work.

## Scope

**In scope:** encoding GRAIL affordance metadata (preconditions,
effects, cost, confirm) plus a small set of fixi-side conveniences
(intent, class, subject) on HTML elements that fixi will act on.

**Out of scope:**

- The GRAIL planner (backward chaining, plan steps) — that's a runtime
  capability, not encodable in static attributes. Deploy a GRAIL
  server if you need planning.
- Truth-vector tracking and condition evaluation — also runtime.
- Workspace / federation mode (cross-project coordination).
- Resource-level metadata (use schema.org / microdata).
- Visual / interaction concerns (ARIA, focus, animation).
- LSE intent structure (`@lokascript/intent`) — see
  [Composition](#composition-with-other-protocols).

## Core attributes (GRAIL-aligned)

These four are the canonical GRAIL binding. Field names match GRAIL
terminology; value spaces match GRAIL semantics.

### `fx-preconditions`

**Purpose:** Condition names that must all be true before the action
can succeed. Equivalent to GRAIL `preconditions`.

**Value:** Space-separated condition tokens. Each token is opaque;
agents look it up against a known truth vector (if any) or treat as
informational.

**Default:** Unspecified (no preconditions).

**Example:** `fx-preconditions="post.exists user.role.owner"`.

### `fx-effects`

**Purpose:** Condition names that become true after the action
succeeds. Equivalent to GRAIL `effects`.

**Value:** Space-separated condition tokens. May contain `{field}`
templates that resolve to concrete condition names at execution time
(matching GRAIL's dynamic-effect support).

**Default:** Unspecified (no declared effects). Agents should assume
non-GET methods produce server-state effects even when this is absent.

**Example:** `fx-effects="post.deleted feed.refreshed"`.
**Dynamic example:** `fx-effects="order.status.{status}"`.

### `fx-cost`

**Purpose:** Non-negative integer weighting the action's effort
(latency, expense, attention). Used by planners to prefer cheaper
producers when multiple actions satisfy the same condition. Equivalent
to GRAIL `cost`.

**Value:** Non-negative integer. `0` means free/instant.

**Default:** `1`.

**Example:** `fx-cost="3"`.

### `fx-confirm`

**Purpose:** Confirmation message. When non-empty, the action requires
explicit confirmation before execution. Equivalent to GRAIL `confirm`.

**Value:** A free-form string. The message itself may convey severity
(`"Type DELETE to confirm permanent deletion"` vs `"Save changes?"`).
Empty / absent = no confirmation required.

**Default:** Empty.

**Example:** `fx-confirm="Permanently delete post 123? This cannot be undone."`.

## Fixi-side extensions

These three are not part of canonical GRAIL but are useful for HTML
pages where the action element doesn't have a Siren entity to anchor
on. The reader emits them as extension fields; GRAIL-aware tooling
that doesn't know them can safely ignore.

### `fx-intent`

**Purpose:** Semantic action name (the identifier an LLM uses when
referring to this action). Parallels Siren's `name` field on actions.

**Value:** A short token. Lowercase, hyphenated convention.
Application-defined; localizable.

**Example:** `fx-intent="delete-post"`.

### `fx-class`

**Purpose:** Informal taxonomy of the action — useful for "find all
delete actions on this page" queries from agents.

**Value:** One of: `read`, `create`, `update`, `delete`, `navigate`,
`search`, `toggle`, `open`, `close`. Application-specific values
allowed.

**Default:** Unspecified. Agents may infer from `fx-method`.

**Example:** `fx-class="delete"`.

### `fx-subject`

**Purpose:** The resource this action operates on. Useful when the
URL doesn't make this obvious or when the same conceptual subject
appears across multiple URLs.

**Value:** URN-like identifier or human-readable resource reference.

**Default:** Unspecified.

**Example:** `fx-subject="post:123"`.

## Page-level defaults

```html
<meta name="fx-affordances" content="default-cost:1, default-confirm:Save changes?">
```

Recognized keys: `default-cost`, `default-confirm`. Each is the
unprefixed name of an affordance attribute. Per-action attributes
override; the default only fills the gap. Defaults pass through locale
resolution like any other value.

## Worked example

```html
<head>
  <meta name="fx-affordances" content="default-cost:1">
</head>

<button
  fx-action="/posts/123"
  fx-method="DELETE"
  fx-target="#feed"
  fx-swap="morph"

  fx-intent="delete-post"
  fx-subject="post:123"
  fx-class="delete"
  fx-preconditions="post.exists user.role.owner"
  fx-effects="post.soft-deleted feed.refreshed"
  fx-cost="2"
  fx-confirm="Soft-delete post 123? It can be restored within 30 days.">
  Delete post
</button>
```

What an LLM agent sees (after the reader extracts and emits
GRAIL-compatible JSON):

```json
{
  "href": "/posts/123",
  "method": "DELETE",
  "name": "delete-post",
  "preconditions": ["post.exists", "user.role.owner"],
  "effects": ["post.soft-deleted", "feed.refreshed"],
  "cost": 2,
  "confirm": "Soft-delete post 123? It can be restored within 30 days.",
  "_extensions": {
    "class": "delete",
    "subject": "post:123"
  }
}
```

The shape is a Siren action with GRAIL precondition/effect/cost/confirm
fields, plus `_extensions` carrying fixi-side metadata. A GRAIL agent
harness can consume this directly; the `_extensions` object can be
ignored or used as it sees fit.

## Localization

Affordance attribute values are author-written strings, so localizable
through loka-js's hook contract. Spanish:

```html
<button
  fx-acción="/posts/123"
  fx-método="DELETE"
  fx-intent="borrar-post"
  fx-class="borrar"
  fx-preconditions="post.existe usuario.rol.dueño"
  fx-effects="post.borrado feed.actualizado"
  fx-cost="2"
  fx-confirm="¿Borrar el post 123? Se puede recuperar en 30 días.">
  Borrar post
</button>
```

The reader resolves localized values to canonical English through the
locale's `affordances` block:

```js
window.loka.register('es', {
  // ... existing fixi/moxi/paxi/rexi blocks ...
  affordances: {
    intents:    { 'borrar-post': 'delete-post', ... },
    classes:    { borrar: 'delete', crear: 'create', ... },
    conditions: { 'post.existe': 'post.exists',
                  'usuario.rol.dueño': 'user.role.owner',
                  'post.borrado': 'post.soft-deleted', ... },
  },
});
```

The `conditions` table localizes condition names — both preconditions
and effects share this table because they're drawn from the same
naming space. `fx-confirm` messages are free-form strings; their
"localization" is just authoring the message in the right language
(no resolver involved).

`fx-cost` is an integer, not localizable.

### App-specific vocabulary

`fx-intent` values are application-defined (`delete-post`,
`archive-thread`). Locale modules can pre-translate common intents,
but application-specific intents need to be registered by the app
itself:

```js
window.loka.register('es', {
  affordances: {
    intents: { 'archivar-hilo': 'archive-thread', ... },
  },
});
```

`register` merges into the existing locale block. Same pattern applies
to app-specific condition names in the `conditions` table.

## Reader output

The reference reader ([tools/agent-reader.mjs](tools/agent-reader.mjs))
walks all `[fx-action]` elements and emits one JSON object per action.
Output is shaped to round-trip through GRAIL tooling:

```json
{
  "element":   {"tag": "button", "id": null, "text": "Delete post"},
  "lang":      "es",
  "mechanics": {"href": "/posts/123", "method": "DELETE",
                "target": "#feed", "swap": "morph"},
  "name":      "delete-post",
  "preconditions": ["post.exists", "user.role.owner"],
  "effects":       ["post.soft-deleted", "feed.refreshed"],
  "cost":          2,
  "confirm":       "...",
  "_extensions":   {"class": "delete", "subject": "post:123"},
  "_meta":         {"unresolved": [], "defaultsApplied": {...}}
}
```

A `--format=grail` flag could emit Siren+GRAIL action JSON directly
for use with `grail-domains`-style backends; deferred until needed.

## Validator rules

The reader's `validate(actions)` returns issues at three severities,
escalating with mechanical destructiveness.

**Errors:**

- Mechanical method ∈ `{DELETE, PUT, POST, PATCH}` AND no `fx-intent` /
  `fx-class` AND no `fx-preconditions` — destructive call with no
  agent-visible metadata.
- `fx-class="delete"` AND no `fx-confirm` — destructive class without
  confirmation gating.

**Warnings:**

- No `fx-intent` AND no `fx-class` on a non-destructive method — agent
  cannot reason about purpose.
- Any localized `fx-class` value not in the v0.3 canonical taxonomy AND
  not produced by vocab resolution — likely localized-untranslated or
  app-specific (which is fine; warn so authors can register vocab).

**Info:**

- `fx-intent` set without `fx-class` — taxonomic grouping lost.
- Non-GET method without `fx-effects` — agent must guess at effects.
- Mutation-class action (`create`/`update`/`delete`) without `fx-effects`
  — agent cannot verify success beyond HTTP status.

Removed from v0.2's validator: reversibility checks (no longer in spec;
model recovery as a separate affordance with linked preconditions/
effects), authority checks (model as a precondition).

## What got removed (v0.2 → v0.3)

These v0.2 attributes do NOT survive into v0.3, because GRAIL provides
better primitives:

| v0.2 attribute        | Why removed                                                              |
|-----------------------|--------------------------------------------------------------------------|
| `fx-postcondition`    | Renamed to `fx-effects` to match GRAIL terminology                       |
| `fx-precondition`     | Renamed to `fx-preconditions` (plural — matches GRAIL array shape)       |
| `fx-reversible`       | Model recovery as a separate affordance. `restore-post` has precondition `post.soft-deleted` and effect `!post.soft-deleted` |
| `fx-undo`             | Same as above — the undo IS an affordance                                |
| `fx-authority`        | Model as a precondition (e.g. `user.role.admin`)                         |
| `fx-effect` (taxonomy)| GRAIL effects are condition names, not categories. Drop the server-state/client-state/external enum |

Pages using the v0.2 names will not work with the v0.3 reader. Since v0.2
was published only days ago and lived only in this repo, a clean break
is appropriate.

## Composition with other protocols

### GRAIL itself

This binding is GRAIL — restricted to the static-HTML use case. Pages
served by a real GRAIL backend get the dynamic capabilities (planning,
condition evaluation, drift detection, workspace mode) that static HTML
can't provide. The wire shapes line up:

- Static HTML + this binding + agent reader → GRAIL-compatible
  affordance JSON. No planner.
- HTTP backend + `grail-domains` Python → Siren+GRAIL JSON with full
  spec. Includes planner, condition evaluator, 409 responses with
  offered affordances.

A page served by both (GRAIL backend AND this binding on rendered
HTML) is redundant but not harmful. Agents typically prefer the
server-emitted Siren+GRAIL JSON when available.

### LSE (`@lokascript/intent`)

LSE describes the **structure** of an action — `(action, roles)` with
typed values. GRAIL describes the **constraints and effects** on an
action — preconditions, effects, cost, confirm. They compose:

```json
{
  "lse": {
    "action": "delete",
    "roles": {"patient": {"type": "selector", "value": "#post-123"}}
  },
  "grail": {
    "preconditions": ["post.exists", "user.role.owner"],
    "effects": ["post.soft-deleted"],
    "cost": 2,
    "confirm": "Soft-delete post 123?"
  }
}
```

A future version of this binding may emit combined LSE+GRAIL JSON;
deferred until a consumer needs it.

### Siren

`@lokascript/mcp-multilingual-intent` builds on `siren-mcp` from
`siren-grail`. Siren is the entity format; GRAIL extends Siren actions
with affordance fields; this binding maps those same fields into HTML
attributes for pages that aren't served as Siren JSON.

### ARIA, schema.org, OpenAPI

Same as before:

- **ARIA:** `aria-label` for human/screen-reader text; `fx-intent` for
  semantic identity.
- **schema.org / microdata:** resource metadata, complementary.
- **OpenAPI / function-calling schemas:** API-level descriptions; this
  binding is page-level / per-action.

## Open questions for v0.3 feedback

1. **Should the reader emit Siren+GRAIL JSON directly** (one Siren
   action per HTML action), instead of the custom action-graph shape?
   The Siren shape is more interoperable but more verbose; the current
   shape is more readable as-is.
2. **Should `fx-cost` accept units / labels** (`fx-cost="usd:0.05"`,
   `fx-cost="tokens:500"`) for agent budgeting, or stay plain integer
   like GRAIL?
3. **Should there be a `fx-preferred` attribute** mirroring GRAIL's
   `preferred` boolean for ranking equal-cost producers? Probably
   yes; held back from v0.3 only because the demo doesn't surface a
   use case.
4. **Is `fx-class` redundant** given that agents can derive a taxonomy
   from `fx-intent` (delete-post → delete) or from HTTP method? It's
   convenient but every redundancy is an inconsistency hazard.
5. **Should fixi-side extensions** (`fx-intent`, `fx-class`,
   `fx-subject`) be merged INTO GRAIL as part of an HTML binding
   appendix, or kept as fixi-only? This is the Path 3 question from
   the design conversation that produced v0.3 — left open for now.

## Changelog

- **v0.3 (2026-05-25):** rewrite to align with GRAIL v1.0.0
  terminology. Renamed `fx-postcondition`→`fx-effects` and
  `fx-precondition`→`fx-preconditions`. Removed `fx-reversible`,
  `fx-undo`, `fx-authority`, `fx-effect` (taxonomy) — these are
  representable via GRAIL primitives. Renamed file
  `AGENT_AFFORDANCES.md` → `GRAIL_HTML_BINDING.md`. Spec is now an
  HTML-attribute binding for GRAIL, not a parallel protocol.
- **v0.2.1 (2026-05-25):** added Relationship to LSE section
  (now folded into Composition).
- **v0.2 (2026-05-25):** postcondition format documented; page-level
  defaults via meta tag; validator rules codified; tool schema
  generation contract (canonical-only); app-specific intent
  registration pattern.
- **v0.1 (2026-05-25):** initial exploratory draft. 10 attributes in 4
  buckets.
