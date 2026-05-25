// Reference reader for the agent-affordance vocabulary defined in
// AGENT_AFFORDANCES.md (v0.2). Two roles:
//
//   1. Library  — `readAffordances(root)` is a self-contained function (no
//      imports, no module-scoped closures) so it can be serialized by
//      Playwright and evaluated inside a page context. It reads the loka-
//      installed hooks for lang resolution and vocabulary lookup.
//
//   2. CLI      — when run directly with a URL or file path argument, loads
//      the page in headless chromium and prints the action graph as JSON
//      to stdout. Supports --validate and --schema=anthropic flags.
//
// v0.2 additions over v0.1:
//   - Page-level defaults via <meta name="fx-affordances" content="key:value,...">
//   - _meta.unresolved tracks affordance fields whose value isn't in the
//     canonical enum and didn't get vocab-translated (used by validator and
//     schema generator to detect localized-but-untranslated values).
//   - validate() escalates severity when method is destructive AND
//     metadata is missing.
//   - toAnthropicSchema returns {tools, warnings} and drops actions whose
//     intent is suspected-localized-untranslated.

// Canonical values for enum-shape affordance fields. Used to detect
// "localized but unresolved" values (when a value is non-null but not in
// the canonical set, it's either localized-untranslated, a typo, or an
// application-specific extension).
const CANONICAL = {
  classes:         ['read','create','update','delete','navigate','search','toggle','open','close'],
  confirms:        ['none','soft','human-approval','reauth'],
  reversibilities: ['no','soft','hard','time-window'],
  authorities:     ['anonymous','authenticated','owner','admin'],
  effects:         ['none','client-state','server-state','external'],
}
const DESTRUCTIVE_METHODS = ['DELETE','PUT','POST','PATCH']

// ── In-page reader ─────────────────────────────────────────────────────────
// Pure DOM, no external refs. Safe to page.evaluate() in Playwright.
export function readAffordances(root) {
  root = root || (typeof document !== 'undefined' ? document : null)
  if (!root) throw new Error('readAffordances needs a DOM root')

  const langOf = (window.loka && window.loka.langOf) || (() => 'en')
  const affordancesFor = (window.loka && window.loka.affordances) || (() => ({}))
  const nameOf = (elt, key) => (window.fixi && window.fixi.name) ? window.fixi.name(elt, key) : ('fx-' + key)
  const actionSel = (window.fixi && window.fixi.sel) ? window.fixi.sel('action') : '[fx-action]'

  // Inline-duplicated so this fn remains self-contained for Playwright.
  const CANON = {
    classes:         ['read','create','update','delete','navigate','search','toggle','open','close'],
    confirms:        ['none','soft','human-approval','reauth'],
    reversibilities: ['no','soft','hard','time-window'],
    authorities:     ['anonymous','authenticated','owner','admin'],
    effects:         ['none','client-state','server-state','external'],
  }

  // Returns {value, resolved} so caller can tell if vocab translation hit.
  const resolveRaw = (table, value, lang) => {
    if (value == null) return {value: null, resolved: false}
    const vocab = affordancesFor(lang)
    const hit = vocab[table] && vocab[table][value]
    return hit ? {value: hit, resolved: true} : {value, resolved: false}
  }
  const resolve = (table, value, lang) => resolveRaw(table, value, lang).value

  // Page-level defaults from <meta name="fx-affordances" content="...">.
  // Parsed once per readAffordances call; applied when per-action attr missing.
  const parseDefaults = () => {
    const meta = root.querySelector ? root.querySelector('meta[name="fx-affordances"]') : null
    if (!meta) return {}
    const content = meta.getAttribute('content') || ''
    const out = {}
    for (const pair of content.split(',')) {
      const ix = pair.indexOf(':')
      if (ix < 0) continue
      const k = pair.slice(0, ix).trim()
      const v = pair.slice(ix + 1).trim()
      if (k && v) out[k] = v
    }
    return out
  }
  const defaults = parseDefaults()
  const defaultFor = (field, lang) => {
    const v = defaults['default-' + field]
    if (v == null) return null
    // Resolve through vocab too (page meta might be in localized form).
    const tableKey = field === 'class' ? 'classes'
      : field === 'confirm' ? 'confirms'
      : field === 'reversible' ? 'reversibilities'
      : field === 'authority' ? 'authorities'
      : field === 'effect' ? 'effects'
      : null
    return tableKey ? resolve(tableKey, v, lang) : v
  }

  // For each canonical-enum field, decide whether the value is canonical,
  // resolved-from-vocab, or unresolved (localized-untranslated / typo / extension).
  const classify = (field, table, raw, lang) => {
    if (raw == null) return {value: null, status: 'absent'}
    const {value, resolved} = resolveRaw(table, raw, lang)
    if (resolved) return {value, status: 'resolved'}
    if (CANON[table].includes(value)) return {value, status: 'canonical'}
    return {value, status: 'unresolved'}
  }

  const actions = []
  for (const el of root.querySelectorAll(actionSel)) {
    const lang = langOf(el)
    const attr = (k) => el.getAttribute(nameOf(el, k))

    // Multi-value effect parsed and classified per token.
    const effectRaw = el.getAttribute('fx-effect')
    const effectTokens = effectRaw ? effectRaw.split(/\s+/) : null
    const effectClassified = effectTokens
      ? effectTokens.map(v => classify('effect', 'effects', v, lang))
      : null

    // Per-field classification for enum-shape fields.
    const cls         = classify('class',      'classes',         el.getAttribute('fx-class'),      lang)
    const conf        = classify('confirm',    'confirms',        el.getAttribute('fx-confirm'),    lang)
    const rev         = classify('reversible', 'reversibilities', el.getAttribute('fx-reversible'), lang)
    const auth        = classify('authority',  'authorities',     el.getAttribute('fx-authority'),  lang)

    // Intent: free-form by design. We can't classify as canonical/unresolved
    // generically; we attempt vocab resolution and mark whether it hit.
    const intentRaw = el.getAttribute('fx-intent')
    const intentRes = resolveRaw('intents', intentRaw, lang)

    // Apply page-level defaults when per-action value is absent.
    const finalConfirm    = conf.value    ?? defaultFor('confirm',    lang)
    const finalAuthority  = auth.value    ?? defaultFor('authority',  lang)
    const finalReversible = rev.value     ?? defaultFor('reversible', lang)

    // Track which fields had unresolved localized values (for validators/schema).
    const unresolved = []
    if (cls.status === 'unresolved') unresolved.push('class')
    if (conf.status === 'unresolved') unresolved.push('confirm')
    if (rev.status === 'unresolved') unresolved.push('reversible')
    if (auth.status === 'unresolved') unresolved.push('authority')
    if (effectClassified) {
      for (let i = 0; i < effectClassified.length; i++) {
        if (effectClassified[i].status === 'unresolved') unresolved.push('effect[' + i + ']')
      }
    }
    // Intent is suspect when page is non-en AND vocab didn't resolve it.
    const intentSuspect = intentRaw != null && lang !== 'en' && !intentRes.resolved
    if (intentSuspect) unresolved.push('intent')

    actions.push({
      element: {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        text: (el.textContent || '').trim().slice(0, 120),
      },
      lang,
      mechanics: {
        url:     attr('action') || null,
        method:  (attr('method') || 'GET').toUpperCase(),
        target:  attr('target') || null,
        swap:    attr('swap') || null,
        trigger: attr('trigger') || null,
      },
      affordance: {
        intent:        intentRes.value,
        subject:       el.getAttribute('fx-subject') || null,
        class:         cls.value,
        effect:        effectClassified ? effectClassified.map(e => e.value) : null,
        confirm:       finalConfirm,
        authority:     finalAuthority,
        reversible:    finalReversible,
        undo:          el.getAttribute('fx-undo') || null,
        precondition:  el.getAttribute('fx-precondition') || null,
        postcondition: el.getAttribute('fx-postcondition') || null,
      },
      _meta: {
        unresolved,                          // localizable fields where value isn't canonical and didn't translate
        defaultsApplied: {                    // fields whose final value came from page-meta default
          confirm:    conf.value == null && finalConfirm    != null,
          authority:  auth.value == null && finalAuthority  != null,
          reversible: rev.value  == null && finalReversible != null,
        },
        intentResolved: intentRes.resolved,
      },
    })
  }
  return actions
}

// ── Validation ─────────────────────────────────────────────────────────────
// Surfaces patterns an LLM agent should be cautious about. Severity ladder
// (error > warning > info) escalates with mechanical destructiveness.
export function validate(actions) {
  const warnings = []
  const note = (a, severity, issue) => warnings.push({
    selector: `${a.element.tag}${a.element.id ? '#' + a.element.id : ''}`,
    text: a.element.text.slice(0, 40),
    severity,
    issue,
  })

  for (const a of actions) {
    const aff = a.affordance
    const mech = a.mechanics
    const destructive = DESTRUCTIVE_METHODS.includes(mech.method)

    // v0.2: method-based severity escalation for missing metadata
    if (!aff.intent && !aff.class) {
      const sev = destructive ? 'error' : 'warning'
      const detail = destructive
        ? `method='${mech.method}' is destructive and has no fx-intent/fx-class — agents cannot reason about safety`
        : 'no semantic metadata (fx-intent or fx-class) — agent cannot reason about purpose'
      note(a, sev, detail)
    }

    // Destructive class without confirm
    if (aff.class === 'delete' && !aff.confirm) {
      note(a, 'error', "class='delete' without fx-confirm — agent may auto-execute destructive action")
    }
    // External side effects without confirm
    if (aff.effect && aff.effect.includes('external') && !aff.confirm) {
      note(a, 'error', "effect contains 'external' without fx-confirm — external side effects should require confirmation")
    }
    // Reversibility contract broken
    if (aff.reversible === 'soft' && !aff.undo) {
      note(a, 'error', "reversible='soft' but no fx-undo provided — broken contract")
    }
    if (aff.reversible === 'no' && aff.undo) {
      note(a, 'warning', "reversible='no' but fx-undo provided — contradictory")
    }
    // Taxonomy coverage
    if (aff.intent && !aff.class) {
      note(a, 'info', 'fx-intent set but no fx-class — agent can match by intent name but cannot group taxonomically')
    }
    // Effect declaration coverage
    if (mech.method !== 'GET' && !aff.effect) {
      note(a, 'info', 'non-GET mechanical method but no fx-effect declared — agent must guess at server-state mutation')
    }
    // Postcondition for verifiability
    if ((aff.class === 'delete' || aff.class === 'update' || aff.class === 'create') && !aff.postcondition) {
      note(a, 'info', `class='${aff.class}' without fx-postcondition — agent cannot verify success beyond HTTP status`)
    }

    // v0.2: unresolved localized values
    if (a._meta && a._meta.unresolved && a._meta.unresolved.length) {
      for (const field of a._meta.unresolved) {
        const value = field.startsWith('effect[')
          ? aff.effect[Number(field.slice(7, -1))]
          : aff[field]
        note(a, 'warning',
          `${field}='${value}' is not in v0.2 canonical vocabulary on a ${a.lang === 'en' ? 'lang=en' : `lang=${a.lang}`} page — likely localized but unresolved, or app-specific extension`)
      }
    }
  }
  return warnings
}

// ── Anthropic tool-use schema generator (v0.2) ─────────────────────────────
// Each affordance-tagged action with a resolvable intent becomes a tool an
// LLM can be asked to invoke. Returns {tools, warnings}:
//   - tools:    array of {name, description, input_schema}, canonical names only
//   - warnings: actions that were dropped or have suspect names (with reason)
//
// v0.2 invariant: tool names MUST be canonical (English or app-specific
// English-equivalent) so an LLM can invoke a tool by name without knowing
// which language the page uses. If an intent is on a non-en page and didn't
// resolve through vocab, the tool is dropped from the schema and surfaced
// as a warning so the page author can register canonical intents.
//
// Input schema is empty in v0.2 — a future version should extract form
// fields from the action's associated <form> and surface them.
export function toAnthropicSchema(actions) {
  const tools = []
  const warnings = []
  for (const a of actions) {
    const aff = a.affordance
    if (!aff.intent && !aff.class) continue

    // Drop if intent is suspect-localized (per _meta.unresolved).
    if (a._meta && a._meta.unresolved && a._meta.unresolved.includes('intent')) {
      warnings.push({
        selector: `${a.element.tag}${a.element.id ? '#' + a.element.id : ''}`,
        text: a.element.text.slice(0, 40),
        action: 'dropped',
        reason: `intent='${aff.intent}' on lang=${a.lang} page did not resolve through vocab; canonical name needed for stable agent tool reference`,
      })
      continue
    }

    const name = aff.intent || `${aff.class}-${a.element.id || a.element.tag}`
    const desc = [
      a.element.text || aff.intent || aff.class,
      aff.subject ? `Subject: ${aff.subject}.` : null,
      aff.class ? `Class: ${aff.class}.` : null,
      aff.effect ? `Effects: ${aff.effect.join(', ')}.` : null,
      aff.confirm && aff.confirm !== 'none' ? `Requires confirmation: ${aff.confirm}.` : null,
      aff.authority ? `Authority: ${aff.authority}.` : null,
      aff.reversible === 'no' ? 'NOT reversible.' :
        aff.reversible ? `Reversible: ${aff.reversible}${aff.undo ? ` via ${aff.undo}` : ''}.` : null,
      aff.precondition ? `Precondition: ${aff.precondition}.` : null,
      aff.postcondition ? `Postcondition: ${aff.postcondition}.` : null,
    ].filter(Boolean).join(' ')
    tools.push({
      name,
      description: desc,
      input_schema: { type: 'object', properties: {} },
    })
  }
  return { tools, warnings }
}

// ── CLI ────────────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  if (!args.length || args.includes('--help')) {
    console.error(`Usage: node tools/agent-reader.mjs <url-or-file> [options]

Options:
  --validate            print validation warnings to stderr
  --schema=anthropic    emit Anthropic tool-use schema instead of action graph
  --help                show this help

Examples:
  node tools/agent-reader.mjs http://localhost:3022/demo/agent-demo/index.html
  node tools/agent-reader.mjs demo/agent-demo/index.es.html --validate
  node tools/agent-reader.mjs http://.../page --schema=anthropic`)
    process.exit(args.includes('--help') ? 0 : 1)
  }

  const { chromium } = await import('playwright')
  const path = await import('node:path')

  const input = args[0]
  const validateFlag = args.includes('--validate')
  const schemaFlag = args.find(a => a.startsWith('--schema='))
  const schema = schemaFlag ? schemaFlag.split('=')[1] : null

  const url = /^https?:/.test(input)
    ? input
    : `file://${path.resolve(input)}`

  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')

  const actions = await page.evaluate(readAffordances)
  const warnings = validate(actions)

  await browser.close()

  if (schema === 'anthropic') {
    const result = toAnthropicSchema(actions)
    console.log(JSON.stringify(result.tools, null, 2))
    if (result.warnings.length) {
      console.error(`\n${result.warnings.length} schema warning(s) (dropped from tools):`)
      for (const w of result.warnings) {
        console.error(`  [${w.action}] [${w.selector}] "${w.text}" — ${w.reason}`)
      }
    }
  } else {
    console.log(JSON.stringify(actions, null, 2))
  }

  if (validateFlag && warnings.length) {
    // Sort errors first, warnings second, info last.
    const order = { error: 0, warning: 1, info: 2 }
    const sorted = [...warnings].sort((a, b) => order[a.severity] - order[b.severity])
    console.error(`\n${warnings.length} validation issue(s):`)
    for (const w of sorted) {
      console.error(`  [${w.severity.padEnd(7)}] [${w.selector}] "${w.text}" — ${w.issue}`)
    }
  }
}
