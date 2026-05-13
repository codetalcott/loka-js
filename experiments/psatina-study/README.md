# psatina-study

A study demonstrating that registry-based localization works on **canonical [psatina](https://codeberg.org/dz4k/psatina)** today, with no fork required.

> The relevant change is upstream: [Deniz Akşimşek's psatina](https://codeberg.org/dz4k/psatina) exports the `templateDirectives` Map ([`lib/psatina.ts:23`](https://codeberg.org/dz4k/psatina/src/branch/main/lib/psatina.ts#L23)), so anyone can register additional directives without modifying the core. This study is a thin Spanish locale module on top of canonical source — not a refactor, not a fork, not a competing distribution. **The right next step for actual users is to use canonical psatina from codeberg.**

## What's in `lib/`

TypeScript-stripped copies of canonical psatina source from codeberg. No semantic changes; the file structure mirrors codeberg exactly. Built-in directives (`for`, `if`, `on`, `set`, `init`, `ref`, `data`) and auto-init for `<template p:data>` stay registered — canonical psatina, untouched.

| File | Source |
| --- | --- |
| [lib/common.js](lib/common.js) | [common.ts](https://codeberg.org/dz4k/psatina/src/branch/main/lib/common.ts) |
| [lib/noderange.js](lib/noderange.js) | [noderange.ts](https://codeberg.org/dz4k/psatina/src/branch/main/lib/noderange.ts) |
| [lib/morph.js](lib/morph.js) | [morph.ts](https://codeberg.org/dz4k/psatina/src/branch/main/lib/morph.ts) |
| [lib/render.js](lib/render.js) | [render.ts](https://codeberg.org/dz4k/psatina/src/branch/main/lib/render.ts) |
| [lib/psatina.js](lib/psatina.js) | [psatina.ts](https://codeberg.org/dz4k/psatina/src/branch/main/lib/psatina.ts) |

Each file carries a provenance header pointing at the canonical version.

## What the Spanish locale module does

[`lib/locales/es.js`](lib/locales/es.js) (~40 lines) does exactly two things:

1. Calls `templateDirectives.set('si', …)`, `set('para', …)`, etc., adding Spanish-named directives to the canonical Map. Canonical's English directives stay registered — both work simultaneously.
2. Scans for `<template p:datos>` (the Spanish entry directive) and calls `psatina(t, …)` directly, since canonical's auto-init only handles `<template p:data>`.

DOM-keyword vocabulary (`clic → click`, `valor → value`, etc.) is imported from [`loka-js/dom-vocab/es.js`](../../dom-vocab/es.js) — the same source loka-js (fixi) uses. Single source of truth across both libraries.

## English

There is no `locales/en.js`. **Canonical psatina IS the English experience** — `<script type="module" src="../lib/psatina.js"></script>` is enough; built-ins and auto-init for `template[p:data]` work as upstream documents.

## Running the demos

```bash
cd ~/projects/loka-js
python3 -m http.server 8000
# English: http://localhost:8000/experiments/psatina-study/demo/index.html
# Spanish: http://localhost:8000/experiments/psatina-study/demo/es.html
```

The Spanish page renders identical UI from Spanish-named directives. Devtools shows `p:datos`, `p:para:`, `p:en:entrada` in the source HTML — the canonical Map is consulted by directive name at render time; nothing is mutated.

## Joint demo with loka-js (fixi)

[`loka-js/demo/joint-fixi-psatina/`](../../demo/joint-fixi-psatina/) combines this study with loka-js's patched fixi. One Spanish page where `fx-acción` (loka-js fixi) and `p:datos` / `p:en:entrada` (psatina-study) coexist; a rescan bridge re-inits psatina templates that arrive via fixi swaps. Both libraries share `dom-vocab/es.js`.

## Cross-references

- **Canonical psatina:** <https://codeberg.org/dz4k/psatina> (MIT, Deniz Akşimşek). Use this for real projects.
- **loka-js:** [`../../README.md`](../../README.md) — the parallel registry-based-localization study for fixi.
- **The translation-layer alternative:** `~/projects/lac/lib/dixi-p.js` — what this approach is the contrast to.

## License

MIT, matching canonical psatina. The vendored engine code is copyright Deniz Akşimşek; the locale module and the type-stripping are MIT additions from this repo.
