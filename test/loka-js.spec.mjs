// loka-js acceptance test suite.
//
//   npx http-server . -p 3002 -c-1 -s &
//   node test/loka-js.spec.mjs
//
// Phase A: M2 button demo (Latin/CJK/RTL, fetch + swap, dynamic injection).
//          Verifies that the orchestrator + patched fixi handle multilingual
//          attribute interactions correctly, with no DOM mutation.
//
// Phase B: M2.5 search demo per-locale (search filter via moxi on-input,
//          sidebar toggle via moxi on-click, doc-loading via patched fixi).
//          Moxi handlers are in canonical English; loka-js v0 only patches
//          fixi.
//
// Phase C: Per-element language — a page with <html lang="en"> containing
//          <section lang="es"> and <section lang="ja"> sections, each with
//          their own localized fx-* buttons. Preprocessor-style approaches
//          (rewrite attributes ahead of fixi) can't do this; loka resolves
//          per-element at read-time.
//
// Phase D: Devtools faithfulness + no-MutationObserver verification.
//
// Phase G: paxi — localized fx-intercambio="morfar" triggers morph;
//          window.morfar aliased to window.morph via globalsOptIn.
//
// Phase H: rexi — pure-JS verb aliases (obtener=get, publicar=post, …)
//          land on globalThis via the alias registry; obtener fetch works.
//
// Phase F: ssexi — listener-side event re-fire: dispatching the canonical
//          fx:sse:message synthetically causes fx:sse:mensaje (Spanish alias)
//          to fire on the same target with the same detail.
//
// Phase E: moxi — localized attributes (vivo/al-) + modifiers (.prevenir) +
//          globals (consulta/esperar/transicion) all working end-to-end.
//
// Phase I: joint — all five fixiproject libraries loaded on one Spanish page;
//          each contributes its localized behavior without conflicts.

import { chromium } from 'playwright';

const BASE = process.env.LOKA_BASE_URL || 'http://127.0.0.1:3002';
const BUTTON_DEMO = `${BASE}/demo/index.html`;
const SEARCH_DEMO = locale => `${BASE}/demo/search/index.${locale}.html`;
const PEL_DEMO = `${BASE}/demo/per-element-lang/index.html`;
const PAXI_DEMO = `${BASE}/demo/paxi/index.html`;
const REXI_DEMO = `${BASE}/demo/rexi/index.html`;
const SSEXI_DEMO = `${BASE}/demo/ssexi/index.html`;
const MOXI_DEMO = `${BASE}/demo/moxi/index.html`;
const JOINT_DEMO = `${BASE}/demo/joint-all/index.html`;

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
// Phase C — Per-element language (mixed-lang sections on one page)
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
// Phase G — paxi: localized fx-intercambio="morfar" triggers morph
// ---------------------------------------------------------------------------
async function phaseG() {
  log('\n=== Phase G: paxi (morfar/morph) ===');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

  await page.goto(PAXI_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // Hook + alias verification.
  const findings = await page.evaluate(() => ({
    isSwapMorfar:    window.paxi?.isSwap?.('morfar'),
    isSwapMorph:     window.paxi?.isSwap?.('morph'),
    isSwapOther:     window.paxi?.isSwap?.('outerHTML'),
    isSwapNonString: window.paxi?.isSwap?.(()=>{}),
    morfarAliased:   typeof window.morfar === 'function' && window.morfar === window.morph,
    btnAttr:         document.querySelector('#btn')?.getAttribute('fx-intercambio'),
  }));

  // Pre-fill inputs, click morfar button, verify morph behavior:
  // (1) list reordered to c,a,b per fragment.html
  // (2) input values preserved (morph moves nodes, doesn't recreate)
  // (3) Spanish attribute names still in DOM (no mutation)
  await page.fill('#a input', 'alpha');
  await page.fill('#b input', 'beta');
  await page.fill('#c input', 'gamma');
  await page.click('#btn');
  await page.waitForTimeout(500);

  const order   = await page.$$eval('#list > li', els => els.map(e => e.id));
  const aValue  = await page.inputValue('#a input');
  const btnAttr = await page.getAttribute('#btn', 'fx-intercambio');

  const tag = 'G:';
  const checks = [
    [() => findings.isSwapMorfar === true,    `${tag} isSwap('morfar') true (got ${findings.isSwapMorfar})`],
    [() => findings.isSwapMorph === true,     `${tag} isSwap('morph') still true (got ${findings.isSwapMorph})`],
    [() => findings.isSwapOther === false,    `${tag} isSwap('outerHTML') false (got ${findings.isSwapOther})`],
    [() => findings.isSwapNonString === false,`${tag} isSwap(fn) false (got ${findings.isSwapNonString})`],
    [() => findings.morfarAliased,            `${tag} window.morfar === window.morph (alias applied)`],
    [() => findings.btnAttr === 'morfar',     `${tag} fx-intercambio="morfar" present in source DOM`],
    [() => JSON.stringify(order) === JSON.stringify(['c','a','b']), `${tag} list morphed to c,a,b (got ${JSON.stringify(order)})`],
    [() => aValue === 'alpha',                `${tag} morph preserved input value across reorder (got "${aValue}")`],
    [() => btnAttr === 'morfar',              `${tag} attribute name unchanged after swap (got "${btnAttr}")`],
    [() => errors.length === 0,               `${tag} ${errors.length} runtime errors: ${errors.join('; ')}`],
  ];
  let pass = 0;
  for (const [t, msg] of checks) { if (t()) pass++; else failures.push(msg); }
  log(`  ${pass}/${checks.length} checks passed`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// Phase H — rexi: verb aliases (obtener=get, publicar=post, ...) on globalThis
// ---------------------------------------------------------------------------
async function phaseH() {
  log('\n=== Phase H: rexi (verb aliases) ===');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

  await page.goto(REXI_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  const aliases = await page.evaluate(() => ({
    obtenerIsGet:   typeof window.obtener === 'function' && window.obtener === window.get,
    publicarIsPost: typeof window.publicar === 'function' && window.publicar === window.post,
    ponerIsPut:     typeof window.poner === 'function' && window.poner === window.put,
    parchearIsPatch:typeof window.parchear === 'function' && window.parchear === window.patch,
    cabeceraIsHead: typeof window.cabecera === 'function' && window.cabecera === window.head,
    eliminarIsDel:  typeof window.eliminar === 'function' && window.eliminar === window.del,
    rexiObject:     typeof window.rexi === 'object' && typeof window.rexi.get === 'function',
  }));

  // Click both buttons; result should be identical because obtener === get.
  await page.click('#btn-en');
  await page.waitForTimeout(400);
  const enOut = (await page.textContent('#out')).trim();
  await page.click('#btn-es');
  await page.waitForTimeout(400);
  const esOut = (await page.textContent('#out')).trim();

  const tag = 'H:';
  const checks = [
    [() => aliases.obtenerIsGet,   `${tag} window.obtener === window.get`],
    [() => aliases.publicarIsPost, `${tag} window.publicar === window.post`],
    [() => aliases.ponerIsPut,     `${tag} window.poner === window.put`],
    [() => aliases.parchearIsPatch,`${tag} window.parchear === window.patch`],
    [() => aliases.cabeceraIsHead, `${tag} window.cabecera === window.head`],
    [() => aliases.eliminarIsDel,  `${tag} window.eliminar === window.del`],
    [() => aliases.rexiObject,     `${tag} window.rexi unchanged (canonical API survives)`],
    [() => enOut.includes('Hola'), `${tag} get() fetched (got "${enOut}")`],
    [() => esOut.includes('Hola'), `${tag} obtener() fetched (got "${esOut}")`],
    [() => enOut.replace('[get]', '') === esOut.replace('[obtener]', ''),
      `${tag} get and obtener return same content`],
    [() => errors.length === 0, `${tag} ${errors.length} runtime errors: ${errors.join('; ')}`],
  ];
  let pass = 0;
  for (const [t, msg] of checks) { if (t()) pass++; else failures.push(msg); }
  log(`  ${pass}/${checks.length} checks passed`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// Run all phases
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Phase F — ssexi: localized event re-fire
// ---------------------------------------------------------------------------
async function phaseF() {
  log('\n=== Phase F: ssexi (event re-fire) ===');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

  await page.goto(SSEXI_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // Click button twice — each click dispatches canonical fx:sse:message,
  // which the orchestrator re-fires as fx:sse:mensaje on the same target,
  // and the inline Spanish-named listener appends a row.
  await page.click('#simulate');
  await page.waitForTimeout(100);
  await page.click('#simulate');
  await page.waitForTimeout(100);
  const rowCount = await page.locator('#stream .row').count();
  const rowTexts = await page.$$eval('#stream .row', els => els.map(e => e.textContent));

  // Programmatic listener verification on document for each canonical/alias pair.
  const refireCheck = await page.evaluate(async () => {
    const target = document.body
    const pairs = [['open','abrir'], ['message','mensaje'], ['swapped','intercambiado'], ['close','cerrar']]
    const results = []
    for (const [canonical, localized] of pairs) {
      let heard = null
      const onLocalized = (e) => { heard = e.detail?.tag }
      target.addEventListener('fx:sse:' + localized, onLocalized, {once: true})
      target.dispatchEvent(new CustomEvent('fx:sse:' + canonical, {
        detail: {tag: 'test-' + canonical}, bubbles: true, cancelable: true, composed: true,
      }))
      // Re-fire is synchronous (document listener -> target.dispatchEvent).
      results.push({canonical, localized, heard})
    }
    // Error stays English (identity mapping is stripped — no re-fire wired).
    let errorHeard = false
    document.addEventListener('fx:sse:error', () => { errorHeard = true }, {once: true})
    target.dispatchEvent(new CustomEvent('fx:sse:error', {detail: {}, bubbles: true}))
    return {pairs: results, errorHeard}
  })

  const tag = 'F:';
  const checks = [
    [() => rowCount === 2, `${tag} 2 rows appended via Spanish listener (got ${rowCount})`],
    [() => rowTexts.every(t => t.includes('mensaje:')), `${tag} all rows contain 'mensaje:' label`],
    [() => rowTexts.some(t => t.includes('tick 1')), `${tag} row carries detail.message.data ('tick 1')`],
    [() => rowTexts.some(t => t.includes('tick 2')), `${tag} second click delivers ('tick 2')`],
    [() => refireCheck.pairs.find(p => p.canonical === 'open').heard === 'test-open',
      `${tag} fx:sse:abrir fires when fx:sse:open dispatched`],
    [() => refireCheck.pairs.find(p => p.canonical === 'message').heard === 'test-message',
      `${tag} fx:sse:mensaje fires when fx:sse:message dispatched`],
    [() => refireCheck.pairs.find(p => p.canonical === 'swapped').heard === 'test-swapped',
      `${tag} fx:sse:intercambiado fires when fx:sse:swapped dispatched`],
    [() => refireCheck.pairs.find(p => p.canonical === 'close').heard === 'test-close',
      `${tag} fx:sse:cerrar fires when fx:sse:close dispatched`],
    [() => refireCheck.errorHeard, `${tag} canonical fx:sse:error still works (no orchestrator interference)`],
    [() => errors.length === 0, `${tag} ${errors.length} runtime errors: ${errors.join('; ')}`],
  ];
  let pass = 0;
  for (const [t, msg] of checks) { if (t()) pass++; else failures.push(msg); }
  log(`  ${pass}/${checks.length} checks passed`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// Phase E — moxi: localized attrs/modifiers/globals end-to-end
// ---------------------------------------------------------------------------
async function phaseE() {
  log('\n=== Phase E: moxi (vivo / al- / modifiers / globals) ===');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

  await page.goto(MOXI_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // Hooks + aliases
  const findings = await page.evaluate(() => ({
    nameLive:    window.moxi?.name?.(document.body, 'live'),
    nameOn:      window.moxi?.name?.(document.body, 'on-'),
    nameIgnore:  window.moxi?.name?.(document.body, 'mx-ignore'),
    modPrevenir: window.moxi?.modifier?.('prevenir'),
    modPrevent:  window.moxi?.modifier?.('prevent'),  // canonical stays
    ignoreSel:   window.moxi?.ignoreSel,
    xpath:       window.moxi?.xpath?.(),
    consultaAliased:  typeof window.consulta === 'function' && window.consulta === window.q,
    esperarAliased:   typeof window.esperar === 'function' && window.esperar === window.wait,
    transicionAliased:typeof window.transicion === 'function' && window.transicion === window.transition,
    greetingAttr:     document.querySelector('#greeting')?.getAttribute('vivo'),
    incBtnAttr:       document.querySelector('#inc')?.getAttribute('al-clic'),
  }));

  // Live attribute via `vivo`
  await page.fill('#name', 'Mundo');
  await page.waitForTimeout(150);
  const greeting = (await page.textContent('#greeting')).trim();

  // on-click via `al-clic`
  await page.click('#inc');
  await page.click('#inc');
  await page.click('#reset');
  await page.click('#inc');
  await page.waitForTimeout(100);
  const count = (await page.textContent('#count')).trim();

  // submit.prevent via al-submit.prevenir — page should NOT navigate
  const beforeUrl = page.url();
  await page.click('#form button[type=submit]');
  await page.waitForTimeout(200);
  const afterUrl = page.url();
  const formOut = (await page.textContent('#form #out')).trim();

  // once modifier — second click should be a no-op
  const onceTarget = page.locator('.panel[al-clic\\.unavez]');
  await onceTarget.click();
  const onceText1 = (await onceTarget.textContent()).trim();
  await onceTarget.click();
  const onceText2 = (await onceTarget.textContent()).trim();

  const tag = 'E:';
  const checks = [
    [() => findings.nameLive === 'vivo',         `${tag} name(_, 'live') === 'vivo'`],
    [() => findings.nameOn === 'al-',            `${tag} name(_, 'on-') === 'al-'`],
    [() => findings.nameIgnore === 'mx-ignorar', `${tag} name(_, 'mx-ignore') === 'mx-ignorar'`],
    [() => findings.modPrevenir === 'prevent',   `${tag} modifier('prevenir') -> 'prevent'`],
    [() => findings.modPrevent === 'prevent',    `${tag} modifier('prevent') unchanged (canonical pass-through)`],
    [() => findings.ignoreSel.includes('mx-ignorar'), `${tag} ignoreSel union includes 'mx-ignorar' (got ${findings.ignoreSel})`],
    [() => findings.xpath.includes("starts-with(name(),'al-')"), `${tag} xpath includes Spanish on- prefix`],
    [() => findings.xpath.includes("starts-with(name(),'on-')"), `${tag} xpath still includes canonical on- prefix`],
    [() => findings.xpath.includes("@vivo"),     `${tag} xpath includes Spanish live name`],
    [() => findings.xpath.includes("@live"),     `${tag} xpath still includes canonical live name`],
    [() => findings.consultaAliased,             `${tag} window.consulta === window.q`],
    [() => findings.esperarAliased,              `${tag} window.esperar === window.wait`],
    [() => findings.transicionAliased,           `${tag} window.transicion === window.transition`],
    [() => findings.greetingAttr !== null,       `${tag} 'vivo' attribute survives in DOM (no mutation)`],
    [() => findings.incBtnAttr !== null,         `${tag} 'al-clic' attribute survives in DOM (no mutation)`],
    [() => greeting === 'hola Mundo',            `${tag} vivo updated greeting (got "${greeting}")`],
    [() => count === '1',                        `${tag} al-clic counter inc/inc/reset/inc -> 1 (got "${count}")`],
    [() => beforeUrl === afterUrl,               `${tag} al-submit.prevenir prevented navigation`],
    [() => formOut === 'enviado (sin recargar)', `${tag} al-submit.prevenir handler fired (got "${formOut}")`],
    [() => onceText1.includes('clic recibido'),  `${tag} al-clic.unavez fired first time`],
    [() => onceText1 === onceText2,              `${tag} al-clic.unavez did NOT re-fire on 2nd click`],
    [() => errors.length === 0,                  `${tag} ${errors.length} runtime errors: ${errors.join('; ')}`],
  ];
  let pass = 0;
  for (const [t, msg] of checks) { if (t()) pass++; else failures.push(msg); }
  log(`  ${pass}/${checks.length} checks passed`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// Phase I — joint: all five libraries on one Spanish page, no conflicts
// ---------------------------------------------------------------------------
async function phaseI() {
  log('\n=== Phase I: joint (fixi + moxi + ssexi + paxi + rexi) ===');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

  await page.goto(JOINT_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // Hooks present from all libraries
  const hooks = await page.evaluate(() => ({
    fixiName:   typeof window.fixi?.name === 'function',
    moxiName:   typeof window.moxi?.name === 'function',
    paxiIsSwap: typeof window.paxi?.isSwap === 'function',
    rexiObj:    typeof window.rexi === 'object',
    consulta:   window.consulta === window.q,
    obtener:    window.obtener === window.get,
    morfar:     window.morfar === window.morph,
  }));

  // fixi: load a fragment via Spanish attrs
  await page.click('section:nth-of-type(1) button');
  await page.waitForTimeout(400);
  const fixiOut = (await page.textContent('#fixi-out')).trim();
  const fixiOutNotEmpty = fixiOut !== '— vacío —' && fixiOut.length > 0;

  // moxi: vivo + al-submit.prevenir
  await page.fill('#name', 'Mundo');
  await page.waitForTimeout(150);
  const hiText = (await page.textContent('#hi')).trim();
  const beforeUrl = page.url();
  await page.click('#form button[type=submit]');
  await page.waitForTimeout(200);
  const afterUrl = page.url();
  const formOut = (await page.textContent('#form-out')).trim();

  // paxi: morfar swap reorders list. Scope the query to the paxi section
  // because the fixi swap above duplicated <ul id="list"> into #fixi-out.
  await page.click('section:nth-of-type(3) button');
  await page.waitForTimeout(500);
  const listOrder = await page.$$eval('section:nth-of-type(3) #list > li', els => els.map(e => e.id));

  // rexi: obtener fetch (uses moxi al-clic handler with consulta global)
  await page.click('#rexi-btn');
  await page.waitForTimeout(400);
  const rexiOut = (await page.textContent('#rexi-out')).trim();

  // ssexi: synthetic message via moxi al-clic, Spanish listener appends row
  await page.click('#sim-sse');
  await page.click('#sim-sse');
  await page.waitForTimeout(100);
  const sseRows = await page.locator('#sse-out > div').count();

  const tag = 'I:';
  const checks = [
    [() => hooks.fixiName,   `${tag} window.fixi.name installed`],
    [() => hooks.moxiName,   `${tag} window.moxi.name installed`],
    [() => hooks.paxiIsSwap, `${tag} window.paxi.isSwap installed`],
    [() => hooks.rexiObj,    `${tag} window.rexi installed`],
    [() => hooks.consulta,   `${tag} consulta=q aliased`],
    [() => hooks.obtener,    `${tag} obtener=get aliased`],
    [() => hooks.morfar,     `${tag} morfar=morph aliased`],
    [() => fixiOutNotEmpty, `${tag} fixi swap replaced placeholder text (got "${fixiOut.slice(0,30)}")`],
    [() => hiText === 'hola Mundo',    `${tag} moxi vivo updated (got "${hiText}")`],
    [() => beforeUrl === afterUrl,     `${tag} moxi al-submit.prevenir blocked navigation`],
    [() => formOut === 'enviado',      `${tag} moxi al-submit.prevenir handler fired`],
    [() => JSON.stringify(listOrder) === JSON.stringify(['c','a','b']),
      `${tag} paxi morfar reordered list to c,a,b (got ${JSON.stringify(listOrder)})`],
    [() => rexiOut.includes('Hola'),   `${tag} rexi obtener fetched content (got "${rexiOut.slice(0,30)}...")`],
    [() => sseRows === 2,              `${tag} ssexi Spanish listener received 2 events (got ${sseRows})`],
    [() => errors.length === 0,        `${tag} ${errors.length} runtime errors: ${errors.join('; ')}`],
  ];
  let pass = 0;
  for (const [t, msg] of checks) { if (t()) pass++; else failures.push(msg); }
  log(`  ${pass}/${checks.length} checks passed`);
  await ctx.close();
}

await phaseA();
for (const locale of ['en', 'es', 'ja', 'ar']) await phaseB(locale);
await phaseC();
await phaseD();
await phaseE();
await phaseF();
await phaseG();
await phaseH();
await phaseI();
await browser.close();

if (failures.length) {
  log('\n--- FAIL ---');
  failures.forEach(f => log(' • ' + f));
  process.exit(1);
}
log('\n--- PASS ---  M2 + M2.5 × 4 locales + per-element-lang + faithfulness + moxi + ssexi + paxi + rexi + joint');
