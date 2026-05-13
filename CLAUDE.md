# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

loka-js is a tiny patch (~110 bytes minified) to [fixi.js](https://github.com/bigskysoftware/fixi) that replaces 6 hardcoded `fx-*` attribute literals with 3 defaulted hooks on `window.fixi`. With those hooks, locale modules can register localized vocabulary and fixi resolves the right attribute name **at processing time** — no DOM mutation, no MutationObserver overhead, and per-element language selection (mixing `<section lang="es">` and `<section lang="ja">` on the same page).

Status: v0 — fixi-i18n only. moxi/ssexi/paxi/rexi support is deferred to v1.

When no locale module is loaded, the patched fixi.js is behaviorally identical to upstream (the `??=` defaults reproduce the original literals).

## Repository convention: flat root, no build step

This follows the fixi-family convention — single-file source at the repo root, no bundler, no compile step.

- [fixi.js](./fixi.js) — the patched fixi (single file)
- [orchestrator.js](./orchestrator.js) — installs `window.fixi.{name,event,sel,ignoreSel}` hooks; defines `window.loka.register`
- [locales/](./locales/) — 24 generated locale data files
- [scripts/](./scripts/) — locale generator + per-library vocab table
- [demo/](./demo/) — multi-language demos including the per-element-lang case
- [test/](./test/) — Playwright acceptance suite
- [upstream-patches/](./upstream-patches/) — diff artifact (`fixi.patch`) prepared for `git am` against bigskysoftware/fixi

Do not introduce a build step, dist directory, or package bundling. Edits to `fixi.js` must keep the patch surface small (the patch is meant to land upstream).

## Commands

```bash
# Regenerate locales/*.js from sibling-repo profiles + scripts/fx-vocab.mjs
npm run gen
node scripts/gen-locales.mjs --dry-run         # preview
node scripts/gen-locales.mjs --locale=es       # one locale

# Run the Playwright acceptance suite. Tests need a static server on :3002.
npx http-server . -p 3002 -c-1 -s &
npm test                                       # node test/loka-js.spec.mjs

# Behavior-preservation smoke test (patched fixi with NO orchestrator).
# Needs a static server on :3001.
npx http-server . -p 3001 -c-1 -s &
node test/preservation.mjs
```

The test script does not start its own server; start one before running.

## Architecture

### The 3-hook contract

`fixi.js` reads four hooks off `window.fixi`, defaulting them via `??=` if unset:

```js
window.fixi.name      = (elt, key) => `fx-${key}`     // attribute-name resolver
window.fixi.event     = (elt, value) => value         // trigger-value translator
window.fixi.sel       = (key) => `[fx-${key}]`        // discovery selector
window.fixi.ignoreSel = "[fx-ignore]"                 // ignore selector
```

Every attribute read in `fixi.js` now goes through `attr(elt, nm(elt, "action"))` instead of a literal `"fx-action"`. The hook receives the element so resolution can be per-element-context (e.g., walking up to the nearest `[lang]`).

### Load order (matters)

```html
<script src="./orchestrator.js"></script>   <!-- defines window.loka, pre-installs hooks -->
<script src="./locales/es.js"></script>     <!-- one or more; each calls window.loka.register -->
<script src="./fixi.js"></script>           <!-- reads window.fixi.* via ??= defaults -->
```

`orchestrator.js` must run **before** `fixi.js`, otherwise fixi installs its own no-op defaults and locale resolution silently won't happen. Locale files can load in any order between them.

### Per-element language resolution

[orchestrator.js](./orchestrator.js) `langOf(elt)` checks in order:

1. `data-loka-lang` on element or ancestor (explicit override)
2. `lang` on element or ancestor (HTML standard — e.g. `<html lang>` or `<section lang>`)
3. Falls back to `"en"`

This is the key capability that the preprocessor-based predecessor [dixi](https://github.com/codetalcott/hyperfixi/tree/main/experiments/dixi) cannot do: dixi commits to one language at DOM-walk time. loka resolves at attribute-read time per-element.

### Selector building

`fx.sel(key)` returns a CSS selector list that unions the canonical name with every localized form registered so far: e.g. for `action` with `es` and `ja` loaded → `[fx-action], [fx-acción], [fx-アクション]`. This is computed fresh on every call because it reads `REG` live, so new locales registered later are picked up without rebinding.

`fx.ignoreSel`, by contrast, is a string captured by fixi at load time, so `window.loka.register` refreshes it after each registration in case the locale added a localized `fx-ignore`.

## Locale generation

`locales/*.js` are **auto-generated**. Do not hand-edit them. Each file's header points to its source.

Inputs:

- [scripts/fx-vocab.mjs](./scripts/fx-vocab.mjs) — `LOCALES` table: per-locale `profile` name, `name`, `reviewed` flag, and per-library sub-objects (`fixi.attrs` and optional `fixi.events`). To suggest corrections, edit this and regenerate.
- `../hyperfixi/packages/semantic/src/generators/profiles/{profile}.ts` — **sibling-checkout dependency**. The generator reads event-name vocabulary from the `@lokascript/semantic` profile in the hyperfixi repo (expected at `~/projects/hyperfixi`). If hyperfixi isn't checked out as a sibling, the generator skips locales that need a profile.

Output shape per locale:

```js
window.loka.register('es', {
  fixi: {
    attrs: { 'fx-acción': 'fx-action', ... },   // localized -> canonical
    events: { 'clic': 'click', ... },            // localized -> canonical
  },
});
```

Reviewed locales (native-speaker reviewed for fixi attrs): `es`, `ja`, `ar`. Others have a warning banner and are best-effort.

## Test phases

The acceptance suite ([test/loka-js.spec.mjs](./test/loka-js.spec.mjs)) has four phases:

- **A** — M2 button demo across Latin/CJK/RTL, dynamic injection
- **B** — M2.5 search demo per locale (`en/es/ja/ar`); verifies that moxi handlers remain canonical English (moxi is not yet patched in v0) while fixi attrs are localized
- **C** — Per-element language, the dixi-impossible case
- **D** — Devtools faithfulness: confirms localized attribute names are **still present** in DOM (no mutation happened) and that `window.fixi.name(elt, 'action')` returns the expected localized name

Key invariant the tests enforce: **attributes are never rewritten**. `fx-acción` stays `fx-acción` in devtools; fixi resolves it via the hook.

## Upstream patch discipline

The patch in [upstream-patches/fixi.patch](./upstream-patches/fixi.patch) is meant to land in bigskysoftware/fixi as the canonical version. Keep changes to `fixi.js` minimal and faithful to the existing style (single-IIFE, `??=` defaults, short var names like `nm`, `ev`, `sl`). Behavior must remain bit-identical to upstream when no orchestrator is loaded.

## Parent CLAUDE.md

Inherits from [`../CLAUDE.md`](../CLAUDE.md) (the `~/projects/` cross-portfolio guide). Loka-js relates to the broader fixi-family / dixi / hyperfixi ecosystem cataloged there.
