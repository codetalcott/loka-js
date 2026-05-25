// INTERNAL / IN-PROGRESS — see GRAIL_HTML_BINDING.md and the main README
// for status. This tool is part of the parked affordance work, not the
// loka localization pitch. Used by examples/incident-triage-es/ internally;
// not yet ready for external use or public reference.
//
// Reference reader for the HTML attribute binding for GRAIL defined in
// GRAIL_HTML_BINDING.md (v0.3). Two roles:
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
// v0.3 changes from v0.2 (alignment with grail-spec v1.0.0):
//   - Renamed: fx-precondition  -> fx-preconditions (plural, GRAIL term)
//   - Renamed: fx-postcondition -> fx-effects       (GRAIL term)
//   - Added:   fx-cost          (non-neg int; was deferred in v0.2)
//   - Changed: fx-confirm is now a free-form message string (was enum)
//   - Removed: fx-reversible, fx-undo, fx-authority, fx-effect (taxonomy).
//     These were v0.2 inventions that GRAIL primitives express better
//     (reversal is just another affordance with linked preconditions;
//     authority is a precondition like `user.role.admin`).
//   - Output shape now Siren-action-shaped (href/method/name/preconditions/
//     effects/cost/confirm) with fixi-side extensions in _extensions.

// Canonical taxonomy for fx-class (the only field with a fixed enum in v0.3).
// Other values (intents, condition names, confirm messages) are application-
// specific by GRAIL's design.
const CLASS_TAXONOMY = ['read','create','update','delete','navigate','search','toggle','open','close']
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
  const CLASS_VALUES = ['read','create','update','delete','navigate','search','toggle','open','close']

  // Returns {value, resolved} so caller can tell if vocab translation hit.
  const resolveRaw = (table, value, lang) => {
    if (value == null) return {value: null, resolved: false}
    const vocab = affordancesFor(lang)
    const hit = vocab[table] && vocab[table][value]
    return hit ? {value: hit, resolved: true} : {value, resolved: false}
  }
  const resolve = (table, value, lang) => resolveRaw(table, value, lang).value

  // Page-level defaults from <meta name="fx-affordances" content="...">.
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

  // Apply defaults (with vocab resolution for relevant fields).
  const defaultFor = (field, lang) => {
    const v = defaults['default-' + field]
    if (v == null) return null
    if (field === 'cost') {
      const n = parseInt(v, 10)
      return Number.isFinite(n) ? n : null
    }
    // confirm is a free-form string; no vocab resolution
    return v
  }

  // Classify fx-class against canonical taxonomy + vocab resolution.
  const classifyClass = (raw, lang) => {
    if (raw == null) return {value: null, status: 'absent'}
    const {value, resolved} = resolveRaw('classes', raw, lang)
    if (resolved) return {value, status: 'resolved'}
    if (CLASS_VALUES.includes(value)) return {value, status: 'canonical'}
    return {value, status: 'unresolved'}
  }

  const actions = []
  for (const el of root.querySelectorAll(actionSel)) {
    const lang = langOf(el)
    const attr = (k) => el.getAttribute(nameOf(el, k))

    // Mechanical (fixi-side) attrs.
    const href   = attr('action') || null
    const method = (attr('method') || 'GET').toUpperCase()
    const target = attr('target') || null
    const swap   = attr('swap') || null

    // GRAIL-aligned affordance fields.
    // preconditions, effects: space-separated condition tokens. Each token
    // goes through the conditions vocab for localized -> canonical resolution.
    const splitConditions = (raw) => {
      if (raw == null) return null
      const tokens = raw.split(/\s+/).filter(Boolean)
      return tokens.map(t => resolve('conditions', t, lang))
    }
    const preconditions = splitConditions(el.getAttribute('fx-preconditions'))
    const effects       = splitConditions(el.getAttribute('fx-effects'))

    // cost: integer, with default fallback.
    let cost = null
    const costRaw = el.getAttribute('fx-cost')
    if (costRaw != null) {
      const n = parseInt(costRaw, 10)
      cost = Number.isFinite(n) ? n : null
    }
    if (cost === null) cost = defaultFor('cost', lang)

    // confirm: free-form string (non-empty = required).
    let confirm = el.getAttribute('fx-confirm')
    if (confirm == null) confirm = defaultFor('confirm', lang)

    // intent: free-form, vocab-resolvable.
    const intentRaw = el.getAttribute('fx-intent')
    const intentRes = resolveRaw('intents', intentRaw, lang)

    // class: enum, canonical taxonomy.
    const cls = classifyClass(el.getAttribute('fx-class'), lang)

    // subject: free-form, no resolution.
    const subject = el.getAttribute('fx-subject') || null

    // Track which fields are localized-but-unresolved (for validator/schema).
    const unresolved = []
    if (cls.status === 'unresolved') unresolved.push('class')
    if (intentRaw != null && lang !== 'en' && !intentRes.resolved) unresolved.push('intent')
    // For preconditions and effects, we'd need to know the canonical set per
    // app; for now, only flag if the raw value contains non-ASCII on non-en
    // pages (heuristic — Spanish 'usuario.rol.dueño' triggers).
    const condUnresolved = (raw, field) => {
      if (raw == null || lang === 'en') return
      const tokens = raw.split(/\s+/).filter(Boolean)
      tokens.forEach((t, i) => {
        const {resolved} = resolveRaw('conditions', t, lang)
        if (!resolved && /[^\x00-\x7f]/.test(t)) unresolved.push(`${field}[${i}]`)
      })
    }
    condUnresolved(el.getAttribute('fx-preconditions'), 'preconditions')
    condUnresolved(el.getAttribute('fx-effects'), 'effects')

    actions.push({
      element: {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        text: (el.textContent || '').trim().slice(0, 120),
      },
      lang,
      mechanics: { href, method, target, swap, trigger: attr('trigger') || null },
      // GRAIL action shape:
      name: intentRes.value,                     // Siren `name` / GRAIL action name
      preconditions,                             // array<string> or null
      effects,                                   // array<string> or null
      cost,                                      // int or null
      confirm,                                   // string or null
      _extensions: {                             // fixi-side, non-GRAIL fields
        class: cls.value,
        subject,
      },
      _meta: {
        unresolved,
        defaultsApplied: {
          cost: el.getAttribute('fx-cost') == null && cost != null,
          confirm: el.getAttribute('fx-confirm') == null && confirm != null,
        },
        intentResolved: intentRes.resolved,
      },
    })
  }
  return actions
}

// ── Validation (v0.3) ──────────────────────────────────────────────────────
// Severity ladder (error/warning/info) escalates with mechanical
// destructiveness. Rules are normative — see GRAIL_HTML_BINDING.md.
export function validate(actions) {
  const warnings = []
  const note = (a, severity, issue) => warnings.push({
    selector: `${a.element.tag}${a.element.id ? '#' + a.element.id : ''}`,
    text: a.element.text.slice(0, 40),
    severity,
    issue,
  })

  for (const a of actions) {
    const mech = a.mechanics
    const destructive = DESTRUCTIVE_METHODS.includes(mech.method)

    // ── Errors ─────────────────────────────────────────────────────────────
    // Destructive method with no agent-visible metadata at all.
    if (destructive && !a.name && !a._extensions.class && !a.preconditions) {
      note(a, 'error',
        `method='${mech.method}' is destructive and has no fx-intent / fx-class / fx-preconditions — agents cannot reason about safety`)
    }
    // Destructive class without confirmation gating.
    if (a._extensions.class === 'delete' && !a.confirm) {
      note(a, 'error', "class='delete' without fx-confirm — agent may auto-execute destructive action")
    }

    // ── Warnings ───────────────────────────────────────────────────────────
    // Semantic emptiness on non-destructive actions.
    if (!a.name && !a._extensions.class && !destructive) {
      note(a, 'warning', 'no semantic metadata (fx-intent or fx-class) — agent cannot reason about purpose')
    }
    // Localized values that didn't resolve.
    if (a._meta && a._meta.unresolved && a._meta.unresolved.length) {
      for (const field of a._meta.unresolved) {
        const value = field === 'class' ? a._extensions.class
          : field === 'intent' ? a.name
          : field.startsWith('preconditions[') ? a.preconditions[Number(field.match(/\[(\d+)\]/)[1])]
          : field.startsWith('effects[') ? a.effects[Number(field.match(/\[(\d+)\]/)[1])]
          : '?'
        note(a, 'warning',
          `${field}='${value}' on lang=${a.lang} page is not in canonical vocabulary — likely localized but unresolved, or app-specific`)
      }
    }

    // ── Info ───────────────────────────────────────────────────────────────
    if (a.name && !a._extensions.class) {
      note(a, 'info', 'fx-intent set but no fx-class — agent can match by intent name but cannot group taxonomically')
    }
    if (mech.method !== 'GET' && !a.effects) {
      note(a, 'info', 'non-GET mechanical method but no fx-effects declared — agent cannot reason about state changes')
    }
    if ((a._extensions.class === 'delete' || a._extensions.class === 'update' || a._extensions.class === 'create') && !a.effects) {
      note(a, 'info', `class='${a._extensions.class}' without fx-effects — agent cannot verify success via condition state`)
    }
  }
  return warnings
}

// ── Anthropic tool-use schema generator (v0.3) ─────────────────────────────
// Each affordance-tagged action with a resolvable name becomes a tool.
// Returns {tools, warnings}. Dropped actions (intent on non-en page that
// didn't resolve through vocab) appear in warnings.
//
// v0.3 invariant: tool names MUST be canonical English. Description text
// includes GRAIL fields (preconditions, effects, cost) so an LLM has the
// full picture without a separate fetch.
export function toAnthropicSchema(actions) {
  const tools = []
  const warnings = []
  for (const a of actions) {
    if (!a.name && !a._extensions.class) continue

    if (a._meta && a._meta.unresolved && a._meta.unresolved.includes('intent')) {
      warnings.push({
        selector: `${a.element.tag}${a.element.id ? '#' + a.element.id : ''}`,
        text: a.element.text.slice(0, 40),
        action: 'dropped',
        reason: `intent='${a.name}' on lang=${a.lang} did not resolve through vocab; canonical name needed for stable agent tool reference`,
      })
      continue
    }

    const name = a.name || `${a._extensions.class}-${a.element.id || a.element.tag}`
    const desc = [
      a.element.text || a.name || a._extensions.class,
      a._extensions.subject ? `Subject: ${a._extensions.subject}.` : null,
      a._extensions.class ? `Class: ${a._extensions.class}.` : null,
      a.preconditions ? `Preconditions: ${a.preconditions.join(', ')}.` : null,
      a.effects ? `Effects: ${a.effects.join(', ')}.` : null,
      a.cost != null && a.cost !== 1 ? `Cost: ${a.cost}.` : null,
      a.confirm ? `Confirm: "${a.confirm}".` : null,
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
    const order = { error: 0, warning: 1, info: 2 }
    const sorted = [...warnings].sort((a, b) => order[a.severity] - order[b.severity])
    console.error(`\n${warnings.length} validation issue(s):`)
    for (const w of sorted) {
      console.error(`  [${w.severity.padEnd(7)}] [${w.selector}] "${w.text}" — ${w.issue}`)
    }
  }
}
