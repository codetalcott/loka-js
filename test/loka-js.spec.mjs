// loka-js acceptance test suite.
//
//   npx http-server . -p 3002 -c-1 -s &
//   node test/loka-js.spec.mjs
//
// Phase A: M2 button demo (Latin/CJK/RTL, fetch + swap, dynamic injection).
//          Verifies that the orchestrator + patched fixi handle the same
//          interactions dixi handled, with no DOM mutation.
//
// Phase B: M2.5 search demo per-locale (search filter via moxi on-input,
//          sidebar toggle via moxi on-click, doc-loading via patched fixi).
//          Moxi handlers are in canonical English; loka-js v0 only patches
//          fixi.
//
// Phase C: Per-element language — a page with <html lang="en"> containing
//          <section lang="es"> and <section lang="ja"> sections, each with
//          their own localized fx-* buttons. This case the preprocessor
//          approach (dixi) cannot do.
//
// Phase D: Devtools faithfulness + no-MutationObserver verification.

import { chromium } from 'playwright';

const BASE = process.env.LOKA_BASE_URL || 'http://127.0.0.1:3002';
const BUTTON_DEMO = `${BASE}/demo/index.html`;
const SEARCH_DEMO = locale => `${BASE}/demo/search/index.${locale}.html`;
const PEL_DEMO = `${BASE}/demo/per-element-lang/index.html`;

const browser = await chromium.launch();
const failures = [];
const log = msg => console.log(msg);

const grab = (page, sel) =>
  page.evaluate(s => {
    const el = document.querySelector(s);
    return el ? Object.fromEntries([...el.attributes].map(a => [a.name, a.value])) : null;
  }, sel);

// ---------------------------------------------------------------------------
// Phase A — M2 button demo
// ---------------------------------------------------------------------------
async function phaseA() {
  log('\n=== Phase A: M2 button demo ===');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
  page.on('request', r => requests.push(`${r.method()} ${r.url()}`));

  await page.goto(BUTTON_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  const initial = {
    en: await grab(page, 'section:nth-of-type(1) button'),
    es: await grab(page, 'section[lang="es"] button'),
    ja: await grab(page, 'section[lang="ja"] button'),
    ar: await grab(page, 'section[lang="ar"] button'),
  };

  requests.length = 0;
  const clickAndRead = async (sel, target) => {
    await page.click(sel);
    await page.waitForTimeout(800);
    return (await page.textContent(target)).trim();
  };

  const enSwap = await clickAndRead('section:nth-of-type(1) button', '#target-en');
  const esSwap = await clickAndRead('section[lang="es"] button', '#target-es');
  const jaSwap = await clickAndRead('section[lang="ja"] button', '#target-ja');
  const arSwap = await clickAndRead('section[lang="ar"] button', '#target-ar');

  await page.click('#inject');
  await page.waitForTimeout(150);
  const injected = await grab(page, '#injected button');
  await page.click('#injected button');
  await page.waitForTimeout(800);
  const injectedSwap = (await page.textContent('#injected-target')).trim();

  // KEY DIFFERENCE FROM DIXI: attributes are NOT rewritten. The Spanish
  // button still has fx-acción, not fx-action. fixi reads via the hook.
  const checks = [
    [() => initial.en && initial.en['fx-action'], 'A: English button keeps canonical fx-action'],
    [() => initial.es && initial.es['fx-acción'], 'A: Spanish button RETAINS fx-acción (not mutated)'],
    [() => initial.es && !initial.es['fx-action'], 'A: Spanish button has no fx-action (no mutation)'],
    [() => initial.ja && initial.ja['fx-アクション'], 'A: Japanese button RETAINS fx-アクション (not mutated)'],
    [() => initial.ar && initial.ar['fx-إجراء'], 'A: Arabic button RETAINS fx-إجراء (not mutated)'],
    [() => requests.some(r => r.includes('hello.html')), 'A: English fetch missed'],
    [() => requests.some(r => r.includes('hola.html')), 'A: Spanish fetch missed'],
    [() => requests.some(r => r.includes('konnichiwa.html')), 'A: Japanese fetch missed'],
    [() => requests.some(r => r.includes('marhaba.html')), 'A: Arabic fetch missed'],
    [() => enSwap.includes('Hello'), 'A: English swap missed'],
    [() => esSwap.includes('Hola'), 'A: Spanish swap missed'],
    [() => jaSwap.includes('こんにちは'), 'A: Japanese swap missed'],
    [() => arSwap.includes('مرحبا'), 'A: Arabic swap missed'],
    [() => injected && injected['fx-acción'], 'A: Injected button RETAINS fx-acción (not mutated)'],
    [() => injectedSwap.includes('Hola'), 'A: Injected swap missed'],
    [() => errors.length === 0, `A: ${errors.length} runtime errors: ${errors.join('; ')}`],
  ];
  let pass = 0;
  for (const [t, msg] of checks) { if (t()) pass++; else failures.push(msg); }
  log(`  ${pass}/${checks.length} checks passed`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// Phase B — M2.5 search demo per-locale
// ---------------------------------------------------------------------------
async function phaseB(locale) {
  log(`\n=== Phase B: search demo (${locale}) ===`);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`${locale} pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`${locale} console.error: ${m.text()}`); });

  await page.goto(SEARCH_DEMO(locale), { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  const toggleAttrs = await grab(page, 'header .toggle');
  const inputAttrs = await grab(page, '.search input');
  const firstItemAttrs = await grab(page, '.doc-item:first-child button');
  const itemCount = await page.locator('.doc-item').count();

  await page.fill('.search input', 'ssexi');
  await page.waitForTimeout(150);
  const visibleAfterFilter = await page.locator('.doc-item:not([hidden])').count();

  await page.fill('.search input', '');
  await page.waitForTimeout(150);
  const visibleAfterClear = await page.locator('.doc-item:not([hidden])').count();

  await page.click('header .toggle');
  await page.waitForTimeout(150);
  const collapsedAfter1 = await page.evaluate(() => document.body.classList.contains('sidebar-collapsed'));
  await page.click('header .toggle');
  await page.waitForTimeout(150);
  const collapsedAfter2 = await page.evaluate(() => document.body.classList.contains('sidebar-collapsed'));

  await page.click('.doc-item:nth-child(4) button');
  await page.waitForTimeout(800);
  const contentText = (await page.textContent('#content')).trim();

  // First doc-item's fx-* attribute name depends on locale.
  const expectFxName = locale === 'es' ? 'fx-acción'
    : locale === 'ja' ? 'fx-アクション'
    : locale === 'ar' ? 'fx-إجراء'
    : 'fx-action';

  const tag = `B[${locale}]:`;
  const checks = [
    [() => itemCount === 8, `${tag} expected 8 doc-list items, got ${itemCount}`],
    [() => toggleAttrs && toggleAttrs['on-click'] !== undefined, `${tag} toggle button keeps canonical on-click`],
    [() => inputAttrs && inputAttrs['on-input'] !== undefined, `${tag} search input keeps canonical on-input`],
    [() => firstItemAttrs && firstItemAttrs[expectFxName], `${tag} first doc item RETAINS ${expectFxName} (not mutated)`],
    [() => visibleAfterFilter === 1, `${tag} search 'ssexi' should show 1 item, got ${visibleAfterFilter}`],
    [() => visibleAfterClear === 8, `${tag} clearing search should show 8 items, got ${visibleAfterClear}`],
    [() => collapsedAfter1 === true, `${tag} sidebar toggle did not add 'sidebar-collapsed' class`],
    [() => collapsedAfter2 === false, `${tag} sidebar toggle did not remove 'sidebar-collapsed' class on 2nd click`],
    [() => contentText.includes('moxi'), `${tag} clicking moxi.js did not load fragment ('${contentText.slice(0, 60)}...')`],
    [() => errors.length === 0, `${tag} ${errors.length} runtime errors: ${errors.join('; ')}`],
  ];
  let pass = 0;
  for (const [t, msg] of checks) { if (t()) pass++; else failures.push(msg); }
  log(`  ${pass}/${checks.length} checks passed`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// Phase C — Per-element language (the dixi-impossible case)
// ---------------------------------------------------------------------------
async function phaseC() {
  log('\n=== Phase C: per-element language ===');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
  page.on('request', r => requests.push(`${r.method()} ${r.url()}`));

  await page.goto(PEL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // Three buttons, three languages, all in one <html lang="en"> page.
  await page.click('#en-button');
  await page.waitForTimeout(400);
  const enText = (await page.textContent('#en-target')).trim();

  await page.click('#es-button');
  await page.waitForTimeout(400);
  const esText = (await page.textContent('#es-target')).trim();

  await page.click('#ja-button');
  await page.waitForTimeout(400);
  const jaText = (await page.textContent('#ja-target')).trim();

  const checks = [
    [() => requests.some(r => r.includes('hello.html')), 'C: English (outer lang) fetch missed'],
    [() => requests.some(r => r.includes('hola.html')), 'C: Spanish (section lang) fetch missed'],
    [() => requests.some(r => r.includes('konnichiwa.html')), 'C: Japanese (section lang) fetch missed'],
    [() => enText.includes('Hello'), `C: English target swap (got "${enText.slice(0, 40)}")`],
    [() => esText.includes('Hola'), `C: Spanish target swap (got "${esText.slice(0, 40)}")`],
    [() => jaText.includes('こんにちは'), `C: Japanese target swap (got "${jaText.slice(0, 40)}")`],
    [() => errors.length === 0, `C: ${errors.length} runtime errors: ${errors.join('; ')}`],
  ];
  let pass = 0;
  for (const [t, msg] of checks) { if (t()) pass++; else failures.push(msg); }
  log(`  ${pass}/${checks.length} checks passed`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// Phase D — Devtools faithfulness + structural invariants
// ---------------------------------------------------------------------------
async function phaseD() {
  log('\n=== Phase D: faithfulness + invariants ===');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(SEARCH_DEMO('es'), { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  const findings = await page.evaluate(() => ({
    // Devtools faithfulness: the localized attribute names are still there.
    spanishItemFound: !!document.querySelector('[fx-acción]'),
    spanishItemMissingCanonical: !document.querySelector('.doc-item button[fx-action]'),
    // Hook installation
    fixiHookInstalled: typeof window.fixi?.name === 'function',
    nameReturnsLocalized: window.fixi?.name?.(document.body, 'action') === 'fx-acción',
    selIncludesLocalized: window.fixi?.sel?.('action').includes('fx-acción'),
  }));

  const tag = 'D:';
  const checks = [
    [() => findings.spanishItemFound, `${tag} devtools shows fx-acción in source (not mutated)`],
    [() => findings.spanishItemMissingCanonical, `${tag} no fx-action attrs on doc-items (would mean mutation happened)`],
    [() => findings.fixiHookInstalled, `${tag} window.fixi.name is a function`],
    [() => findings.nameReturnsLocalized, `${tag} window.fixi.name(document.body, 'action') returns fx-acción for lang=es`],
    [() => findings.selIncludesLocalized, `${tag} window.fixi.sel('action') includes fx-acción`],
  ];
  let pass = 0;
  for (const [t, msg] of checks) { if (t()) pass++; else failures.push(msg); }
  log(`  ${pass}/${checks.length} checks passed`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// Run all phases
// ---------------------------------------------------------------------------
await phaseA();
for (const locale of ['en', 'es', 'ja', 'ar']) await phaseB(locale);
await phaseC();
await phaseD();
await browser.close();

if (failures.length) {
  log('\n--- FAIL ---');
  failures.forEach(f => log(' • ' + f));
  process.exit(1);
}
log('\n--- PASS ---  M2 + M2.5 × 4 locales + per-element-lang + faithfulness');
