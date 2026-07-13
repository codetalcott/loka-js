# reference-patches/

These `.patch` files show the diff between loka-js's patched copies of
`fixi.js`, `moxi.js`, and `paxi.js` (at the repo root) and their
upstream `bigskysoftware/{fixi,moxi,paxi}` counterparts at the based-on
commits.

**They are documentation, not PR submissions.** loka-js is an alternate
distribution of the fixiproject family — we ship the patched copies
directly. fixiproject is deliberately minimalist (1.8–3.5 KB per
library) and the hook overhead is a tax that English-fluent users
shouldn't pay for a feature only non-English authors use. Localized
authoring vocabulary is a parallel-distribution concern, not a
core-library concern.

## Standalone behavior: English-only by design

When `window.{fixi,moxi,paxi}` is unset, the `??=` defaults reproduce the
upstream literals exactly — verified by [`test/preservation.mjs`](../test/preservation.mjs).
That contract has a corollary worth stating for anyone vendoring a raw
patched library *without* loka's `loka.js`:

> A patched library's **DOM-discovery default is English-only** and does not
> derive from the per-element `name` hook. `fixi`'s `sel(key)` → `[fx-${key}]`,
> `moxi`'s `xpath()` → `@live`/`on-`, and `paxi`'s `isSwap(s)` → `s==="morph"`
> each receive a key/string, not an element, so they cannot consult a
> per-element `name(elt,key)` resolver.

So setting only a localized `name` hook on a raw library, without the
orchestrator's combined union hooks, makes the scanner keep matching the
English tokens and **silently miss localized elements**. Localization is the
[orchestrator](../loka.js)'s job (it installs combined scan hooks that
union every registered locale); the patched libraries are intentionally
English-only standalone. Don't "fix" a raw default to derive from `name` — it
can't, because loka's `name` is per-element while these hooks are
document-level.

## What these files are useful for

- **Tracking drift.** When upstream changes, the patch shows what
  needs re-porting against the new HEAD.
- **Audit / explanation.** A curious contributor can see exactly what
  loka-js modifies and why.
- **Hand-delivery.** In the unlikely event a maintainer wants the
  hooks upstream, the patch is ready to apply against the based-on
  commit (placeholder SHAs `0000...` would need regenerating from a
  real clone).

## Based-on commits

- `fixi.patch`  → bigskysoftware/fixi  (see patch header)
- `paxi.patch`  → bigskysoftware/paxi@c9b194e
- `moxi.patch`  → bigskysoftware/moxi@6760e60

## What's NOT in this directory

ssexi and rexi don't need patching. ssexi is localized via listener-side
event re-fire from `loka.js`; rexi via `loka.alias()` global
aliasing. The pattern's principle: patch only when no external mechanism
can reach the surface.
