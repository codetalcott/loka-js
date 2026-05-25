#!/usr/bin/env node
// LLM-driven agent that drives the same incident_response workflow as
// agent.mjs, but with a real Claude API call deciding each step.
//
// Uses raw fetch against the Anthropic messages API (no SDK dependency,
// matches loka-js's no-build ethos). Tools are one-per-affordance,
// generated from the page's affordance metadata + per-affordance field
// schemas, plus two protocol tools (get_state, stop_with_summary).
//
// The LLM operates entirely in canonical English space — even though the
// page is in Spanish, the loka HTML binding reader resolves vocab so
// the LLM sees `acknowledge`, `incident.acknowledged`, etc. The author's
// Spanish `fx-confirm` messages pass through unchanged (free-form).
//
// Usage:
//   export ANTHROPIC_API_KEY="..."
//   (grail-domains incident_response backend up on :8091)
//   (loka-js static server up on :3036)
//   node examples/incident-triage-es/llm-agent.mjs

import { chromium } from 'playwright'
import { readAffordances, toAnthropicSchema } from '../../tools/agent-reader.mjs'

const KEY = process.env.ANTHROPIC_API_KEY
if (!KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY not set in env')
  console.error('  export ANTHROPIC_API_KEY="sk-ant-..."')
  console.error('  (or copy from ~/projects/modfixi/examples/agent-harness/.env)')
  process.exit(1)
}

const PAGE_URL    = process.env.PAGE_URL    || 'http://127.0.0.1:3036/examples/incident-triage-es/index.html'
const BACKEND     = process.env.BACKEND     || 'http://127.0.0.1:8091'
const MODEL       = process.env.MODEL       || 'claude-haiku-4-5-20251001'
const GOAL        = 'incident.resolved'
const TEMPLATE_ID = '42'
const MAX_TURNS   = 25

// Per-affordance field schemas. In a future iteration these would be
// surfaced from the page's <form> markup or from GRAIL's affordance
// `fields` registry — for v0.3 the reader doesn't extract form fields,
// so we hardcode them here. (See README's "Friction surfaced" section.)
const FIELD_SCHEMAS = {
  'classify-severity': {
    severity: { type: 'string', enum: ['p1', 'p2', 'p3', 'p4'], description: 'Severity level' },
  },
  'assign-owner': {
    owner: { type: 'string', description: 'Email or name of the responsible person' },
  },
  'investigate': {
    notes: { type: 'string', description: 'Root-cause investigation notes (free text, Spanish or English ok)' },
  },
  'mitigate': {
    summary: { type: 'string', description: 'Summary of the mitigation applied' },
  },
  'write-postmortem': {
    content: { type: 'string', description: 'Postmortem document content' },
  },
  'create-actions': {
    items: { type: 'string', description: 'Follow-up action items' },
  },
}

// ── Phase 1: read affordances ───────────────────────────────────────────────
console.log('1. Reading Spanish affordance page → canonical action graph')
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
await page.waitForLoadState('networkidle')
const actions = await page.evaluate(readAffordances)
await browser.close()
console.log(`   ${actions.length} actions extracted`)
const byName = Object.fromEntries(actions.map(a => [a.name, a]))

// ── Phase 2: create incident ────────────────────────────────────────────────
console.log('\n2. Creating incident')
const inc = await fetch(`${BACKEND}/incidents`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/vnd.siren+json' },
  body: JSON.stringify({ title: 'DB outage in eu-west', severity: '' }),
}).then(r => r.json())
const incidentId = inc.properties.id
console.log(`   incident #${incidentId} created`)

// ── Phase 3: build tools ────────────────────────────────────────────────────
// Per-affordance tools from the page's GRAIL metadata, augmented with field
// schemas where required. Plus two protocol tools.
const { tools: rawAffordanceTools } = toAnthropicSchema(actions)
const tools = [
  ...rawAffordanceTools.map(t => {
    const fields = FIELD_SCHEMAS[t.name] || {}
    const required = Object.keys(fields)
    return {
      ...t,
      input_schema: {
        type: 'object',
        properties: fields,
        ...(required.length ? { required } : {}),
      },
    }
  }),
  {
    name: 'get_state',
    description: 'Return the current truth vector for the incident — which conditions are currently true. Call this first, and after each action, to see what has been accomplished and what remains.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'stop_with_summary',
    description: 'End the agent loop. Call this when the goal condition is true, or when you are blocked and cannot make progress.',
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Brief plain-language description of what was accomplished or what blocked progress.' },
      },
      required: ['summary'],
    },
  },
]

// ── Phase 4: tool execution ─────────────────────────────────────────────────
const getState = async () => {
  const r = await fetch(`${BACKEND}/incidents/${incidentId}`, {
    headers: { 'Accept': 'application/vnd.siren+json' },
  }).then(r => r.json())
  return r.properties.conditions
}

const executeAffordance = async (name, body) => {
  const action = byName[name]
  if (!action) return { error: `unknown affordance: ${name}` }
  const url = action.mechanics.href.replace(`/${TEMPLATE_ID}/`, `/${incidentId}/`)
  const res = await fetch(url, {
    method: action.mechanics.method,
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/vnd.siren+json' },
    body: Object.keys(body || {}).length ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  return { status: res.status, body: text.slice(0, 500) }
}

// ── Phase 5: the loop ───────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an incident triage agent. The user has presented a localized HTML page describing an incident-response workflow. You have one tool per available affordance, plus get_state and stop_with_summary.

Your goal: make the condition "${GOAL}" true.

Approach:
1. Call get_state first to see which conditions are currently true.
2. Find an affordance whose preconditions (visible in the tool description) are all satisfied. Invoke it. Provide field values where the tool's input_schema requires them — use realistic, contextually-appropriate Spanish values where the page is Spanish.
3. Call get_state again to verify the affordance's effects landed.
4. Repeat until ${GOAL} is true, then call stop_with_summary.

Rules:
- Treat condition and affordance names as opaque identifiers. Don't invent names.
- If a tool requires a field, you must provide a value — don't omit required fields.
- If multiple affordances are unblocked, you may run them in any order, but prefer lower-cost ones (cost appears in tool description).
- Limit yourself to ${MAX_TURNS} turns.`

const messages = [
  { role: 'user', content: `Begin. Drive incident #${incidentId} to "${GOAL}".` },
]

console.log(`\n3. Starting LLM loop (model: ${MODEL}, max ${MAX_TURNS} turns)`)
console.log(`   ${tools.length} tools available (${tools.length - 2} affordances + get_state + stop_with_summary)`)

let stopped = false
for (let turn = 0; turn < MAX_TURNS && !stopped; turn++) {
  const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    }),
  })
  if (!apiRes.ok) {
    console.error(`\n   API error: HTTP ${apiRes.status}`)
    console.error(`   ${await apiRes.text()}`)
    process.exit(1)
  }
  const response = await apiRes.json()

  // Append assistant turn to history.
  messages.push({ role: 'assistant', content: response.content })

  // Process all tool_use blocks; assemble a tool_result for each.
  const toolResults = []
  let sawTool = false
  for (const block of response.content) {
    if (block.type === 'text' && block.text.trim()) {
      console.log(`\n   [turn ${turn + 1}] ${block.text.trim().slice(0, 200)}`)
    }
    if (block.type === 'tool_use') {
      sawTool = true
      const { name, input } = block
      if (name === 'stop_with_summary') {
        console.log(`\n   ◇ stop_with_summary: ${input.summary}`)
        stopped = true
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: 'stopped' })
        break
      } else if (name === 'get_state') {
        const state = await getState()
        const trueConds = Object.entries(state).filter(([, v]) => v).map(([k]) => k)
        console.log(`   ▸ get_state → ${trueConds.length} true: ${trueConds.join(', ')}`)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify({ true_conditions: trueConds, false_conditions: Object.entries(state).filter(([, v]) => !v).map(([k]) => k) }),
        })
      } else {
        // Affordance invocation
        const argsStr = Object.keys(input).length ? ` body=${JSON.stringify(input)}` : ''
        process.stdout.write(`   ▸ ${name}${argsStr} … `)
        const result = await executeAffordance(name, input)
        console.log(`HTTP ${result.status}`)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
          is_error: result.status >= 400,
        })
      }
    }
  }

  if (!sawTool) {
    // LLM ended without calling stop_with_summary — treat as done.
    console.log('\n   (no tool_use; LLM ended turn)')
    break
  }

  if (!stopped) {
    messages.push({ role: 'user', content: toolResults })
  }
}

// ── Phase 6: report ─────────────────────────────────────────────────────────
console.log('\n4. Final truth vector:')
const final = await getState()
for (const [k, v] of Object.entries(final)) {
  if (v) console.log(`   ✓ ${k}`)
}
console.log(final[GOAL] ? `\n✓ GOAL REACHED: ${GOAL}` : `\n✗ GOAL NOT REACHED: ${GOAL}`)
process.exit(final[GOAL] ? 0 : 1)
