// loka-js orchestrator — installs hooks on the patched fixiproject libraries
// (fixi, moxi, ssexi, paxi) and a global-alias registry for JS-only APIs
// (rexi, moxi globals), from per-locale data registered by locale modules.
//
// Load order (synchronous <script> tags in <head>):
//   1. orchestrator.js  (this file — defines window.loka and pre-installs hooks)
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
			'[loka-js] orchestrator.js loaded after fixi.js — hooks will not take effect. ' +
			'Move <script src="orchestrator.js"></script> above <script src="fixi.js"></script> in your <head>.'
		)
	}

	let REG = {}                                 // { code: { fixi: { attrs, events } } }
	let nameByKey = {}                           // { code: { action: 'fx-acción', ... } }

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
	fx.event = (elt, val)=>{
		let lang = langOf(elt)
		return REG[lang]?.fixi?.events?.[val] || val
	}
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
	// translation — share REG[lang].fixi.events to avoid duplication.
	mxh.event = (elt, val)=>{
		let lang = langOf(elt)
		return REG[lang]?.fixi?.events?.[val] || val
	}
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
		// See AGENT_AFFORDANCES.md.
		langOf,
		affordances: (lang)=>REG[normLang(lang || 'en')]?.affordances ?? {},
	}
})()
