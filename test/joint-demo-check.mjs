// Verify the joint fixi + psatina-modular demo behaves correctly.
//
// Checks:
//   - psatina template renders 5 fruits initially
//   - typing in the filter narrows the list (psatina event flowing)
//   - fixi button fetches and swaps the fragment (loka-js fixi hooks)
//   - inside the swapped fragment, a NEW psatina template was inited
//     (rescan bridge working)
//   - DOM source still shows the localized attribute names

import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://127.0.0.1:8124';
const URL = `${BASE}/loka-js/demo/joint-fixi-psatina/index.html`;

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle');

// psatina island: 5 fruits initially
const initialFruits = await page.locator('section:nth-of-type(1) li').count();

// type "man" — should narrow to 2 (manzana, mandarina)
await page.fill('section:nth-of-type(1) input', 'man');
await page.waitForTimeout(200);
const filtered = await page.locator('section:nth-of-type(1) li').count();

await page.fill('section:nth-of-type(1) input', '');
await page.waitForTimeout(200);

// fixi side: click the button, expect the fragment to swap in
await page.click('section:nth-of-type(2) button');
await page.waitForTimeout(800);
const fragmentText = await page.textContent('#fragment-target');

// inside the fragment, a NEW psatina template should have been inited
// by the rescan bridge. Click "Incrementar" — counter goes 0 -> 1.
const incrementBtn = page.locator('#fragment-target button').first();
await incrementBtn.click();
await page.waitForTimeout(150);
const counterText = await page.textContent('#fragment-target strong');

// Source HTML still shows localized names
const acciónPresent = await page.evaluate(() =>
  !!document.querySelector('[fx-acción]')
);
const datosPresent = await page.evaluate(() =>
  !!document.querySelector('template[p\\:datos]')
);
const rescanCount = await page.evaluate(() =>
  document.querySelectorAll('[data-rescan]').length
);

await browser.close();

const checks = [
  [initialFruits === 5, `initial 5 fruits (got ${initialFruits})`],
  [filtered === 2, `'man' filter -> 2 fruits manzana+mandarina (got ${filtered})`],
  [fragmentText.includes('Fragmento cargado'), `fixi swap loaded fragment-es.html`],
  [counterText === '1', `psatina counter in swapped fragment incremented to 1 (got '${counterText}')`],
  [acciónPresent, `<button fx-acción> still in source HTML (devtools faithful)`],
  [datosPresent, `<template p:datos> still in source HTML (devtools faithful)`],
  [rescanCount === 2, `2 templates marked data-rescan (initial + swapped) (got ${rescanCount})`],
  [errors.length === 0, `no runtime errors (got ${errors.length}: ${errors.join('; ')})`],
];

let pass = 0;
const fail = [];
for (const [t, m] of checks) { if (t) { pass++; console.log(`  ok  ${m}`); } else { fail.push(m); console.log(`  FAIL ${m}`); } }
console.log(`\n${pass}/${checks.length} checks passed`);
if (fail.length) process.exit(1);
