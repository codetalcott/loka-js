#!/usr/bin/env node
// Scripted (deterministic) agent that drives the incident_response workflow.
//
// Loop:
//   1. Read the Spanish HTML page (via Playwright + agent-reader)
//      → action graph in canonical English
//   2. Create an incident in the grail-domains backend
//   3. Query the backend for current truth vector (which conditions are true)
//   4. Backward-chain from goal `incident.resolved` to build a phase-ordered plan
//   5. Execute each step:
//      - Substitute the real incident id into the URL
//      - POST with stubbed field values
//      - Re-query truth, verify the step's effects became true
//   6. Stop when the goal condition is true
//
// No LLM call — this is the deterministic dataflow proof. The same data shape
// could be handed to a real LLM (via modfixi/agent-harness) as a next step.
//
// Usage:
//   (incident_response backend up on :8091)
//   (loka-js static server up on :3036)
//   node examples/incident-triage-es/agent.mjs

import { chromium } from 'playwright'
import { readAffordances } from '../../tools/agent-reader.mjs'

const PAGE_URL = process.env.PAGE_URL || 'http://127.0.0.1:3036/examples/incident-triage-es/index.html'
const BACKEND  = process.env.BACKEND  || 'http://127.0.0.1:8091'
const GOAL     = 'incident.resolved'
const TEMPLATE_ID = '42'   // matches the hardcoded /incidents/42/... in the page

// ── Phase 1: read affordances from the Spanish page ─────────────────────────
console.log('1. Reading Spanish affordance page → canonical action graph')
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
await page.waitForLoadState('networkidle')
const actions = await page.evaluate(readAffordances)
await browser.close()
console.log(`   ${actions.length} actions extracted`)
const byName = Object.fromEntries(actions.map(a => [a.name, a]))

// ── Phase 2: create an incident in the backend ──────────────────────────────
console.log('\n2. Creating incident in grail-domains backend')
const newIncident = await fetch(`${BACKEND}/incidents`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/vnd.siren+json' },
  body: JSON.stringify({ title: 'DB outage in eu-west', severity: '' }),
}).then(r => r.json())
const incidentId = newIncident.properties.id
console.log(`   incident #${incidentId} created`)

// ── Phase 3: state query helper ─────────────────────────────────────────────
const getState = async () => {
  const r = await fetch(`${BACKEND}/incidents/${incidentId}`, {
    headers: { 'Accept': 'application/vnd.siren+json' },
  }).then(r => r.json())
  return r.properties.conditions
}

console.log('\n3. Initial truth vector:')
const initial = await getState()
for (const [k, v] of Object.entries(initial)) {
  if (v) console.log(`   ✓ ${k}`)
}

// ── Phase 4: backward-chain a plan ──────────────────────────────────────────
// Walk back from the goal: for each unmet condition, find an action that
// produces it; push its preconditions onto the queue. Topological sort the
// result so dependencies come first. Multi-precondition affordances (e.g.,
// write-postmortem requires both verify-health AND stakeholders.notified)
// become two parallel branches that converge in the plan.
console.log('\n4. Planning (backward chain from goal: ' + GOAL + ')')
const plan = (() => {
  const truth = initial
  const needed = new Map()   // affordance name → action object
  const stack = [GOAL]
  const visited = new Set()
  while (stack.length) {
    const cond = stack.pop()
    if (truth[cond]) continue
    if (visited.has(cond)) continue
    visited.add(cond)
    const producer = actions.find(a => a.effects && a.effects.includes(cond))
    if (!producer) throw new Error(`no producer for condition: ${cond}`)
    needed.set(producer.name, producer)
    for (const pre of (producer.preconditions || [])) stack.push(pre)
  }
  // Topological sort: an action with all preconditions satisfied (by truth or
  // by earlier plan steps) can go next. Iterate until empty.
  const planArr = []
  const placed = new Set()
  const willSatisfy = new Set(Object.entries(truth).filter(([,v]) => v).map(([k]) => k))
  while (needed.size > planArr.length) {
    let advanced = false
    for (const [name, act] of needed) {
      if (placed.has(name)) continue
      const allPresSatisfied = !act.preconditions || act.preconditions.every(p => willSatisfy.has(p))
      if (allPresSatisfied) {
        planArr.push(act)
        placed.add(name)
        for (const eff of (act.effects || [])) willSatisfy.add(eff)
        advanced = true
      }
    }
    if (!advanced) throw new Error('plan deadlock — circular preconditions?')
  }
  return planArr
})()
console.log(`   ${plan.length}-step plan, total cost = ${plan.reduce((s, a) => s + (a.cost || 0), 0)}`)
for (let i = 0; i < plan.length; i++) {
  const a = plan[i]
  console.log(`   ${i + 1}. ${a.name} (cost ${a.cost || '?'}) ${a.preconditions ? '← ' + a.preconditions.join(' ') : ''} → ${a.effects.join(' ')}`)
}

// ── Phase 5: stub field values for each affordance ──────────────────────────
const FIELD_STUBS = {
  'classify-severity':   { severity: 'p2' },
  'assign-owner':        { owner: 'agente.demo@ejemplo.com' },
  'investigate':         { notes: 'Causa raíz: pérdida de conexión a réplica primaria de eu-west, failover automatizado tardó 4 minutos.' },
  'mitigate':            { summary: 'Failover manual completado a réplica de eu-central. Latencia restaurada.' },
  'write-postmortem':    { content: 'Postmortem: el failover automatizado tiene un tiempo de detección de 5 minutos; reducir a 60 segundos.' },
  'create-actions':      { items: 'A1: ajustar timeout del health-check de réplica. A2: añadir alerta proactiva sobre tiempo de failover.' },
}

// ── Phase 6: execute ────────────────────────────────────────────────────────
console.log('\n5. Executing plan')
for (let i = 0; i < plan.length; i++) {
  const step = plan[i]
  const url = step.mechanics.href.replace(`/${TEMPLATE_ID}/`, `/${incidentId}/`)
  const body = FIELD_STUBS[step.name] || {}
  const tag = `[${i + 1}/${plan.length} ${step.name}]`
  process.stdout.write(`   ${tag} POST ${url}`)
  if (Object.keys(body).length) process.stdout.write(`  body=${JSON.stringify(body)}`)
  process.stdout.write(' … ')

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/vnd.siren+json' },
    body: Object.keys(body).length ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const txt = await res.text()
    console.log(`HTTP ${res.status}`)
    console.error(`   FAIL: ${txt.slice(0, 300)}`)
    process.exit(1)
  }
  console.log(`HTTP ${res.status}`)

  // Verify effects landed.
  const state = await getState()
  const missing = (step.effects || []).filter(e => !state[e])
  if (missing.length) {
    console.error(`   WARN: declared effects not satisfied: ${missing.join(', ')}`)
  }
}

// ── Phase 7: confirm goal ──────────────────────────────────────────────────
console.log('\n6. Final truth vector (after plan execution):')
const final = await getState()
for (const [k, v] of Object.entries(final)) {
  if (v) console.log(`   ✓ ${k}`)
}

if (final[GOAL]) {
  console.log(`\n✓ GOAL REACHED: ${GOAL} is true`)
} else {
  console.log(`\n✗ GOAL NOT REACHED: ${GOAL} is still false`)
  process.exit(1)
}
