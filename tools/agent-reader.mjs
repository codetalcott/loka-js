// Reference reader for the agent-affordance vocabulary defined in
// AGENT_AFFORDANCES.md (v0.1). Two roles:
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
// Status: exploratory. Built to live-test the v0.1 vocabulary; expect both
// the spec and this reader to evolve based on what we hit.

// ── In-page reader ─────────────────────────────────────────────────────────
// Pure DOM, no external refs. Safe to page.evaluate() in Playwright.
export function readAffordances(root) {
  root = root || (typeof document !== 'undefined' ? document : null)
  if (!root) throw new Error('readAffordances needs a DOM root')

  const langOf = (window.loka && window.loka.langOf) || (() => 'en')
  const affordancesFor = (window.loka && window.loka.affordances) || (() => ({}))
  const nameOf = (elt, key) => (window.fixi && window.fixi.name) ? window.fixi.name(elt, key) : ('fx-' + key)
  const actionSel = (window.fixi && window.fixi.sel) ? window.fixi.sel('action') : '[fx-action]'

  const resolve = (table, value, lang) => {
    if (value == null) return null
    const vocab = affordancesFor(lang)
    return (vocab[table] && vocab[table][value]) || value
  }

  const actions = []
  for (const el of root.querySelectorAll(actionSel)) {
    const lang = langOf(el)
    const attr = (k) => el.getAttribute(nameOf(el, k))

    const effectRaw = el.getAttribute('fx-effect')
    const effect = effectRaw
      ? effectRaw.split(/\s+/).map(v => resolve('effects', v, lang))
      : null

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
        intent:        resolve('intents', el.getAttribute('fx-intent'), lang),
        subject:       el.getAttribute('fx-subject') || null,
        class:         resolve('classes', el.getAttribute('fx-class'), lang),
        effect:        effect,
        confirm:       resolve('confirms', el.getAttribute('fx-confirm'), lang),
        authority:     resolve('authorities', el.getAttribute('fx-authority'), lang),
        reversible:    resolve('reversibilities', el.getAttribute('fx-reversible'), lang),
        undo:          el.getAttribute('fx-undo') || null,
        precondition:  el.getAttribute('fx-precondition') || null,
        postcondition: el.getAttribute('fx-postcondition') || null,
      },
    })
  }
  return actions
}

// ── Validation ─────────────────────────────────────────────────────────────
// Surfaces patterns an LLM agent should be cautious about. Run after
// readAffordances on the result; returns an array of {selector, text, issue}.
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

    // Destructive actions without confirmation gating
    if (aff.class === 'delete' && !aff.confirm) {
      note(a, 'error', "class='delete' without fx-confirm — an agent may auto-execute destructive action")
    }
    // External side effects without confirmation
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
    // Semantic emptiness
    if (!aff.intent && !aff.class) {
      note(a, 'warning', 'no semantic metadata (fx-intent or fx-class) — agent cannot reason about purpose')
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
  }
  return warnings
}

// ── Anthropic tool-use schema generator (v0.1 minimal) ─────────────────────
// Each affordance-tagged action becomes a tool an LLM can be asked to invoke.
// Input schema is empty for v0.1 — a future version should extract form
// fields from the action's associated <form> (if any) and surface them.
export function toAnthropicSchema(actions) {
  return actions
    .filter(a => a.affordance.intent || a.affordance.class)
    .map(a => {
      const aff = a.affordance
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
      return {
        name,
        description: desc,
        input_schema: { type: 'object', properties: {} },
      }
    })
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
    console.log(JSON.stringify(toAnthropicSchema(actions), null, 2))
  } else {
    console.log(JSON.stringify(actions, null, 2))
  }

  if (validateFlag && warnings.length) {
    console.error(`\n${warnings.length} warning(s):`)
    for (const w of warnings) {
      console.error(`  [${w.severity}] [${w.selector}] "${w.text}" — ${w.issue}`)
    }
  }
}
