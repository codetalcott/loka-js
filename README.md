# loka-js

> Write fixi-family HTML in your own language. 24 locales, no DOM mutation, per-element selection.

**Status:** v1 — all five fixiproject libraries supported (fixi, moxi, paxi, ssexi, rexi).

## What it is

The [fixiproject family](https://fixiproject.org/) uses English attribute names: `fx-action`, `live`, `on-click`, `mx-ignore`. loka-js lets you write the equivalents in 24 other languages — `fx-acción`, `vivo`, `al-clic`, `mx-ignorar` — and the libraries resolve the right name **at processing time**. No preprocessor. No DOM mutation. The author writes Spanish; devtools shows Spanish; fixi processes the button correctly.

Per-element language is the killer feature: a `<section lang="es">` and a `<section lang="ja">` on the same page each get their own vocabulary. Mix freely.

**Who this is for:** web developers whose first language isn't English, especially beginners encountering hypermedia patterns for the first time.

**Who this is NOT for:** English-fluent devs. Use [canonical fixiproject](https://fixiproject.org/) directly — the libraries are smaller, the docs are upstream, and the community knowledge is already there. loka-js trades a small amount of bytes and indirection for accessibility. loka-js doesn't sit alongside the other fixiproject libraries as a peer — it's a parallel distribution for a different audience.

## Try it

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <script src="./loka.js"></script>
  <script src="./locales/es.js"></script>
  <script src="./fixi.js"></script>
</head>
<body>
  <button fx-acción="/api" fx-disparador="clic" fx-objetivo="#out">Cargar</button>
  <div id="out"></div>
</body>
</html>
```

Three things to notice:

1. The author writes `fx-acción`.
2. Devtools shows `fx-acción` — the attribute is never rewritten.
3. fixi handles the click and swaps `#out` correctly.

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

Each section's buttons resolve via the nearest `lang` ancestor at attribute-read time. The markup is never rewritten — devtools shows what you wrote.

## See it working

- [demo/per-element-lang/](demo/per-element-lang/) — three buttons in three languages on one page
- [demo/joint-all/](demo/joint-all/) — Spanish page using all five libraries together
- [tutorial/es/](tutorial/es/) — per-library tutorial pages with Spanish ↔ English side-by-side
- [test/loka-js.spec.mjs](test/loka-js.spec.mjs) — 9-phase Playwright acceptance suite (165 checks)

## How it works

Each patched library exposes 1–5 hooks defaulted to upstream behavior via `??=`. Locale modules register vocabulary; libraries resolve via the hooks at read time. When no locale module is loaded, behavior is bit-identical to upstream — verified by the [behavior-preservation harness](test/preservation.mjs).

```js
// fixi (patched)
window.fixi.name      = (elt, key) => `fx-${key}`             // attribute-name resolver
window.fixi.event     = (elt, value) => value                 // trigger-value translator
window.fixi.sel       = (key) => `[fx-${key}]`                // discovery selector
window.fixi.ignoreSel = "[fx-ignore]"                         // ignore selector

// moxi (patched): name / event / modifier / ignoreSel / xpath
// paxi (patched): isSwap (recognizes localized "morph" aliases)
// ssexi (no patch) — orchestrator listens for fx:sse:<canonical> and re-fires fx:sse:<localized>
// rexi  (no patch) — orchestrator aliases globals (obtener = get, etc.)
```

**The orchestrator is required for localization.** Each patched library's
DOM-discovery default (`fixi.sel` → `[fx-${key}]`, `moxi.xpath` → `@live`/`on-`,
`paxi.isSwap` → `s==="morph"`) is English-only by design and does *not* derive
from the per-element `name` hook — those discovery hooks get a key/string, not
an element, so they can't consult a per-element resolver. `loka.js`
replaces them with combined hooks that union every registered locale's names.
If you load a raw patched library and set only a localized `name` hook *without*
the orchestrator, the scanner keeps matching the English tokens and silently
misses your localized elements. Keeping the raw defaults English-only is what
makes them bit-identical to upstream when no locale is loaded.

Patch sizes (so the diff against upstream stays small and easy to re-port when upstream changes): fixi ~110 bytes, paxi ~30 bytes, moxi ~150 bytes. We don't pursue upstream merges; see [reference-patches/README.md](reference-patches/README.md) for the alternate-distribution framing.

## Repo layout

```text
fixi.js                Patched fixi (single file, no build step — fixiproject convention)
moxi.js                Patched moxi
paxi.js                Patched paxi
ssexi.js               Verbatim upstream ssexi (localized by orchestrator)
rexi.js                Verbatim upstream rexi (localized by orchestrator)
loka.js                Installs hooks on all five libraries; defines window.loka.register
lang-resolver.js       Per-element langOf helper (ES module for other libraries)
locales/*.js           24 generated locale data files
dom-vocab/*.js         24 ES modules of shared { events, props } for non-fixi consumers
scripts/               Locale generator (npm run gen)
demo/                  Multi-language demos (per-element-lang, joint-all, search, ...)
tutorial/              Spanish per-library tutorial pages
test/                  Playwright acceptance suite + behavior-preservation harness
reference-patches/     Diff artifacts (fixi/moxi/paxi vs upstream) for fork hygiene
```

Reviewed locales (native-speaker reviewed for fixi attrs): `es`, `ja`, `ar`. Others are best-effort and carry a warning banner; see [scripts/fx-vocab.mjs](scripts/fx-vocab.mjs).

## Consuming the vocabulary data

The runtime only needs **parse maps** (`localized → canonical`) — that's what the resolver hooks consume, and what each locale file registers (`{ 'fx-acción': 'fx-action' }`, `{ clic: 'click', 'hacer clic': 'click' }`). If you're building tooling *on top of* loka — docs, autocomplete, agent skills that teach the localized vocabulary — two conventions of that data are guaranteed and safe to rely on:

1. **An omitted canonical token means identity, not "unsupported."** The generator drops identity mappings (`stripIdentity`), so a canonical absent from a locale's map is intentionally identical to the canonical form — the author writes the canonical token. French omits `fx-action` because *action* is already French; `en` is empty entirely. Never read a missing key as a gap in coverage.

2. **The primary localized form is listed first.** Within each canonical group, the preferred synonym precedes its alternatives (Spanish `click` → `clic` before `hacer clic`). So if you need the inverse — `canonical → primary-localized`, i.e. *what should a developer write?* — invert the parse map and take the first-wins entry per canonical. This ordering is enforced by [`test/vocab-ordering.mjs`](test/vocab-ordering.mjs), so it won't drift silently. (loka publishes parse maps only; it does not emit a separate forward map — the inverse is derivable via these two rules.)

Both conventions are restated in every generated file's header and in [scripts/fx-vocab.mjs](scripts/fx-vocab.mjs).

### Which events are localized

A `@lokascript/semantic` profile is one flat keyword namespace: DOM events sit beside hyperscript grammar (`if`, `repeat`, `end`) and commands (`put`, `fetch`, `morph`). loka can't consume it wholesale, so it publishes a fixed allowlist of **hypermedia trigger events**, defined and justified in [`scripts/gen-locales.mjs`](scripts/gen-locales.mjs):

`click` · `change` · `submit` · `input` · `focus` · `blur` · `init` · `keydown` · `keyup` · `mousedown` · `mouseup` · `mouseover` · `mouseout` · `scroll` · `resize` · `load`

A canonical is included when it names a real DOM event, an author plausibly binds it on a page element, and the localized token reads as "this happened" rather than "do this". `init` is the one deliberate exception — it's fixi's synthetic lifecycle trigger, not a browser event.

Notably excluded: **`hover`**, which 18 profiles define but which is not a DOM event name — publishing it would ship `addEventListener('hover')`, a listener that never fires. Also `select`/`reset`/`close`/`toggle`/`copy`, which are real events but appear in the profiles as *commands* whose localized primaries are imperatives. If you need one of these, open an issue; the allowlist is the one place scope is decided, and the generator throws if a locale tries to publish outside it.

Coverage varies by locale — the profiles are the upstream source, and only `scroll` is translated in all 24. A canonical with no translation in your locale falls under rule 1 above: write the canonical English token.

**One constraint worth knowing:** several localized event names are multi-word (`tecla arriba`, `ratón encima`). Those work in fixi's `fx-trigger` **value** (`fx-disparador="tecla arriba"`), but not as a moxi attribute **name** — `al-tecla arriba` isn't valid HTML, the parser reads it as two attributes. In moxi, use the single-token events (`al-clic`, `al-desplazar`, `al-carga`, `al-redimensionar`). See [demo/eventos/](demo/eventos/).

## The pattern this represents

loka-js is one instance of a broader pattern: **expose a library's directive/attribute registry; let language modules register vocabulary instead of mutating the DOM ahead of the library.** Spanish `fx-acción` is what the author writes, what devtools shows, and what fixi reads.

The same pattern applied to a templating library is [psatina-modular](https://github.com/codetalcott/psatina-modular): the directive set is exposed as a `Map` and per-locale modules register Spanish-named directives (`si`, `para`, `datos`, …). The [joint fixi+psatina demo](demo/joint-fixi-psatina/) uses both libraries on one Spanish page, sharing this repo's `dom-vocab/es.js` vocabulary.

## Relationship to lokascript

[lokascript.org](https://lokascript.org) is the multilingual counterpart for **hyperscript** — write rich behaviors like `on click set my.count to ...` in 24 languages. loka-js is the same idea applied to the **fixi family** — write minimal hypermedia attributes (`fx-action`, `fx-target`, ...) in those same 24 languages. Both share the `@lokascript/semantic` vocabulary source, so a "click" is `clic` in both worlds and a Spanish-speaking dev moving between the two doesn't relearn DOM-event names.

Use whichever matches your library choice. If you're writing rich client-side behaviors, reach for hyperscript / lokascript. If you're writing minimal HTTP-attribute hypermedia, loka-js + fixi-family. The two compose on one page if you mix lokascript-driven behaviors with fixi-family hypermedia — they don't conflict.

## Other work in this repo (internal / in-progress)

This repository also hosts exploratory work that is **not part of the loka localization pitch and not ready for external use**:

- [`AGENT_AFFORDANCES`/`GRAIL_HTML_BINDING.md`](GRAIL_HTML_BINDING.md) — a spec draft for HTML attributes that encode agent-readable affordance metadata. The "GRAIL" terminology is borrowed from Mike Amundsen's work and is pending a naming review before any public reference.
- [`tools/agent-reader.mjs`](tools/agent-reader.mjs) — extracts that affordance metadata for consumption by LLM agents.
- [`examples/incident-triage-es/`](examples/incident-triage-es/) — end-to-end internal demo combining loka with the affordance work.

If you're here for localization, skip these. They'll either crystallize into something shareable (probably as a separate repo) or get reabsorbed into the loka work in a way that fits the localization pitch.

## License

[0BSD](./LICENSE) — do whatever you want.

## Acknowledgments

- Built on [`fixi.js`](https://github.com/bigskysoftware/fixi) and the broader [fixiproject family](https://fixiproject.org/) by Big Sky Software (Carson Gross and contributors).
- Event-name vocabulary derived from [`@lokascript/semantic`](https://github.com/codetalcott/hyperfixi/tree/main/packages/semantic) language profiles.
