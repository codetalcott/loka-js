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
- [scripts/](./scripts/) — locale generator, per-library vocab table, concluded-terms record, and the terminology-research brief/queue tooling
- [demo/](./demo/) — multi-language demos including per-element-lang, `joint-all` (all 5 libs on one Spanish page), and `eventos` (the expanded event vocabulary)
- [tutorial/](./tutorial/) — Spanish per-library tutorial pages mirroring fixiproject.org examples
- [test/](./test/) — Playwright acceptance suite (10 phases) + behavior-preservation harness + two pure-Node data checks (vocab conventions, generation drift)
- `research/` — gitignored working directory for briefs, payloads, and draft findings
- [reference-patches/](./reference-patches/) — diff artifacts (`fixi.patch`, `moxi.patch`, `paxi.patch`) showing what our patched copies differ from upstream; kept as documentation of the fork, not PR submissions

Do not introduce a build step, dist directory, or package bundling. Edits to patched library files should keep their patch surface small — not because the patches are headed upstream, but because small surface area minimizes drift when we re-port against upstream changes.

## Commands

```bash
# Regenerate locales/*.js from sibling-repo profiles + scripts/fx-vocab.mjs
npm run gen
node scripts/gen-locales.mjs --dry-run         # preview
node scripts/gen-locales.mjs --locale=es       # one locale

# Full suite: drift guard, vocab conventions, then Playwright acceptance.
# Only the last needs a static server on :3002.
npx http-server . -p 3002 -c-1 -s &
npm test

# The two pure-Node checks run standalone, no server:
npm run test:drift                             # committed output == fresh generate
npm run test:vocab                             # ordering + identity conventions

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

Multi-word localized events work in **both** positions: spaced in an `fx-trigger` value (`fx-disparador="tecla soltada"`), hyphenated in a moxi attribute name (`al-tecla-soltada`), because `normEvt` collapses runs of space/hyphen/underscore before matching. The README and `demo/eventos` claimed the opposite until 2026-07-28 and told authors to restrict themselves to single-token events — which would have made most of the corrected multi-word vocabulary unusable in moxi. Both are fixed; the constraint that remains is accents, which do **not** fold, so every accented term needs its plain-ASCII twin registered (`pérdida de foco` + `perdida de foco`).

### Event lookup folds case and separators

`lookupEvt` in [loka.js](./loka.js) tries an exact match, then falls back to a normalized index built at `register()` time (`toLowerCase`, runs of space/hyphen/underscore → one space). Two reasons, both silent failures before: German ships capitalized event nouns (`Klick`) while HTML lowercases attribute names, which made German moxi handlers *unwritable*; and multi-word names ship in one spelling while authors write another. Verified collision-free across all 24 locales — re-check with a scan if a locale ever adds entries differing only by case or separator. The index uses a null prototype, so `fx-trigger="constructor"` no longer resolves to `Object.prototype.constructor`.

### Terminology research briefs

Most of the published vocabulary has never been read by a native speaker — it comes from `@lokascript/semantic` profiles, which are themselves best-effort for most languages. [scripts/research-brief.mjs](./scripts/research-brief.mjs) emits a self-contained brief per locale so that review can happen in a session with no checkout:

```bash
npm run brief                        # index: which locales have suspect terms
npm run brief -- --locale=de         # markdown brief
npm run brief -- --locale=de --json  # {code, topic, context, priorityCount}
npm run brief -- --locale=de --out=research/briefs   # write to disk
```

The brief carries what a reviewer can't infer: that the term is an identifier a developer types (not prose), the single-token-vs-multi-word constraint (multi-word works in an `fx-trigger` value but not in an `on-` attribute name), that case and separators fold at lookup so only word choice is in question, and that whether to translate event names at all is settled and out of scope. It also lists canonicals with **no** term anywhere for that locale, since proposing one is as valuable as correcting one.

It briefs **both** surfaces. Attribute names get their own section, because the constraint is stricter (an attribute name can never contain a space, while an event name may, in an `fx-trigger` value) and because each one names a concept rather than a word — `fx-swap` is a DOM replacement strategy, not "exchange". Without that gloss a reviewer translates the English word and returns a term no developer would recognise. The section also distinguishes two blanks that look identical in the data: an omitted attr is a deliberate identity decision (French `fx-action`), but an *entirely* empty table is an unfilled stub (`qu`) — telling a reviewer we "judged English reads fine" for a stub claims a judgment nobody made.

Locales with more than one written standard (`pt`, `es`, `zh`) get a regional-variation question, phrased to ask which *specific terms* diverge as different tokens — not which pronunciations or styles differ. The expected answer is "no split needed", and it says so, because a reviewer won't volunteer that unprompted and a split is expensive: it doubles what a learner might encounter and needs runtime work loka hasn't done (`normLang` in [loka.js](./loka.js) strips the subtag, so `lang="pt-BR"` resolves as `pt` today).

### Event names are nouns, not infinitives

The cross-locale finding of the 2026-07-28 research wave, reached independently by four reviews (de, es, pt, zh): **an event identifier must be a noun or a past participle, never a bare infinitive.** An infinitive reads as a command to the browser — `fx-auslöser="fokussieren"` says "focus this!" — while an event names something that already happened. It also collides conceptually with the method of the same name (`elt.focus()`).

Locales whose event nouns don't inflect (ja, ko, zh) were already right by accident. The Latin-script locales shipped infinitives as primaries and were corrected: de `fokussieren`→`Fokus`, `initialisieren`→`Initialisierung`; pt `focar`→`foco`, `iniciar`→`inicialização`, `rolar`→`rolagem`, `redimensionar`→`redimensionamento`. Apply the rule to any new vocabulary before shipping it.

The paired trap: the obvious nominalization of `blur` is the *visual* blur noun in most languages, and that is the single most common defect this project has found — ja `ぼかし`, ko `블러`, pt `desfoque`, de `defokussieren` were all the image/optics sense. Reach for the "loss of focus" construction instead (`Fokusverlust`, `perda de foco`, `フォーカス解除`, `포커스아웃`).

### Concluded terms live in one place

[scripts/settled-terms.mjs](./scripts/settled-terms.mjs) records decisions that have concluded: the form we ship, the spellings it demoted, why, when, sources, and any regional caveat. Two consumers read it — the brief (to mark a term "confirm only, don't re-derive") and [test/vocab-ordering.mjs](./test/vocab-ordering.mjs) (to assert the concluded form is primary *and* the demoted spellings still parse).

They were previously two hand-kept copies of the same facts and had already drifted: the test's table covered four terms, the brief's covered six. A correction reaching one and not the other lets a brief advertise a term as reviewed while nothing tests that the reviewed spelling shipped.

The term itself does **not** live there. Event names live upstream in the semantic profile; attribute names live in [scripts/fx-vocab.mjs](./scripts/fx-vocab.mjs). Change it there, `npm run gen`, then add the record. `sources: []` means the decision was made on structural grounds with no citation — the brief says so out loud, so a reviewer knows it is open to challenge.

**Three facts about lookup, verified against the runtime rather than assumed** (a probe page driven through Playwright, since all three had been guessed at in the brief's own wording):

- A hyphenated multi-word term **does** resolve as an attribute name — `al-taste-losgelassen` reaches `keyup`, because `normEvt` collapses runs of space/hyphen/underscore before matching. The brief previously told reviewers the opposite and pushed them toward single tokens; that pressure was unfounded, and it is how fused compounds like `unavez` get proposed in the first place.
- `normEvt` does **not** fold ß↔ss. `grössenänderung` does not resolve unless registered, which matters because Swiss Standard German has no ß at all.
- It does **not** fold accents either, and globals bypass it entirely — `collectAliases` assigns `window[alias]` by exact property name. That is why Spanish shipped `transicion` unaccented while `fx-acción` carried its accent: an author typing `transición()` got a ReferenceError.

The mirror of that is `NOTED` in [research-brief.mjs](./scripts/research-brief.mjs): suspicions a human spotted that no heuristic catches, rendered as **open** questions in their own priority section. `suspicions()` finds fused forms by comparing against the English word shape, so it is blind wherever English is a single word — Spanish `unavez` (a fused `una vez`, for canonical `once`) reads as an ordinary word to every regex we have.

A `NOTED` entry carries a `constraint` field for a reason: `unavez` is a moxi modifier, dotted onto the attribute *name* (`al-clic.unavez`) and split out of it at [moxi.js:80](./moxi.js), so a space is structurally impossible there. Without saying that, the brief invites `una vez` back as a recommendation we then have to reject. State the placement constraint whenever the natural phrasing would be illegal in position.

### Queuing external research

[scripts/queue-research.mjs](./scripts/queue-research.mjs) turns a brief into a payload for the `gemini-deep-research` MCP queue:

```bash
npm run queue-research -- --locale=pt   # print and verify one payload
npm run queue-research -- --wave        # the priority locales
```

It prints only; queuing is a separate deliberate step. The harvest on the far side parses the context with literal `PROJECT:` and `AIMS (decide these):` anchors — miss one and the report is filed with no synthesis at all, which you learn 6–30 hours later. `assertAnchors` fails the payload locally instead. Aims are phrased as decisions, not questions, because the harvest restates them verbatim and answers a "should we…?" with a summary rather than a verdict.

The heuristics flag fused compounds, underscores and camelCase — every term of that shape checked so far turned out to be malformed. They deliberately do **not** flag capitalization: German capitalizes nouns, so `Klick` is correct, and lookup folds case anyway.

**@lokascript/semantic has two event vocabularies, and the generator only reads one.** `gen-locales.mjs` scrapes the profiles' `keywords` maps (`generators/profiles/*.ts`), which mix DOM events with grammar and commands — hence the allowlist. But `patterns/event-handler.ts` exports `eventNameTranslations`, a separate **event-only** table covering 14 languages, plus a test-locked `eventLocalizationDenylist` of pairs that fail round-trip upstream. It holds **66 (locale, event) pairs loka does not publish** — German `taste runter`/`maus über`/`laden`, Japanese キーダウン, Korean 마우스다운, and 8 events each for `ja`/`ko`.

The brief reads it so it doesn't ask reviewers to invent terms that already exist, and marks them as candidates rather than shipped vocabulary — upstream documents that table as *aspirational* (forms proposed, not verified in use), and the denylist correlates with a term being invented. Whether to publish any of them is an open decision, not a mechanical merge.

### Data conventions (relied on by external consumers)

loka publishes **parse maps only** (`localized → canonical`). Two conventions of that data are guaranteed and documented in each generated file's header, `scripts/fx-vocab.mjs`, and the README's "Consuming the vocabulary data":

- **Identity mappings are omitted.** A canonical token absent from a locale's map is intentionally identical to the canonical form (e.g. French omits `fx-action`; `en` is empty). `stripIdentity` drops any `k===v` pair. A missing key means "identity," never "unsupported."
- **Primary-first ordering.** Within each canonical group the preferred synonym is listed before alternatives, so inverting a parse map and taking first-wins yields the form to teach/author. Enforced by [test/vocab-ordering.mjs](./test/vocab-ordering.mjs). We do **not** emit a separate forward (`canonical → localized`) map — the inverse is derivable from these two rules, and a forward map would add browser payload the runtime never reads (the orchestrator inverts attrs itself).

**An attribute-name alias is only an alias if it resolves per element.** `fixi.name(elt, key)` is how fixi *reads* an attribute (`attr(elt, nm(elt,"swap"), …)`), so it must return whichever registered spelling the element actually carries, falling back to the locale's primary. Returning the primary unconditionally makes a page written with a demoted spelling read as if the attribute were absent, and fixi then applies its default — for `swap` that default is `outerHTML`, so a page asking for `innerHTML` gets its target **deleted instead of filled**. This surfaced on 2026-07-28 when `fx-tausch` was demoted behind `fx-ersetzung` and the German demo's swap target vanished. `nameByKey` therefore holds an *array* per key, primary first, and `fx.name` scans it (then the canonical) for presence on the element. Phase J asserts both directions by name.

This is the difference between the two surfaces: **event-name** aliases work through `lookupEvt`, which consults the whole map, so demoting an event spelling is free. **Attribute-name** aliases had no such path until this fix. `moxi` still resolves `live` / `mx-ignore` first-wins, which is correct only because no locale registers two spellings for them yet.

Primary-first ordering is **load-bearing at runtime**, not only a courtesy to consumers: it is what makes `fx.name`'s fallback the form we teach, and what `collectMoxi` relies on.

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

### Generation drift

[test/gen-drift.mjs](./test/gen-drift.mjs) asserts the committed `locales/*.js` and `dom-vocab/*.js` are byte-identical to a fresh render from the current semantic checkout, using the generator's own `renderLocale()` rather than a second copy of the render logic.

The vocabulary has three homes — the upstream profiles, `fx-vocab.mjs`, and the generated files committed here — and nothing forced the third to agree with the first two. The disagreement is invisible in both directions: `npm run gen` silently rewrites, so whoever runs it next absorbs an unrelated vocabulary change into their diff; and if nobody runs it, the published data quietly lags upstream. This actually happened during the de/pl/pt correction round, when the locale files here were briefly ahead of the profiles.

A failure is not automatically a bug — it means the checkout and the committed output disagree, and you decide which is right. The test's header lists the three cases. It skips (rather than fails) locales whose profile is missing, so it stays runnable without the hyperfixi sibling.

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
