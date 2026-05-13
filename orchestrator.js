// loka-js orchestrator — installs window.fixi.{name,event,sel,ignoreSel}
// hooks from per-locale data registered by locale modules.
//
// Load order (synchronous <script> tags in <head>):
//   1. orchestrator.js  (this file — defines window.loka and pre-installs hooks)
//   2. locales/xx.js    (one or more — each calls window.loka.register)
//   3. moxi.js          (only if you're using moxi; before fixi per fixiproject
//                        convention — moxi must register its fx:init / fx:process
//                        listeners before fixi dispatches them on DOMContentLoaded)
//   4. fixi.js          (patched; reads window.fixi.* hooks via ??= defaults)
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

	window.loka = {
		register(code, data){
			let c = normLang(code)
			REG[c] = data
			nameByKey[c] = invertAttrs(data?.fixi?.attrs)
			// fx.sel is a function that reads REG at call time — no rebind needed.
			// fx.ignoreSel is a string captured by fixi at load time, so refresh
			// here in case a locale added a localized fx-ignore.
			fx.ignoreSel = buildSelector('ignore')
		},
	}
})()
