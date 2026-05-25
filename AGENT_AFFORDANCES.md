# Agent affordance vocabulary for fixi-family pages

**Status:** v0.2 — informed by live-testing v0.1 against a reference reader
([tools/agent-reader.mjs](tools/agent-reader.mjs)) and bilingual demo pages
([demo/agent-demo/](demo/agent-demo/)). Still pre-v1.0 and subject to
change; feedback welcome at
<https://github.com/codetalcott/loka-js/issues>.

**Changes since v0.1:**

- Postcondition format conventions documented (selector vs token by
  leading character)
- Page-level defaults via `<meta name="fx-affordances">`
- Validator rule list codified (the reader's checks become part of the spec)
- Tool schema generation contract: canonical names only, suspect-localized
  intents dropped with warnings
- App-specific intent registration pattern (workaround for free-form
  intent vocabulary)
- Open questions 1, 4, 5 resolved; question 3 deferred to v0.3; question 2
  resolved tentatively (no multi-value `fx-class` until a real use case
  surfaces).

A small set of HTML attributes that sit alongside the fixi family
(`fx-action`, `fx-method`, `fx-target`, ...) and describe what an action
*means*, not just what it *does mechanically*. fixi-family libraries
ignore every attribute defined here — they are read only by downstream
consumers: LLM agents that navigate or operate the page, dev overlays,
auditors, and any other tool that needs semantic context beyond the HTTP
call shape.

## Motivation

A fixi button tells you:

```html
<button fx-action="/posts/123" fx-method="DELETE" fx-target="#feed" fx-swap="morph">
  Delete
</button>
```

…how to issue the request, where to put the response, and how to merge
it. It does NOT tell you:

- That this is a **delete** in the semantic sense (vs. a hide/archive)
- That it **mutates server state** and is **not idempotent**
- That it **requires human approval** because it's destructive
- That there's a **reverse action** at `/posts/123/restore` if it goes
  wrong
- What state should be true **after** the action succeeds, so a caller
  can verify

For a human user, the button text "Delete" carries all of this through
shared cultural context. For an LLM agent — or a tester, or an auditor —
that context is invisible. This spec defines the smallest vocabulary
that closes the gap.

## Design principles

1. **Additive.** No fixi-family library is modified. Every attribute in
   this spec is invisible to fixi, moxi, paxi, ssexi, and rexi. Pages
   without these attributes still work; pages with them still work in
   any fixi version.
2. **Colocated.** Affordance metadata lives on the same element that
   performs the action. No out-of-band JSON descriptor, no separate
   manifest, no server roundtrip to enumerate.
3. **Minimal.** v0.1 defines 10 attributes. Future versions may add
   more, but the goal is "tweet-sized vocabulary," not "OpenAPI."
4. **Localizable.** Every value is a string an author writes, so
   localizable through the same machinery loka-js applies to fixi
   attributes. See [Localization](#localization).
5. **Composable with existing standards.** This spec doesn't replace
   schema.org microdata, ARIA, or Siren — it complements them at the
   element level for actions specifically.

## Scope

**In scope:** describing actions (buttons, links, forms, anything fixi
attaches behavior to) such that an agent can plan, gate, execute, and
verify them safely.

**Out of scope:**

- Resource-level metadata (use schema.org / microdata)
- Authentication mechanisms (this spec records *that* auth is required
  via `fx-authority`, not *how* to obtain it)
- Visual / interaction concerns (focus management, animations, ARIA
  roles — those have their own standards)
- Transaction protocols (multi-action atomic execution; could come in a
  later version via `fx-flow`)
- Real-time / streaming concerns (ssexi handles mechanics; this spec
  describes the request, not the stream)

## Core attributes (v0.1)

Ten attributes, grouped by concern.

### Identity

#### `fx-intent`

**Purpose:** Semantic name of the action. The thing a human or agent
would say to refer to this action ("delete this post," "open the
editor").

**Value:** A short token or hyphenated identifier. Lowercase
convention. Localizable.

**Default:** Unspecified. If absent, agents may infer intent from button
text and `fx-method`, but with lower confidence.

**Example:** `fx-intent="delete-post"`, `fx-intent="open-editor"`,
`fx-intent="submit-comment"`.

#### `fx-subject`

**Purpose:** The entity or resource this action operates on. Lets an
agent group actions by what they affect.

**Value:** A URN-like identifier or human-readable resource reference.

**Default:** Unspecified. If absent, agents may parse `fx-action` to
guess.

**Example:** `fx-subject="post:123"`, `fx-subject="user:current"`,
`fx-subject="cart"`.

### Classification

#### `fx-class`

**Purpose:** Taxonomy of the action. Lets an agent match goals
("find all delete actions on this page") without reading every intent.

**Value:** One of: `read`, `create`, `update`, `delete`, `navigate`,
`search`, `toggle`, `open`, `close`. Application-specific values are
allowed; agents should treat unknown values as `unspecified`.

**Default:** Unspecified. Agents may infer from `fx-method` (GET → read,
POST → create, etc.) but the inference is lossy.

**Example:** `fx-class="delete"`.

### Side effects

#### `fx-effect`

**Purpose:** What kind of state the action changes. Lets an agent reason
about safety and retry.

**Value:** One of: `none` (pure read), `client-state` (only DOM/JS
state), `server-state` (server mutation), `external` (third-party effect
— payment, email, webhook). Multiple values space-separated.

**Default:** Unspecified. Agents should assume `server-state` for any
non-GET method and `client-state` for GET-with-swap.

**Example:** `fx-effect="server-state"`,
`fx-effect="server-state external"` (mutates DB *and* sends an email).

### Safety

#### `fx-confirm`

**Purpose:** What confirmation must occur before this action runs.
Critical for agents that need to defer to humans on destructive
operations.

**Value:** One of: `none`, `soft` (UI confirm dialog acceptable),
`human-approval` (an agent MUST defer to a human; non-bypassable),
`reauth` (requires re-authentication first).

**Default:** `none` unless `fx-class="delete"` or `fx-effect` contains
`external`, in which case agents should treat absence as `soft`.

**Example:** `fx-confirm="human-approval"`.

#### `fx-authority`

**Purpose:** What permission level the actor must have. Helps an agent
recognize when an action requires elevated identity.

**Value:** A free-form role/permission label. Conventional values:
`anonymous`, `authenticated`, `owner`, `admin`. Application-specific
roles allowed.

**Default:** Unspecified (treated as `authenticated`).

**Example:** `fx-authority="owner"`.

### Reversibility

#### `fx-reversible`

**Purpose:** Whether and how this action can be undone.

**Value:** One of: `no`, `soft` (a reverse action exists; see
`fx-undo`), `hard` (recoverable only via backup/restore), `time-window`
(reversible within a stated period).

**Default:** Unspecified. Agents should assume `no` for `fx-class="delete"` absent any signal.

**Example:** `fx-reversible="soft"`.

#### `fx-undo`

**Purpose:** A pointer to the reverse action. If `fx-reversible="soft"`,
this attribute should be present.

**Value:** A URL (preferred) or CSS selector pointing to the undo
affordance.

**Default:** Unspecified.

**Example:** `fx-undo="/posts/123/restore"`.

### Verification

#### `fx-precondition`

**Purpose:** What must be true before this action makes sense. Lets an
agent skip impossible actions and lets dev tools catch missing setup.

**Value:** A token (e.g., `post-exists`), a CSS selector for an element
that must exist, or a space-separated list.

**Default:** Unspecified.

**Example:** `fx-precondition="user-authenticated post-exists"`.

#### `fx-postcondition`

**Purpose:** What should be true after the action succeeds. Lets an
agent verify completion rather than trusting an HTTP 200.

**Value:** Same shape as `fx-precondition`. CSS selector that should
exist (or NOT exist — prefix with `!`), a named token, or a space-
separated list.

**Default:** Unspecified.

**Example:** `fx-postcondition="!#post-123 #feed-updated-toast"` (post
element gone, success toast present).

#### Pre/postcondition value format (v0.2)

Values in `fx-precondition` and `fx-postcondition` are space-separated
tokens. Each token is disambiguated by its leading character:

| Leading char | Type               | Interpretation                                                       |
|--------------|--------------------|----------------------------------------------------------------------|
| `#`          | id selector        | `document.querySelector('#x')` must exist                            |
| `.`          | class selector     | at least one element of that class must exist                        |
| `[`          | attribute selector | e.g., `[aria-busy="false"]`                                          |
| `!`          | negation prefix    | apply to the next token; the selector must NOT match                 |
| (other)      | named token        | semantic identifier; verification by application convention          |

Example: `fx-postcondition="!#post-123 #feed-updated-toast user-authenticated"`
means "the `#post-123` element must NOT exist, the `#feed-updated-toast`
element must exist, and the `user-authenticated` token-level condition
must hold." Token interpretation is application-specific (an agent
verifies tokens against an out-of-band predicate registry, or treats
them as advisory).

The reader returns the raw value; consumers interpret. The reference
reader does not perform postcondition verification itself.

## Page-level defaults (v0.2)

A `<meta name="fx-affordances">` element declares values that apply to
every action on the page when the per-action attribute is absent.

```html
<meta name="fx-affordances" content="default-authority:authenticated, default-confirm:soft">
```

Recognized keys (v0.2): `default-confirm`, `default-authority`,
`default-reversible`. Each is the unprefixed name of an affordance
attribute. Per-action attributes override; the default only fills the
gap.

Defaults pass through locale resolution like any other affordance value
— a Spanish page may write
`<meta name="fx-affordances" content="default-confirm:suave">` and the
reader resolves `suave` → `soft` via the locale vocab.

Future versions may extend to additional defaults (`default-effect`,
`default-class`) once use cases warrant.

## Worked example

```html
<head>
  <meta name="fx-affordances" content="default-authority:authenticated, default-confirm:soft">
</head>

<button
  fx-action="/posts/123"
  fx-method="DELETE"
  fx-target="#feed"
  fx-swap="morph"

  fx-intent="delete-post"
  fx-subject="post:123"
  fx-class="delete"
  fx-effect="server-state"
  fx-confirm="human-approval"
  fx-authority="owner"
  fx-reversible="soft"
  fx-undo="/posts/123/restore"
  fx-precondition="#post-123"
  fx-postcondition="!#post-123">
  Delete
</button>
```

What an LLM agent can derive from this without clicking:

- "This deletes post 123 from the server, requires owner authority and
  human approval, can be undone within a soft window at
  `/posts/123/restore`, and I can verify success by checking that
  `#post-123` is no longer in the DOM afterward."

What a static analyzer / dev overlay can derive:

- "Any link to this page should ensure post 123 exists in the DOM
  (precondition); after this action runs, the `#feed-updated-toast`
  invariant should be true (postcondition)."

## Localization

Affordance attribute *values* are author-written strings — so they're
localizable through the same hook contract loka-js applies to fixi.
Spanish:

```html
<button
  fx-acción="/posts/123"
  fx-método="DELETE"
  fx-objetivo="#feed"
  fx-intercambio="morfar"

  fx-intent="borrar-post"
  fx-class="borrar"
  fx-confirm="aprobación-humana"
  fx-reversible="suave"
  fx-undo="/posts/123/restaurar">
  Borrar
</button>
```

Agents reading this page should resolve values to canonical English
through a vocabulary lookup keyed on the page's `lang` (the same
mechanism loka uses for fixi attributes — see
[orchestrator.js](orchestrator.js)). Locale modules registering
affordance vocabulary look like:

```js
window.loka.register('es', {
  // ... existing fixi/moxi/paxi/rexi blocks ...
  affordances: {
    intents:  { 'borrar-post': 'delete-post', ... },
    classes:  { borrar: 'delete', crear: 'create', ... },
    confirms: { 'aprobación-humana': 'human-approval', ... },
    reversibilities: { suave: 'soft', duro: 'hard', ... },
    authorities: { dueño: 'owner', admin: 'admin', ... },
  },
});
```

`fx-undo`, `fx-precondition`, `fx-postcondition` carry URLs or selector
strings — same shape as fixi values; localization typically doesn't
apply.

A reference vocabulary block for `es` lives in
[scripts/fx-vocab.mjs](scripts/fx-vocab.mjs) as of v0.2.

### App-specific intents (v0.2 workaround)

`fx-intent` values are free-form by design — applications coin their own
(`delete-post`, `submit-feedback-form`, `archive-thread`). Locale modules
can pre-translate common intents (`delete-post` ↔ `borrar-post`) but
cannot cover every application's vocabulary.

For app-specific intents on a non-English page, the locale module should
register the app's intent vocabulary as additional entries:

```js
// In your app's bootstrap, after loading the loka locale module:
window.loka.register('es', {
  affordances: {
    intents: {
      'enumerar-posts': 'list-posts',
      'archivar-hilo':  'archive-thread',
      // ...
    },
  },
});
```

`register` merges into the existing es block, so this layers on top of
the loka-provided base vocabulary. Without registration, app-specific
intents on non-en pages stay localized in the reader output and are
dropped from generated tool schemas (with a warning) — see [Tool schema
contract](#tool-schema-contract) below.

## Agent reader pattern

A minimum-viable consumer (pseudocode):

```js
function readAffordances(rootElt) {
  let lang = langOf(rootElt)                 // same resolver loka uses
  let vocab = REG[lang]?.affordances ?? {}
  let resolve = (table, val) => vocab[table]?.[val] ?? val

  let actions = []
  for (let el of rootElt.querySelectorAll('[fx-action]')) {
    let canonical = (attr) => resolve(attr.replace('fx-', '') + 's', el.getAttribute(attr))
    actions.push({
      element: el,
      label: el.textContent.trim(),
      mechanics: {
        url: el.getAttribute(nm(el, 'action')),
        method: el.getAttribute(nm(el, 'method')) ?? 'GET',
        target: el.getAttribute(nm(el, 'target')),
      },
      affordance: {
        intent:        canonical('fx-intent'),
        subject:       el.getAttribute('fx-subject'),
        class:         canonical('fx-class'),
        effect:        el.getAttribute('fx-effect')?.split(/\s+/),
        confirm:       canonical('fx-confirm') ?? 'none',
        authority:     canonical('fx-authority') ?? 'authenticated',
        reversible:    canonical('fx-reversible') ?? 'no',
        undo:          el.getAttribute('fx-undo'),
        precondition:  el.getAttribute('fx-precondition'),
        postcondition: el.getAttribute('fx-postcondition'),
      },
    })
  }
  return actions
}
```

Returning a JSON action graph an LLM can ingest as tool schema. The
reference implementation lives at
[tools/agent-reader.mjs](tools/agent-reader.mjs) and provides three
exports: `readAffordances(root)`, `validate(actions)`, and
`toAnthropicSchema(actions)`.

## Validator rules (v0.2)

The reference reader's `validate(actions)` returns issues with three
severities. These rules ARE part of the spec:

**Errors** (an agent should NOT execute the action without human
intervention):

- Mechanical method ∈ `{DELETE, PUT, POST, PATCH}` AND no `fx-intent` /
  `fx-class` — destructive call with no safety metadata.
- `fx-class="delete"` AND no `fx-confirm` — destructive class without
  confirmation gating.
- `fx-effect` contains `external` AND no `fx-confirm` — external side
  effects should always require confirmation.
- `fx-reversible="soft"` AND no `fx-undo` — broken contract.

**Warnings** (the action is processable but agent reasoning is
constrained):

- No `fx-intent` AND no `fx-class` on a non-destructive method — agent
  cannot reason about purpose.
- `fx-reversible="no"` AND `fx-undo` is set — contradictory.
- Any enum-shape value (`fx-class`, `fx-confirm`, `fx-reversible`,
  `fx-authority`, `fx-effect` tokens) that is non-null and not in the
  v0.2 canonical vocabulary AND not produced by vocab resolution —
  likely a localized-untranslated value, a typo, or an application-
  specific extension.

**Info** (everything is fine; the message is a hint):

- `fx-intent` set without `fx-class` — taxonomic grouping lost.
- Non-GET method without `fx-effect` — agent must guess at server-state
  mutation.
- Mutation-class action (`create`/`update`/`delete`) without
  `fx-postcondition` — agent cannot verify success beyond HTTP status.

## Tool schema contract

`toAnthropicSchema(actions)` returns `{tools, warnings}`:

- Each `tool` has a canonical English `name` (the resolved `fx-intent`
  value, or `<class>-<id>` fallback) plus a description built from the
  affordance metadata.
- Actions whose intent is **suspect-localized** (page lang ≠ en AND
  intent did not resolve through vocab) are **dropped from the schema**
  and listed in `warnings` with the reason.

The reason for dropping: tool names must be stable across page
languages. If an agent is told "call the `delete-post` tool" and the
page has only `borrar-post` (no vocab entry), there's no way for the
agent to know they're the same thing. Better to surface "register your
app's intents in vocab" than to ship inconsistent tool names.

## What's deliberately deferred to v0.2+

- **`fx-cost`** — rough resource cost (time, money, tokens). Useful for
  agent planning but the value space needs work (units? buckets?).
- **`fx-flow`** — multi-step flow membership ("this is step 2 of
  checkout"). Needs design for what state a flow carries.
- **`fx-rel`** — Siren-style relation to current resource (`self`,
  `next`, `parent`, `item`). Probably worth adding; held back to keep
  v0.1 to 10 attributes.
- **`fx-affords`** — capability-style verb list (`"share read export"`).
  Overlaps with `fx-intent`; needs use case before adding.
- **`fx-rate-limit`** — server-stated rate limit. Important for
  agent-driven traffic but probably belongs at the resource level
  (response header) rather than per-action.
- **`fx-description`** — longer prose description for agents. Useful but
  may belong in ARIA (`aria-description`) or schema.org.
- **`fx-success`** / **`fx-failure`** — finer-grained verification than
  `fx-postcondition`. May fold in once we have agent reader feedback.

## Composition with existing standards

- **ARIA:** Use `aria-label` for human/screen-reader-facing text;
  `fx-intent` is for semantic identity. They serve different consumers.
  An element should still have proper ARIA even when affordance attrs
  are present.
- **schema.org / microdata:** Use for *resource* metadata (the post,
  the user, the product). Use this spec for *action* metadata. They
  layer cleanly.
- **Siren:** Server-side affordance protocol (separate JSON document).
  This spec is the client-side analog — the page IS the affordance
  manifest. Sites using both should keep the vocabularies aligned (e.g.,
  Siren's `class` ↔ this spec's `fx-class`).
- **OpenAPI / function-calling schemas:** Used to describe an API in
  bulk. This spec describes individual page-level actions; an agent that
  has both would prefer OpenAPI for "what can I call?" and this spec for
  "what does this specific button do?"

## Versioning

This spec is v0.1. Breaking changes are expected before v1.0.

When the vocabulary stabilizes:

- v1.0 will freeze the 10 core attribute names and their value
  semantics.
- New attributes added post-v1.0 will be additive only.
- Value enums may grow but not shrink.
- The localization mapping (locale module shape) will be frozen with
  v1.0.

## Resolved open questions (from v0.1)

**Q1 → resolved: NO, keep both.** Live-testing showed `fx-class`
(taxonomy) and `fx-intent` (specific identifier) serve different
consumers. The validator's most useful rule (`class=delete without
confirm`) requires the taxonomy. Reducing to intent alone would lose
that.

**Q2 → resolved tentatively: NO multi-value `fx-class` for now.** Demo
pages didn't produce a single example where multi-value `fx-class` was
the right shape. If a future case (an action that's "both create and
update") surfaces, we'll revisit; until then, prefer two affordances
on two elements.

**Q3 → deferred to v0.3.** Page-level *defaults* are in v0.2 (see
[Page-level defaults](#page-level-defaults-v02)); page-level
*requirements* — e.g., "no agent may act on this page without human
approval" — are a different concern (governance, not affordance
declaration) and need more design.

**Q4 → resolved: BOTH, disambiguated by leading character.** See
[Pre/postcondition value format](#prepostcondition-value-format-v02).

**Q5 → resolved: keep `fx-` prefix.** No conflicts surfaced during live
test. Colocation in `fx-*` attributes is conceptually clean ("all
action metadata lives in fx-* attributes, libraries pick what they
read"). A separate `aff-` namespace would require a parallel
localization path and break the simple story.

## Open questions for v0.2 feedback

1. **Should the reader perform `fx-postcondition` verification itself**,
   or always defer to the consumer? Today it's purely descriptive; a
   future version could provide `verify(action)` that checks selectors
   are in/out of DOM after a swap.
2. **Is the "drop suspect-localized intents from the schema" policy too
   strict?** An alternative: emit the localized name and a warning,
   let the consumer decide. The cost: schemas become inconsistent
   across page languages.
3. **Should `fx-cost` land in v0.3?** It's listed in deferred. Agent
   planning under resource constraints would benefit; the value space
   needs work (buckets vs units).
4. **Should there be a `fx-batch` for atomic multi-step actions?** Real
   apps often need "do A and B together or neither." Currently
   undefined.
5. **Is there a place for `fx-rationale`** — a short prose explanation
   the agent can surface to a human ("why am I asking to delete
   this?")? Different from `fx-description` (what the action is) — this
   is "why it's being offered."

Feedback on any of these welcome.

## Changelog

- **v0.2 (2026-05-25):** postcondition format documented; page-level
  defaults via meta tag; validator rules codified; tool schema
  generation contract (canonical-only); app-specific intent
  registration pattern; resolved v0.1 questions 1, 2, 4, 5; deferred
  question 3.
- **v0.1 (2026-05-25):** initial exploratory draft. 10 attributes in 4
  buckets. Reference reader + bilingual demos.
