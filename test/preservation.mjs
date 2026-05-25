// Behavior-preservation smoke test for the patched fixi-family libraries.
//
// Each patched library is loaded WITHOUT the orchestrator. With its
// window.<lib>.* hooks unset, the ??= defaults in each patch should
// produce identical behavior to upstream.
//
// Usage:
//   (server up on :3001)
//   node test/preservation.mjs

import { chromium } from 'playwright';

const BASE = process.env.LOKA_BASE_URL || 'http://127.0.0.1:3001';

const browser = await chromium.launch();
const failures = [];
let totalPass = 0;
let totalChecks = 0;

const runCase = async (label, url, evalFn, after) => {
  console.log(`\n--- ${label} ---`);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
  page.on('request', r => requests.push(`${r.method()} ${r.url()}`));

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  const hooks = await page.evaluate(evalFn);
  const checks = await after(page, hooks, errors, requests);
  for (const [t, msg] of checks) {
    totalChecks++;
    if (t()) { totalPass++; console.log(`  ok  ${msg}`); }
    else { failures.push(`${label}: ${msg}`); console.log(`  FAIL ${msg}`); }
  }
  await ctx.close();
};

// ── fixi defaults ─────────────────────────────────────────────────────────
await runCase(
  'fixi defaults',
  `${BASE}/test/behavior-preservation.html`,
  () => ({
    hasFixi: typeof window.fixi === 'object',
    nameFn: typeof window.fixi?.name,
    eventFn: typeof window.fixi?.event,
    selFn: typeof window.fixi?.sel,
    ignoreSel: window.fixi?.ignoreSel,
    defaultName: window.fixi?.name?.(document.body, 'action'),
    defaultEvent: window.fixi?.event?.(document.body, 'click'),
    defaultSel: window.fixi?.sel?.('action'),
  }),
  async (page, hooks, errors, requests) => {
    await page.click('#btn');
    await page.waitForTimeout(400);
    const outText = (await page.textContent('#out')).trim();
    return [
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
  }
);

// ── paxi defaults ─────────────────────────────────────────────────────────
await runCase(
  'paxi defaults',
  `${BASE}/test/behavior-preservation-paxi.html`,
  () => ({
    hasPaxi: typeof window.paxi === 'object',
    isSwapFn: typeof window.paxi?.isSwap,
    morphTrue: window.paxi?.isSwap?.('morph'),
    outerHTMLFalse: window.paxi?.isSwap?.('outerHTML'),
    nonStringFalse: window.paxi?.isSwap?.(() => {}),
    hasMorphGlobal: typeof window.morph === 'function',
    noMorfarGlobal: window.morfar === undefined,
  }),
  async (page, hooks, errors) => {
    // Set input state, then morph — the <li id> moves rather than reconstructs,
    // so the input element (and its dirty value) survives the reorder.
    await page.fill('#a input', 'alpha');
    await page.fill('#b input', 'beta');
    await page.fill('#c input', 'gamma');
    const sameNodeBefore = await page.evaluate(() => {
      window.__aInput = document.querySelector('#a input');
      return true;
    });
    await page.click('#btn');
    await page.waitForTimeout(400);
    const order = await page.$$eval('#list > li', els => els.map(e => e.id));
    const aInputValue = await page.inputValue('#a input');
    const sameNodeAfter = await page.evaluate(() => document.querySelector('#a input') === window.__aInput);
    return [
      [() => hooks.hasPaxi, 'window.paxi installed'],
      [() => hooks.isSwapFn === 'function', 'window.paxi.isSwap is a function'],
      [() => hooks.morphTrue === true, `default isSwap('morph') === true (got ${hooks.morphTrue})`],
      [() => hooks.outerHTMLFalse === false, `default isSwap('outerHTML') === false (got ${hooks.outerHTMLFalse})`],
      [() => hooks.nonStringFalse === false, `default isSwap(fn) === false (got ${hooks.nonStringFalse})`],
      [() => hooks.hasMorphGlobal, 'window.morph exposed by paxi'],
      [() => hooks.noMorfarGlobal, 'window.morfar NOT exposed (no orchestrator, no aliasing)'],
      [() => sameNodeBefore, 'captured pre-morph input node reference'],
      [() => JSON.stringify(order) === JSON.stringify(['c','a','b']), `morph reordered ids to c,a,b (got ${JSON.stringify(order)})`],
      [() => sameNodeAfter, '#a input is the SAME DOM node post-morph (id-keyed identity preserved)'],
      [() => aInputValue === 'alpha', `morph preserved input dirty value across reorder (got "${aInputValue}")`],
      [() => errors.length === 0, `no runtime errors (got ${errors.length}: ${errors.join('; ')})`],
    ];
  }
);

// ── moxi defaults ─────────────────────────────────────────────────────────
await runCase(
  'moxi defaults',
  `${BASE}/test/behavior-preservation-moxi.html`,
  () => ({
    hasMoxi:    typeof window.moxi === 'object',
    nameFn:     typeof window.moxi?.name,
    eventFn:    typeof window.moxi?.event,
    modFn:      typeof window.moxi?.modifier,
    xpathFn:    typeof window.moxi?.xpath,
    ignoreSel:  window.moxi?.ignoreSel,
    nameLive:   window.moxi?.name?.(document.body, 'live'),
    nameOn:     window.moxi?.name?.(document.body, 'on-'),
    eventClick: window.moxi?.event?.(document.body, 'click'),
    modPrev:    window.moxi?.modifier?.('prevent'),
    xpathStr:   window.moxi?.xpath?.(),
    hasGlobalQ: typeof window.q === 'function',
  }),
  async (page, hooks, errors) => {
    await page.fill('#name', 'World');
    await page.waitForTimeout(150);
    const greeting = (await page.textContent('#g')).trim();
    await page.click('#inc');
    await page.click('#inc');
    await page.click('#inc');
    await page.waitForTimeout(100);
    const count = (await page.textContent('#count')).trim();
    await page.click('#submit');
    await page.waitForTimeout(150);
    const out = (await page.textContent('#out')).trim();
    return [
      [() => hooks.hasMoxi, 'window.moxi installed'],
      [() => hooks.nameFn === 'function', 'window.moxi.name is a function'],
      [() => hooks.eventFn === 'function', 'window.moxi.event is a function'],
      [() => hooks.modFn === 'function', 'window.moxi.modifier is a function'],
      [() => hooks.xpathFn === 'function', 'window.moxi.xpath is a function'],
      [() => hooks.ignoreSel === '[mx-ignore]', `default ignoreSel === '[mx-ignore]' (got ${hooks.ignoreSel})`],
      [() => hooks.nameLive === 'live', `default name(_, 'live') === 'live' (got ${hooks.nameLive})`],
      [() => hooks.nameOn === 'on-', `default name(_, 'on-') === 'on-' (got ${hooks.nameOn})`],
      [() => hooks.eventClick === 'click', `default event(_, 'click') === 'click' (got ${hooks.eventClick})`],
      [() => hooks.modPrev === 'prevent', `default modifier('prevent') === 'prevent' (got ${hooks.modPrev})`],
      [() => hooks.xpathStr?.includes("starts-with(name(),'on-')"), `default xpath includes upstream prefix test`],
      [() => hooks.hasGlobalQ, 'window.q exposed by moxi'],
      [() => greeting === 'hello World', `live updated greeting (got "${greeting}")`],
      [() => count === '3', `on-click fired 3 times (got count="${count}")`],
      [() => out === 'sent (no reload)', `on-submit.prevent fired (got "${out}")`],
      [() => errors.length === 0, `no runtime errors (got ${errors.length}: ${errors.join('; ')})`],
    ];
  }
);

await browser.close();

console.log(`\n${totalPass}/${totalChecks} checks passed`);
if (failures.length) {
  console.error('\n--- FAIL ---');
  failures.forEach(f => console.error(' • ' + f));
  process.exit(1);
}
console.log('--- PASS ---');
