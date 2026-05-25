# Agent affordance vocabulary for fixi-family pages

**Status:** v0.1 — exploratory draft. The vocabulary is small and intended
to grow with use. Nothing here is binding; feedback welcome at
https://github.com/codetalcott/loka-js/issues.

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

## Worked example

```html
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

A reference vocabulary block for `es` should land in
`scripts/fx-vocab.mjs` once the spec stabilizes.

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

Returning a JSON action graph an LLM can ingest as tool schema. A
reference implementation will live at `tools/agent-reader.mjs` (TBD).

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

## Open questions for v0.1 feedback

1. Is `fx-class` (taxonomy) duplicative with `fx-intent` (specific
   name)? Could one suffice?
2. `fx-effect` allows multiple values (`"server-state external"`).
   Should `fx-class` too?
3. Should `fx-confirm="human-approval"` be an attribute or a separate
   global flag (page-level: "no agent may act on this page without
   approval")?
4. Is `fx-postcondition` better expressed as CSS selectors or as a
   token vocabulary? Selectors are precise but brittle; tokens require
   server/client agreement.
5. Should affordance attributes use a separate namespace prefix
   (e.g., `aff-intent` instead of `fx-intent`) to make clear they're
   not part of fixi proper?

Feedback on any of these welcome.
