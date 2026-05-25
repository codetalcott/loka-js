# loka-js

> Polyglot fixi-family: a 3-hook contract for per-element language selection without DOM mutation.

**Status:** v1 — full fixiproject family (fixi, moxi, ssexi, paxi, rexi).

## What it is

loka-js is an **alternate distribution** of the [fixiproject family](https://fixiproject.org/) for authors whose native language isn't English. It ships patched copies of fixi, moxi, and paxi that expose tiny hook contracts (defaulted to upstream behavior); locale modules register vocabulary that the libraries resolve **at processing time** — no DOM mutation, no MutationObserver overhead, no race conditions, and **per-element language selection** (mix `<section lang="es">` and `<section lang="ja">` on the same page).

loka-js is to fixiproject what a localized distribution is to any minimalist library: a parallel build for a specific audience the upstream rightly chose not to serve. We don't expect (or ask for) these hooks to land in canonical fixiproject — every byte matters in a 1.8–3.5 KB library, and English-fluent users would download bytes for a feature they'll never use. The hooks are tracked in [reference-patches/](./reference-patches/) as documentation of what the diff looks like, in case a maintainer ever wants them.

When no locale module is loaded, each patched library is behaviorally identical to upstream — verified by the [behavior-preservation harness](./test/preservation.mjs). Patch sizes: fixi ~110 bytes, paxi ~30 bytes, moxi ~150 bytes. ssexi and rexi need no patch — ssexi is localized via listener-side event re-fire from the orchestrator, rexi via a global-alias registry.

## Quick start

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <script src="./orchestrator.js"></script>
  <script src="./locales/es.js"></script>
  <script src="./fixi.js"></script>
</head>
<body>
  <button fx-acción="/api" fx-disparador="clic" fx-objetivo="#out">Cargar</button>
  <div id="out"></div>
</body>
</html>
```

The author writes `fx-acción`, devtools shows `fx-acción`, and fixi processes it correctly.

## Per-element language

```html
<html lang="en">
<body>
  <button fx-action="/en" fx-target="#out">English</button>
  <section lang="es">
    <button fx-acción="/es" fx-objetivo="#out">Español</button>
  </section>
  <section lang="ja">
    <button fx-アクション="/ja" fx-ターゲット="#out">日本語</button>
  </section>
</body>
</html>
```

Each `<section>`'s buttons resolve via the nearest `lang` ancestor. This case the preprocessor-based approach ([dixi](https://github.com/codetalcott/hyperfixi/tree/main/experiments/dixi)) cannot do.

## The contracts

```js
// fixi (patched)
window.fixi.name      = (elt, key) => `fx-${key}`             // attribute-name resolver
window.fixi.event     = (elt, value) => value                 // trigger-value translator
window.fixi.sel       = (key) => `[fx-${key}]`                // discovery selector
window.fixi.ignoreSel = "[fx-ignore]"                         // ignore selector

// moxi (patched)
window.moxi.name      = (elt, key) => key                     // resolves "live" / "on-" / "mx-ignore"
window.moxi.event     = (elt, val) => val                     // event-name translator
window.moxi.modifier  = (mod) => mod                          // .prevent / .once / ...
window.moxi.ignoreSel = "[mx-ignore]"
window.moxi.xpath     = () => "descendant-or-self::*[@live or @*[starts-with(name(),'on-')]]"

// paxi (patched)
window.paxi.isSwap    = (s) => s === "morph"                  // recognize localized morph aliases

// ssexi (no patch) — orchestrator listens for fx:sse:<canonical> and
//                    re-fires fx:sse:<localized> on the same target.

// rexi (no patch) — orchestrator aliases globals (e.g., obtener = get).
```

Language modules register vocabulary via `window.loka.register(code, data)`. See [orchestrator.js](./orchestrator.js).

## Repo layout

```text
fixi.js                Patched fixi (single file, no build step — fixi-family convention)
moxi.js                Patched moxi
paxi.js                Patched paxi
ssexi.js               Unpatched ssexi (verbatim upstream; localized by orchestrator)
rexi.js                Unpatched rexi (verbatim upstream; localized by orchestrator)
orchestrator.js        Installs hooks on all 4 patched/unpatched libraries + loka.alias
lang-resolver.js       Reusable per-element langOf helper (ES module for other libraries)
locales/*.js           24 locale data files (script-tag loaded; calls window.loka.register)
dom-vocab/*.js         24 ES modules exporting shared { events, props } — consumed by
                       psatina-modular and any other library that needs DOM-keyword translation
scripts/               Locale generator
demo/                  Multi-language demos including per-element-lang + joint-all (all 5 libs)
tutorial/              Spanish per-library tutorial pages mirroring fixiproject.org examples
test/                  Playwright acceptance suite (9 phases) + behavior-preservation harness
reference-patches/     Diff artifacts (fixi, moxi, paxi) showing what loka-js's
                       patched copies differ from upstream — reference for
                       maintainers tracking drift, not PR submissions
```

## The pattern this represents

loka-js is one instance of a broader pattern: **expose a library's directive/attribute registry; let language modules register vocabulary instead of mutating the DOM ahead of the library.** Fixi-family attribute names (`fx-action`, …) become hook-resolved at processing time, so a Spanish author's `fx-acción` is what fixi reads — and what devtools shows.

The same pattern applied to a templating library is [**psatina-modular**](https://github.com/codetalcott/psatina-modular) (sibling repo at `~/projects/psatina-modular`): instead of hardcoded `templateDirectives.set('if', …)` etc. in the bundle, the directive set is exposed as a `Map` and per-locale modules register Spanish-named directives (`si`, `para`, `datos`, …) directly. The joint demo at [demo/joint-fixi-psatina/](./demo/joint-fixi-psatina/) uses both libraries together on one Spanish page, sharing this repo's `dom-vocab/es.js` vocabulary.

## Relationship to dixi

[dixi](https://github.com/codetalcott/hyperfixi/tree/main/experiments/dixi) is the preprocessor-based predecessor: it walks the DOM and rewrites `fx-acción` → `fx-action` before fixi reads it. loka-js takes the same locale vocabulary and applies it at read-time via the 3-hook contract, eliminating dixi's MutationObserver overhead and unlocking per-element language. The locale data here is generated from the same `@lokascript/semantic` profile source.

## License

[0BSD](./LICENSE) — do whatever you want.

## Acknowledgments

- Built on [`fixi.js`](https://github.com/bigskysoftware/fixi) by Big Sky Software (Carson Gross).
- Event-name vocabulary derived from [`@lokascript/semantic`](https://github.com/codetalcott/hyperfixi/tree/main/packages/semantic) language profiles.
- Locale resolution pattern inherits from [`dixi`](https://github.com/codetalcott/hyperfixi/tree/main/experiments/dixi).
