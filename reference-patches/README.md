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
event re-fire from `orchestrator.js`; rexi via `loka.alias()` global
aliasing. The pattern's principle: patch only when no external mechanism
can reach the surface.
