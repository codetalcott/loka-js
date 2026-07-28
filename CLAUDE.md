# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

loka-js applies a hook-contract pattern to the [fixiproject family](https://fixiproject.org/) (fixi, moxi, ssexi, paxi, rexi) so locale modules can register localized authoring vocabulary that each library resolves at processing time — no DOM mutation, no MutationObserver overhead, per-element language via `lang` ancestor.

Status: **v1** — all five fixiproject libraries supported. fixi/moxi/paxi are patched (small hook contracts; faithful to upstream style for fork hygiene, not because we're pursuing upstream merges — see "Patch discipline" below); ssexi and rexi need no patch (localized from the orchestrator via event re-fire and global aliasing).

When no locale module is loaded, every patched library is behaviorally identical to upstream (the `??=` defaults reproduce the original literals).

## Repository convention: flat root, no build step

Single-file sources at the repo root, no bundler, no compile step.

- [fixi.js](./fixi.js), [moxi.js](./moxi.js), [paxi.js](./paxi.js) — patched libraries (each a single file)
- [ssexi.js](./ssexi.js), [rexi.js](./rexi.js) — verbatim upstream copies (no patches; localized from outside)
- [loka.js](./loka.js) — installs hooks on all five libraries; defines `window.loka.register` and `window.loka.alias`
- [locales/](./locales/) — 24 generated locale data files (each calls `window.loka.register`)
- [scripts/](./scripts/) — locale generator + per-library vocab table
- [demo/](./demo/) — multi-language demos including per-element-lang, `joint-all` (all 5 libs on one Spanish page), and `eventos` (the expanded event vocabulary)
- [tutorial/](./tutorial/) — Spanish per-library tutorial pages mirroring fixiproject.org examples
- [test/](./test/) — Playwright acceptance suite (9 phases) + behavior-preservation harness
- [reference-patches/](./reference-patches/) — diff artifacts (`fixi.patch`, `moxi.patch`, `paxi.patch`) showing what our patched copies differ from upstream; kept as documentation of the fork, not PR submissions

Do not introduce a build step, dist directory, or package bundling. Edits to patched library files should keep their patch surface small — not because the patches are headed upstream, but because small surface area minimizes drift when we re-port against upstream changes.

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

### Per-library hook contracts

```js
// fixi (patched)
window.fixi.name      = (elt, key) => `fx-${key}`     // attribute-name resolver
window.fixi.event     = (elt, value) => value         // trigger-value translator
window.fixi.sel       = (key) => `[fx-${key}]`        // discovery selector
window.fixi.ignoreSel = "[fx-ignore]"                 // ignore selector

// moxi (patched)
window.moxi.name      = (elt, key) => key             // resolves "live" / "on-" / "mx-ignore"
window.moxi.event     = (elt, val) => val             // event-name after on- prefix
window.moxi.modifier  = (mod) => mod                  // dotted modifiers (.prevent, .once, ...)
window.moxi.ignoreSel = "[mx-ignore]"
window.moxi.xpath     = () => "descendant-or-self::*[@live or @*[starts-with(name(),'on-')]]"

// paxi (patched)
window.paxi.isSwap    = (s) => s === "morph"          // recognize localized morph aliases

// ssexi (NO patch) — orchestrator listens for fx:sse:<canonical> and re-fires
//                    fx:sse:<localized> on the same target.
// rexi  (NO patch) — orchestrator aliases globals via window.loka.alias({obtener:'get', ...})
```

Per-element hooks receive the element so resolution can walk up to the nearest `[lang]`. Document-level hooks (`fixi.sel`, `moxi.xpath`, `paxi.isSwap`, `moxi.ignoreSel`) read the registry union of all locales.

**Localization requires the orchestrator — the raw libs are English-only standalone.** The `sel`/`xpath`/`isSwap` *defaults* hardcode the English tokens and do **not** derive from the `name` hook (they get a key/string, not an element, so they can't drive a document-level scan from a per-element resolver). This is deliberate: it's what keeps the raw libs bit-identical to upstream when no locale is loaded (`test/preservation.mjs`). The consequence — setting a localized `name` on a raw lib *without* the orchestrator's combined scan hooks makes the scanner miss every localized element — is documented in the `loka.js` header and [reference-patches/README.md](./reference-patches/README.md). Don't "fix" a raw default to derive from `name`; the combined-union hook the orchestrator installs is the correct answer for the per-element model.

### Load order (matters)

```html
<script src="./loka.js"></script>   <!-- defines window.loka, pre-installs hooks on every library namespace -->
<script src="./locales/es.js"></script>     <!-- one or more; each calls window.loka.register -->
<script src="./moxi.js"></script>           <!-- moxi must precede fixi (fixiproject convention) -->
<script src="./ssexi.js"></script>          <!-- any order before fixi -->
<script src="./paxi.js"></script>           <!-- any order before fixi -->
<script src="./rexi.js"></script>           <!-- any order; rexi is standalone -->
<script src="./fixi.js"></script>           <!-- last among fixi-family -->
```

`loka.js` must run **before** any patched library. If a patched lib loads first, its `??=` defaults take effect and the orchestrator's hooks are silently ignored.

### Per-element language resolution

[loka.js](./loka.js) `langOf(elt)` checks in order:

1. `data-loka-lang` on element or ancestor (explicit override)
2. `lang` on element or ancestor (HTML standard — e.g. `<html lang>` or `<section lang>`)
3. Falls back to `"en"`

This is the key capability that distinguishes loka from any preprocessor-style approach: loka resolves at attribute-read time per element, not at DOM-walk time. A single page can mix `<section lang="es">` and `<section lang="ja">` and each section's buttons resolve via its own ancestor.

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

Reviewed locales (native-speaker reviewed for fixi attrs): `es`, `ja`, `ar`. Others have a warning banner and are best-effort. Note the flag covers **fixi attribute names only** — event vocabulary comes from the semantic profile, which carries its own review status upstream.

### The event allowlist is a contract

A profile's keyword map is one flat namespace mixing DOM events with hyperscript grammar and commands, so `EVENT_KEYWORDS` in [scripts/gen-locales.mjs](./scripts/gen-locales.mjs) decides what loka publishes. It is 16 canonicals, and the file states the three-part inclusion test plus why each excluded candidate is out. Two things to respect when changing it:

- **Append, never reorder.** The array doubles as the canonical group sort order, so reordering churns all 48 generated files.
- **`orderValues` throws** on a canonical outside the list. Don't route around it by adding a `fixi.events` override in `fx-vocab.mjs` — that field is for vocabulary genuinely *absent* from a profile (ja/ar/ms/tl/sw have no `click`/`change`/`submit`/`input`). An override that shadows a profile entry creates two disagreeing vocabularies; that's how `pulsacion` shipped for a year while semantic parsed `tecla abajo`.

`hover` is the standing trap: 18 profiles define it, it is not a DOM event name, and publishing it would ship a listener that never fires.

Multi-word localized events (`tecla arriba`) work in fixi's `fx-trigger` **value** but not as a moxi `al-*` attribute **name** — HTML attribute names can't contain spaces.

### Data conventions (relied on by external consumers)

loka publishes **parse maps only** (`localized → canonical`). Two conventions of that data are guaranteed and documented in each generated file's header, `scripts/fx-vocab.mjs`, and the README's "Consuming the vocabulary data":

- **Identity mappings are omitted.** A canonical token absent from a locale's map is intentionally identical to the canonical form (e.g. French omits `fx-action`; `en` is empty). `stripIdentity` drops any `k===v` pair. A missing key means "identity," never "unsupported."
- **Primary-first ordering.** Within each canonical group the preferred synonym is listed before alternatives, so inverting a parse map and taking first-wins yields the form to teach/author. Enforced by [test/vocab-ordering.mjs](./test/vocab-ordering.mjs). We do **not** emit a separate forward (`canonical → localized`) map — the inverse is derivable from these two rules, and a forward map would add browser payload the runtime never reads (the orchestrator inverts attrs itself).

An empty `fixi.attrs` for a non-English locale (currently only `qu`) is an intentional stub, flagged by a generator banner.

## Test phases

The acceptance suite ([test/loka-js.spec.mjs](./test/loka-js.spec.mjs)) has ten phases:

- **A** — M2 button demo across Latin/CJK/RTL, dynamic injection (fixi)
- **B** — M2.5 search demo per locale (`en/es/ja/ar`); this demo predates v1 so its moxi handlers use English `on-*` while fixi attrs are localized
- **C** — Per-element language: one page mixes `lang="es"` and `lang="ja"` sections, each resolving its own vocabulary
- **D** — Devtools faithfulness: localized attribute names still present in DOM
- **E** — moxi: `vivo` / `al-` / `.prevenir` + globals (`consulta`/`esperar`/`transicion`)
- **F** — ssexi: synthetic `fx:sse:message` re-fires as `fx:sse:mensaje` on the same target
- **G** — paxi: `fx-intercambio="morfar"` triggers morph; `window.morfar === window.morph`
- **H** — rexi: verb aliases (`obtener=get`, `publicar=post`, ...) on globalThis
- **I** — joint: all five libraries loaded together on one Spanish page, no conflicts
- **J** — expanded event vocabulary: `fx-disparador="tecla arriba"` binds `keyup` and fires a real swap; `al-desplazar` binds `scroll`. Guards that the allowlist data actually reaches `addEventListener`, which [test/vocab-ordering.mjs](./test/vocab-ordering.mjs) can't show

The [behavior-preservation harness](./test/preservation.mjs) loads each patched library (fixi, paxi, moxi) WITHOUT the orchestrator and verifies the `??=` defaults match upstream.

Key invariant the tests enforce: **attributes are never rewritten**. `fx-acción` / `al-clic` / `fx-intercambio="morfar"` stay verbatim in the DOM; libraries resolve via hooks.

## Patch discipline (we are a fork, not a PR queue)

loka-js is an alternate distribution of the fixiproject family — we ship patched copies of fixi/moxi/paxi, we don't pursue upstream merges. fixiproject's minimalism is a deliberate position (every byte matters in 1.8–3.5 KB libraries).

The patches in [reference-patches/](./reference-patches/) (`fixi.patch`, `moxi.patch`, `paxi.patch`) are documentary artifacts — they show what our patched copies differ from upstream HEAD as of pinned commits. Keep changes:

- **Bit-identical to upstream when no orchestrator is loaded** — verified by [test/preservation.mjs](./test/preservation.mjs). This is the contract that lets `loka.js` users who don't load a locale get unchanged behavior, and lets us cleanly re-port against upstream changes.
- **Faithful to upstream code style** (single-IIFE, `??=` defaults, short var names like `nm`, `ev`, `sl`). Not because we're trying to look mergeable, but because diff minimality reduces re-port friction.
- **Hook surface as small as it can be** — extra hooks mean extra drift surface when upstream changes.

If a maintainer ever wants the hooks upstream, the patches are ready to apply against the based-on commit. Don't optimize for that outcome.

## Parent CLAUDE.md

Inherits from [`../CLAUDE.md`](../CLAUDE.md) (the `~/projects/` cross-portfolio guide). Loka-js relates to the broader fixi-family / hyperfixi ecosystem cataloged there.
