#!/usr/bin/env node
// Guards the two data conventions external consumers rely on (see README,
// "Consuming the vocabulary data"):
//
//   1. Primary-first ordering — within each canonical group the preferred
//      localized synonym is listed before its alternatives, so inverting a
//      parse map and taking first-wins recovers the form to teach/author.
//   2. Identity omission — a canonical token absent from a locale's map is
//      intentionally identical to the canonical form, never "unsupported".
//
// Pure Node, no browser/server needed:  node test/vocab-ordering.mjs

import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { extractEventValues } from '../scripts/gen-locales.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.resolve(__dirname, '..', 'locales');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) {
    console.log(`  ✓ ${msg}`);
  } else {
    console.error(`  ✗ ${msg}`);
    failures++;
  }
};

// First localized key (insertion order) whose value is `canonical` — exactly
// the "invert + first-wins" a consumer would do to find the preferred form.
const preferred = (map, canonical) => {
  for (const [loc, can] of Object.entries(map)) if (can === canonical) return loc;
  return undefined;
};

// ── 1. Generator logic: extractEventValues must place primary before alts ───
console.log('extractEventValues — primary precedes alternatives:');
{
  // Synthetic profile in the shape the extractor parses (primary / normalized
  // / alternatives), with the primary deliberately NOT alphabetically first,
  // so the test fails if ordering ever falls back to sorted/arbitrary order.
  const synthProfile = `
    export const profile = {
      events: {
        click:  { primary: 'pulsar',  normalized: 'click',  alternatives: ['hacer-clic', 'tocar'] },
        change: { primary: 'cambiar', normalized: 'change', alternatives: ['modificar'] },
      },
    };
  `;
  const values = extractEventValues(synthProfile);
  ok(preferred(values, 'click') === 'pulsar', "click → 'pulsar' wins (primary, not the alt 'hacer-clic'/'tocar')");
  ok(preferred(values, 'change') === 'cambiar', "change → 'cambiar' wins (primary, not the alt 'modificar')");
}

// ── 2. Generated output: real locale files honor both conventions ───────────
// Memoized: an ES-module import runs the file body (the register() call) only
// once per process, so re-importing returns the cached module without
// re-registering. Cache the captured data ourselves and reuse it.
const _localeCache = new Map();
async function loadLocale(code) {
  if (_localeCache.has(code)) return _localeCache.get(code);
  const captured = {};
  globalThis.window = { loka: { register: (c, data) => { captured.code = c; captured.data = data; } } };
  await import(pathToFileURL(path.join(LOCALES_DIR, `${code}.js`)).href);
  if (captured.code !== code) throw new Error(`locales/${code}.js did not register '${code}'`);
  _localeCache.set(code, captured.data);
  return captured.data;
}

console.log('\nGenerated locale files — primary-first inversion:');
{
  // Known reviewed/native primaries — if generation order regresses, these flip.
  const es = await loadLocale('es');
  ok(preferred(es.fixi.events, 'click') === 'clic', "es click → 'clic'");
  ok(preferred(es.fixi.events, 'change') === 'cambio', "es change → 'cambio'");
  ok(preferred(es.fixi.events, 'submit') === 'envío', "es submit → 'envío'");

  const fr = await loadLocale('fr');
  ok(preferred(fr.fixi.events, 'click') === 'clic', "fr click → 'clic'");
}

console.log('\nGenerated locale files — identity omission:');
{
  const es = await loadLocale('es');
  const fr = await loadLocale('fr');
  // es localizes fx-action; fr does NOT (action === action), so no entry maps
  // to 'fx-action' — a consumer must read that absence as "identity".
  ok(preferred(es.fixi.attrs, 'fx-action') === 'fx-acción', "es maps a localized form to fx-action");
  ok(preferred(fr.fixi.attrs, 'fx-action') === undefined, "fr omits fx-action (identity — write the canonical token)");

  const en = await loadLocale('en');
  ok(Object.keys(en.fixi.attrs).length === 0 && Object.keys(en.fixi.events).length === 0, 'en is empty (canonical)');
}

console.log('\nGenerated locale files — Quechua attrs are an intentional stub:');
{
  const qu = await loadLocale('qu');
  ok(Object.keys(qu.fixi.attrs).length === 0, 'qu fixi.attrs is empty (deliberate stub)');
  ok(Object.keys(qu.fixi.events).length > 0, 'qu still has localized event vocabulary');
}

if (failures) {
  console.error(`\n✗ vocab-ordering: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('\n✓ vocab-ordering: all checks passed');
