// Verify experiments/psatina-study/demo/es.html renders + filters correctly
// using the canonical psatina source + thin Spanish locale module.

import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://127.0.0.1:8125';
const URL = `${BASE}/experiments/psatina-study/demo/es.html`;

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle');

const initialItems = await page.locator('li').filter({ hasText: /Alicia|Berto|Carla|David/ }).count();
await page.fill('input[type="search"]', 'ali');
await page.waitForTimeout(200);
const filteredItems = await page.locator('li').filter({ hasText: /Alicia|Berto|Carla|David/ }).count();
await page.fill('input[type="search"]', '');
await page.waitForTimeout(200);
const clearedItems = await page.locator('li').filter({ hasText: /Alicia|Berto|Carla|David/ }).count();
await page.fill('input[type="search"]', 'zzzzz');
await page.waitForTimeout(200);
const noMatchText = (await page.textContent('body')).includes('Sin coincidencias');

await browser.close();

const checks = [
  [initialItems === 4, `initial 4 items (got ${initialItems})`],
  [filteredItems === 1, `'ali' filter -> 1 item (got ${filteredItems})`],
  [clearedItems === 4, `cleared -> 4 items (got ${clearedItems})`],
  [noMatchText, `'zzzzz' shows "Sin coincidencias"`],
  [errors.length === 0, `no runtime errors (got ${errors.length}: ${errors.join('; ')})`],
];

let pass = 0;
const fail = [];
for (const [t, m] of checks) { if (t) { pass++; console.log(`  ok  ${m}`); } else { fail.push(m); console.log(`  FAIL ${m}`); } }
console.log(`\n${pass}/${checks.length} checks passed`);
if (fail.length) process.exit(1);
