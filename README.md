# loka-js

> Polyglot fixi-family: a 3-hook contract for per-element language selection without DOM mutation.

**Status:** v0 — fixi-i18n only. moxi/ssexi/paxi/rexi are deferred until v1.

## What it is

A tiny patch to [fixi.js](https://github.com/bigskysoftware/fixi) (about 110 bytes minified) that replaces 6 hardcoded `fx-*` attribute literals with 3 defaulted hooks: `name`, `event`, `sel`. With those hooks in place, language modules can register locale-specific vocabulary and fixi reads the right attribute name **at processing time** — no DOM mutation, no MutationObserver overhead, no race conditions, and **per-element language selection** (mix `<section lang="es">` and `<section lang="ja">` on the same page).

When no language module is loaded, the patched fixi is behaviorally identical to upstream.

## Quick start

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <script src="./orchestrator.js"></script>
  <script src="./locales/es.js"></script>
  <script src="./packages/fixi/dist/fixi.js"></script>
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

## The contract

```js
// Defaults installed by fixi when window.fixi.{name,event,sel} are not set.
window.fixi.name      = (elt, key) => `fx-${key}`             // attribute-name resolver
window.fixi.event     = (elt, value) => value                 // trigger-value translator
window.fixi.sel       = (key) => `[fx-${key}]`                // discovery selector
window.fixi.ignoreSel = "[fx-ignore]"                         // ignore selector
```

Language modules override these via the orchestrator. See [orchestrator.js](./orchestrator.js).

## Repo layout

```
packages/fixi/         The patched fixi.js + dist bundles
orchestrator.js        Installs window.fixi.{name,event,sel} hooks
locales/*.js           24 locale data files (generated from @lokascript/semantic profiles)
scripts/               Locale generator + build
demo/                  Multi-language demos including the per-element-lang case
test/                  Playwright acceptance suite
upstream-patches/      Diff artifact for upstream contribution
```

## Relationship to dixi

[dixi](https://github.com/codetalcott/hyperfixi/tree/main/experiments/dixi) is the preprocessor-based predecessor: it walks the DOM and rewrites `fx-acción` → `fx-action` before fixi reads it. loka-js takes the same locale vocabulary and applies it at read-time via the 3-hook contract, eliminating dixi's MutationObserver overhead and unlocking per-element language. The locale data here is generated from the same `@lokascript/semantic` profile source.

## License

[0BSD](./LICENSE) — do whatever you want.

## Acknowledgments

- Built on [`fixi.js`](https://github.com/bigskysoftware/fixi) by Big Sky Software (Carson Gross).
- Event-name vocabulary derived from [`@lokascript/semantic`](https://github.com/codetalcott/hyperfixi/tree/main/packages/semantic) language profiles.
- Locale resolution pattern inherits from [`dixi`](https://github.com/codetalcott/hyperfixi/tree/main/experiments/dixi).
