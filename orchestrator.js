// loka-js orchestrator — installs window.fixi.{name,event,sel,ignoreSel}
// hooks from per-locale data registered by locale modules.
//
// Load order:
//   1. orchestrator.js  (this file — defines window.loka and pre-installs hooks)
//   2. locales/xx.js    (one or more — each calls window.loka.register)
//   3. fixi.js          (patched; reads window.fixi.* hooks via ??= defaults)
//
// Language resolution per element:
//   data-loka-lang   (explicit override on the element or any ancestor)
//   lang             (HTML standard ancestor, e.g. <html lang> or <section lang>)
//   "en"             (fallback)
//
// License: 0BSD.
(()=>{
	let REG = {}                                 // { code: { fixi: { attrs, events } } }
	let nameByKey = {}                           // { code: { action: 'fx-acción', ... } }

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
