// Behavior-preservation smoke test for the patched fixi.
//
// Loads test/behavior-preservation.html (which loads fixi.js WITHOUT
// the orchestrator). With window.fixi.{name,event,sel} unset, the ??=
// defaults in the patch should produce identical behavior to upstream.
//
// Usage:
//   (server up on :3001)
//   node test/preservation.mjs

import { chromium } from 'playwright';

const BASE = process.env.LOKA_BASE_URL || 'http://127.0.0.1:3001';
const URL = `${BASE}/test/behavior-preservation.html`;

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const errors = [];
const requests = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', m => {
  if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
});
page.on('request', r => requests.push(`${r.method()} ${r.url()}`));

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle');

// Defaults installed by the patch — verify they exist with the expected shapes.
const hooks = await page.evaluate(() => ({
  hasFixi: typeof window.fixi === 'object',
  nameFn: typeof window.fixi?.name,
  eventFn: typeof window.fixi?.event,
  selFn: typeof window.fixi?.sel,
  ignoreSel: window.fixi?.ignoreSel,
  defaultName: window.fixi?.name?.(document.body, 'action'),
  defaultEvent: window.fixi?.event?.(document.body, 'click'),
  defaultSel: window.fixi?.sel?.('action'),
}));

await page.click('#btn');
await page.waitForTimeout(400);
const outText = (await page.textContent('#out')).trim();

const checks = [
  [() => hooks.hasFixi, 'window.fixi installed'],
  [() => hooks.nameFn === 'function', 'window.fixi.name is a function'],
  [() => hooks.eventFn === 'function', 'window.fixi.event is a function'],
  [() => hooks.selFn === 'function', 'window.fixi.sel is a function'],
  [() => hooks.defaultName === 'fx-action', `default name('action') === 'fx-action' (got ${hooks.defaultName})`],
  [() => hooks.defaultEvent === 'click', `default event(_, 'click') === 'click' (got ${hooks.defaultEvent})`],
  [() => hooks.defaultSel === '[fx-action]', `default sel('action') === '[fx-action]' (got ${hooks.defaultSel})`],
  [() => hooks.ignoreSel === '[fx-ignore]', `default ignoreSel === '[fx-ignore]' (got ${hooks.ignoreSel})`],
  [() => requests.some(r => r.includes('hello.txt')), 'fixi issued the fx-action fetch'],
  [() => outText.includes('Hello from patched fixi'), `swap inserted response (got "${outText}")`],
  [() => errors.length === 0, `no runtime errors (got ${errors.length}: ${errors.join('; ')})`],
];

let pass = 0;
const failures = [];
for (const [t, msg] of checks) {
  if (t()) { pass++; console.log(`  ok  ${msg}`); }
  else { failures.push(msg); console.log(`  FAIL ${msg}`); }
}

await browser.close();

console.log(`\n${pass}/${checks.length} checks passed`);
if (failures.length) {
  console.error('\n--- FAIL ---');
  process.exit(1);
}
console.log('--- PASS ---');
