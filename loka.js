// loka-js orchestrator — installs hooks on the patched fixiproject libraries
// (fixi, moxi, ssexi, paxi) and a global-alias registry for JS-only APIs
// (rexi, moxi globals), from per-locale data registered by locale modules.
//
// Load order (synchronous <script> tags in <head>):
//   1. loka.js  (this file — defines window.loka and pre-installs hooks)
//   2. locales/xx.js    (one or more — each calls window.loka.register)
//   3. moxi.js          (only if you're using moxi; before fixi per fixiproject
//                        convention — moxi must register its fx:init / fx:process
//                        listeners before fixi dispatches them on DOMContentLoaded)
//   4. ssexi.js / paxi.js / rexi.js (optional — any order, before fixi)
//   5. fixi.js          (patched; reads window.fixi.* hooks via ??= defaults)
//
// Why this order matters:
//   * orchestrator before locales: window.loka must exist for register() calls.
//   * locales before fixi: fixi captures the hook functions and ignoreSel
//     string at load time. Locales added after fixi loads will affect later
//     hook calls (sel, name, event read live from REG) but fixi's already-
//     captured ignoreSel string won't reflect post-fixi-load locale additions.
//   * moxi before fixi: fixiproject convention — see
//     https://fixiproject.org/  ("you will want to load moxi.js before fixi.js
//     so that on-fx:init and on-fx:process handlers are registered before
//     fixi.js dispatches those events on page load").
//
// Localization REQUIRES this orchestrator (the patched libraries alone do not
// localize). Each patched library's DOM-discovery default is English-only by
// design and does NOT derive from the per-element `name` hook:
//   * fixi  — sel(key) defaults to `[fx-${key}]`              (fixi.js)
//   * moxi  — xpath() defaults to `@live or @*[starts-with(name(),'on-')]`
//   * paxi  — isSwap(s) defaults to `s === "morph"`
// These discovery hooks receive a key/string, not an element, so they cannot
// call name(elt, key); a per-element resolver can't drive a document-level
// scan. The orchestrator replaces them with COMBINED hooks that union every
// registered locale's localized names (buildSelector / xpath union /
// MORPH_NAMES below). Consequence: if you set only a localized `name` hook on
// a raw library WITHOUT loading this orchestrator, the scanner keeps looking
// for the English tokens and silently misses every localized element. The raw
// libraries are deliberately English-only standalone — that is what keeps them
// bit-identical to upstream (see test/preservation.mjs); localization is this
// orchestrator's job, not theirs.
//
// Language resolution per element:
//   data-loka-lang   (explicit override on the element or any ancestor)
//   lang             (HTML standard ancestor, e.g. <html lang> or <section lang>)
//   "en"             (fallback)
//
// License: 0BSD.
(()=>{
	// Misorder guard: if fixi has already initialized its MutationObserver,
	// it loaded before us — our hooks won't take effect because fixi captured
	// the default implementations into local variables at its own load time.
	if (document.__fixi_mo) {
		console.warn(
			'[loka-js] loka.js loaded after fixi.js — hooks will not take effect. ' +
			'Move <script src="loka.js"></script> above <script src="fixi.js"></script> in your <head>.'
		)
	}

	let REG = {}                                 // { code: { fixi: { attrs, events } } }
	let nameByKey = {}                           // { code: { action: 'fx-acción', ... } }
	let eventIdx = {}                            // { code: { 'hacer clic': 'click', ... } } normalized

	// langOf + normLang: inlined for non-module script-tag load. The ES-module
	// version lives in lang-resolver.js and is imported by other libraries
	// (psatina-modular etc.) — keep the two in sync.
	let normLang = (s)=>s.split('-')[0].toLowerCase()
	let langOf = (elt)=>{
		let v = elt.getAttribute?.('data-loka-lang')
		if (v) return normLang(v)
		let dx = elt.closest?.('[data-loka-lang]')
		if (dx) return normLang(dx.getAttribute('data-loka-lang'))
		let la = elt.closest?.('[lang]')
		if (la) return normLang(la.getAttribute('lang'))
		return 'en'
	}

	// ── Event-name lookup ─────────────────────────────────────────────────
	// Author-tolerant on purpose. Two ways the naive `events[val]` lookup
	// failed silently, both ending in addEventListener() on a name no browser
	// ever fires — no error, no warning:
	//
	//  1. Case. German event vocabulary is capitalized because German
	//     capitalizes nouns (Klick, Änderung, Absenden, Eingabe). A developer
	//     writing fx-auslöser="klick" got nothing. Worse for moxi: the HTML
	//     parser lowercases attribute NAMES, so al-Klick reaches moxi as
	//     "klick" — a German moxi click handler was not merely fragile, it
	//     was unwritable.
	//  2. Separators. Multi-word names ship in one spelling ('hacer clic',
	//     'faire-défiler', 'alisin_tuon'); authors reasonably write another.
	//
	// So fold case and collapse runs of space/hyphen/underscore to one space.
	// Verified collision-free across all 24 locales: no two entries in any
	// locale normalize to the same key with different canonicals.
	let normEvt = (s)=>s.trim().toLowerCase().replace(/[\s_-]+/g, ' ')

	let buildEventIdx = (events)=>{
		// Null prototype: a plain object resolves fx-trigger="constructor" to
		// Object.prototype.constructor and hands a Function to addEventListener.
		let out = Object.create(null)
		for (let [loc, can] of Object.entries(events || {})) {
			let k = normEvt(loc)
			if (!(k in out)) out[k] = can    // first-wins keeps primary-first
		}
		return out
	}

	let lookupEvt = (elt, val)=>{
		if (typeof val !== 'string') return val
		let lang = langOf(elt)
		let ev = REG[lang]?.fixi?.events
		// Exact match first, so everything that resolves today keeps resolving
		// identically; normalization only ever rescues what used to fall through.
		if (ev && Object.hasOwn(ev, val)) return ev[val]
		return eventIdx[lang]?.[normEvt(val)] || val
	}

	let invertAttrs = (attrs)=>{
		// { 'fx-acción': 'fx-action' } -> { action: 'fx-acción' }
		let out = {}
		for (let [loc, can] of Object.entries(attrs || {})) {
			if (can.startsWith('fx-')) out[can.slice(3)] = loc
		}
		return out
	}

	let buildSelector = (key)=>{
		let canonical = `fx-${key}`
		let names = new Set([canonical])
		for (let code in REG) {
			for (let [loc, can] of Object.entries(REG[code]?.fixi?.attrs || {})) {
				if (can === canonical) names.add(loc)
			}
		}
		return [...names].map(n=>`[${n}]`).join(', ')
	}

	// Pre-install hooks. Patched fixi.js uses ??= so it'll keep these.
	let fx = window.fixi ??= {}
	fx.name = (elt, key)=>{
		let lang = langOf(elt)
		return nameByKey[lang]?.[key] || `fx-${key}`
	}
	fx.event = lookupEvt
	fx.sel = (key)=>buildSelector(key)
	fx.ignoreSel = buildSelector('ignore')

	// ── paxi ──────────────────────────────────────────────────────────────
	// paxi's "morph" swap value can be aliased per locale. The hook reads
	// MORPH_NAMES live so locales registered later are picked up.
	let MORPH_NAMES = new Set(['morph'])
	let pax = window.paxi ??= {}
	pax.isSwap = (s)=>typeof s === 'string' && MORPH_NAMES.has(s)

	// ── moxi ──────────────────────────────────────────────────────────────
	// moxi's "live" / "on-" prefix / "mx-ignore" attribute names, plus its
	// dotted modifier vocabulary (.prevent/.stop/...), can be localized.
	// Per-element resolution uses langOf(); the XPath discovery selector
	// unions all known live-names and on-prefixes across all locales.
	let moxiNameByKey = {}             // { code: { live: 'vivo', 'on-': 'al-', 'mx-ignore': 'mx-ignorar' } }
	let LIVE_NAMES = new Set(['live'])
	let ON_PREFIXES = new Set(['on-'])
	let MX_MODIFIERS = {}              // localized -> canonical
	let mxh = window.moxi ??= {}
	mxh.name = (elt, key)=>{
		let lang = langOf(elt)
		return moxiNameByKey[lang]?.[key] || key
	}
	// moxi's event-name vocab IS the same DOM-event vocab as fixi's trigger
	// translation — share the lookup to avoid duplication. moxi needs the
	// case folding even more than fixi: it reads the event from an attribute
	// NAME, which the HTML parser has already lowercased.
	mxh.event = lookupEvt
	mxh.modifier = (m)=>MX_MODIFIERS[m] || m
	mxh.ignoreSel = '[mx-ignore]'
	mxh.xpath = ()=>{
		let liveSel = [...LIVE_NAMES].map(n=>`@${n}`).join(' or ')
		let prefList = [...ON_PREFIXES].map(p=>`starts-with(name(),'${p}')`).join(' or ')
		return `descendant-or-self::*[${liveSel} or @*[${prefList}]]`
	}
	let buildMxIgnoreSel = ()=>{
		let names = new Set(['mx-ignore'])
		for (let code in REG){
			let attrs = REG[code]?.moxi?.attrs
			if (!attrs) continue
			for (let [loc, can] of Object.entries(attrs)){
				if (can === 'mx-ignore') names.add(loc)
			}
		}
		return [...names].map(n=>`[${n}]`).join(', ')
	}
	let collectMoxi = (data, code)=>{
		let attrs = data?.moxi?.attrs
		if (attrs){
			let byKey = {}
			for (let [loc, can] of Object.entries(attrs)){
				byKey[can] = loc
				if (can === 'live') LIVE_NAMES.add(loc)
				if (can === 'on-')  ON_PREFIXES.add(loc)
			}
			moxiNameByKey[code] = byKey
		}
		let mods = data?.moxi?.modifiers
		if (mods){
			for (let [loc, can] of Object.entries(mods)) MX_MODIFIERS[loc] = can
		}
		mxh.ignoreSel = buildMxIgnoreSel()
	}

	// ── ssexi ─────────────────────────────────────────────────────────────
	// ssexi fires "fx:sse:<type>" events on the DOM. We don't patch ssexi;
	// instead, for each registered localized alias (e.g., abrir -> open) we
	// listen for the canonical "fx:sse:open" and re-fire "fx:sse:abrir" on
	// the same target. Re-fire is bubbling so document-level listeners
	// reach it too. Limitation: e.preventDefault() on the canonical event
	// does not cancel the re-fired localized event; SSE events are mostly
	// notifications so this is acceptable for v1.
	let SSE_REFIRES = new Set()  // canonical event names already wired
	let wireSseRefire = (localized, canonical)=>{
		let canonicalEvt = 'fx:sse:' + canonical
		let localizedEvt = 'fx:sse:' + localized
		if (SSE_REFIRES.has(localizedEvt)) return
		SSE_REFIRES.add(localizedEvt)
		document.addEventListener(canonicalEvt, (e)=>{
			e.target.dispatchEvent(new CustomEvent(localizedEvt, {
				detail: e.detail, bubbles: true, cancelable: true, composed: true,
			}))
		})
	}
	let collectSseAliases = (data)=>{
		let evs = data?.ssexi?.events
		if (!evs) return
		for (let [localized, canonical] of Object.entries(evs)){
			if (localized !== canonical) wireSseRefire(localized, canonical)
		}
	}

	// ── global-alias registry (opt-in per locale) ─────────────────────────
	// Locales that set `globalsOptIn: true` may list rexi/moxi/paxi globals
	// they want aliased onto globalThis. The orchestrator queues these and
	// applies them lazily — DOMContentLoaded (after all sync scripts have
	// run) and on every register() call thereafter.
	let ALIAS_QUEUE = []
	let aliasFlush = ()=>{
		ALIAS_QUEUE = ALIAS_QUEUE.filter(({alias, canonical})=>{
			if (window[alias] !== undefined) return false  // already set
			if (window[canonical] === undefined) return true  // canonical not loaded yet — keep waiting
			window[alias] = window[canonical]
			return false
		})
	}
	document.addEventListener('DOMContentLoaded', aliasFlush)

	let collectAliases = (data)=>{
		if (!data?.globalsOptIn) return
		for (let lib of ['paxi', 'rexi', 'moxi']){
			let g = data[lib]?.globals
			if (!g) continue
			for (let [alias, canonical] of Object.entries(g)){
				ALIAS_QUEUE.push({alias, canonical})
			}
		}
	}

	let collectPaxiSwaps = (data)=>{
		let swaps = data?.paxi?.swaps
		if (!swaps) return
		for (let [localized, canonical] of Object.entries(swaps)){
			if (canonical === 'morph') MORPH_NAMES.add(localized)
		}
	}

	window.loka = {
		register(code, data){
			let c = normLang(code)
			REG[c] = data
			nameByKey[c] = invertAttrs(data?.fixi?.attrs)
			eventIdx[c] = buildEventIdx(data?.fixi?.events)
			// fx.sel is a function that reads REG at call time — no rebind needed.
			// fx.ignoreSel is a string captured by fixi at load time, so refresh
			// here in case a locale added a localized fx-ignore.
			fx.ignoreSel = buildSelector('ignore')
			collectPaxiSwaps(data)
			collectSseAliases(data)
			collectMoxi(data, c)
			collectAliases(data)
			aliasFlush()
		},
		// Direct alias entrypoint for users not going through register().
		alias(map){
			for (let [alias, canonical] of Object.entries(map || {})){
				ALIAS_QUEUE.push({alias, canonical})
			}
			aliasFlush()
		},
		// External readers (agent readers, dev overlays, auditors) need to
		// resolve localized values to canonical English. These two methods
		// expose the minimum surface for that — langOf returns the lang an
		// element resolves to under the same rules fixi uses; affordances
		// returns the affordance vocab block for a lang (intents/classes/...).
		// See GRAIL_HTML_BINDING.md.
		langOf,
		affordances: (lang)=>REG[normLang(lang || 'en')]?.affordances ?? {},
	}
})()
