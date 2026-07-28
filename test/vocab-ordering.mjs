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

import { EVENT_KEYWORDS, extractEventValues } from '../scripts/gen-locales.mjs';
import { LOCALES } from '../scripts/fx-vocab.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.resolve(__dirname, '..', 'locales');
const DOM_VOCAB_DIR = path.resolve(__dirname, '..', 'dom-vocab');
const ALL_CODES = Object.keys(LOCALES);

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

console.log('\nExpanded event scope — the vocabulary the allowlist used to drop:');
{
  const es = await loadLocale('es');
  // keydown is the resolution of a two-sources-of-truth bug: loka hand-authored
  // `pulsacion` believing the profile lacked keydown; it didn't — EVENT_KEYWORDS
  // was filtering it out. The profile form must win and `pulsacion` must be gone.
  ok(preferred(es.fixi.events, 'keydown') === 'tecla abajo', "es keydown → 'tecla abajo' (profile, not the retired 'pulsacion')");
  ok(!('pulsacion' in es.fixi.events), "es no longer ships the hand-authored 'pulsacion'");
  ok(preferred(es.fixi.events, 'keyup') === 'tecla arriba', "es keyup → 'tecla arriba' (the live-search idiom)");
  // Asserts the upstream V3 Batch 2 split landed — the fused 'ratónabajo' is
  // still accepted as an alternative but must not be the form we teach.
  ok(preferred(es.fixi.events, 'mousedown') === 'ratón abajo', "es mousedown → 'ratón abajo' (not the fused 'ratónabajo')");
  ok(es.fixi.events['ratónabajo'] === 'mousedown', "es still parses the fused 'ratónabajo' (back-compat)");
  ok(preferred(es.fixi.events, 'scroll') === 'desplazar', "es scroll → 'desplazar' (primary, not the alt 'desplazamiento')");
  ok(preferred(es.fixi.events, 'resize') === 'redimensionar', "es resize → 'redimensionar'");
  ok(preferred(es.fixi.events, 'load') === 'carga', "es load → 'carga' (primary, not the alt 'cargar')");

  // scroll is the one addition every profile defines — the only new canonical
  // with universal coverage, so it doubles as a whole-corpus smoke test.
  const missing = [];
  for (const code of ALL_CODES) {
    if (code === 'en') continue;
    const d = await loadLocale(code);
    if (!preferred(d.fixi.events, 'scroll')) missing.push(code);
  }
  ok(missing.length === 0, `every non-en locale localizes scroll${missing.length ? ` (missing: ${missing.join(', ')})` : ''}`);
}

console.log('\nCorrected terms — the form we teach, with old spellings still parsing:');
{
  // Three terms were malformed when the allowlist first exposed them. Each was
  // fixed upstream with the old spelling demoted to a parse alternative, so the
  // assertion is two-sided: the corrected form must win, and the old form must
  // still resolve.
  const corrections = [
    ['de', 'resize',    'Größenänderung',    'größeändern',  'malformed compound: German needs the linking -n-'],
    ['pl', 'resize',    'zmiana rozmiaru',   'zmieńrozmiar', 'fused two-word phrase'],
    ['pt', 'mousedown', 'mouse pressionado', 'mouse baixo',  'spatial calque; pt-BR says pressionado'],
    ['pt', 'mouseup',   'mouse solto',       'mouse cima',   'spatial calque; pt-BR says solto'],
  ];
  for (const [code, canonical, want, old, why] of corrections) {
    const d = await loadLocale(code);
    ok(preferred(d.fixi.events, canonical) === want, `${code} ${canonical} → '${want}' (${why})`);
    ok(d.fixi.events[old] === canonical, `${code} still parses the old '${old}' (back-compat)`);
  }
}

console.log('\nHand-authored event tables — primary-first is maintained by hand here:');
{
  // These locales' profiles define no click/change/submit/input, so those four
  // come from fx-vocab.mjs where ordering is a human responsibility rather than
  // a generator guarantee. Previously untested, and the most fragile.
  const expected = {
    ja: { click: 'クリック', change: '変更', submit: '送信', input: '入力' },
    ar: { click: 'نقر', change: 'تغيير', submit: 'إرسال', input: 'إدخال' },
    ms: { click: 'klik', change: 'ubah', submit: 'hantar' },
    tl: { click: 'i-click', change: 'baguhin', submit: 'ipasa' },
    sw: { click: 'bofya', change: 'badilisha', submit: 'wasilisha' },
  };
  for (const [code, pairs] of Object.entries(expected)) {
    const d = await loadLocale(code);
    for (const [canonical, form] of Object.entries(pairs)) {
      ok(preferred(d.fixi.events, canonical) === form, `${code} ${canonical} → '${form}'`);
    }
  }
}

console.log('\nPublished scope matches the EVENT_KEYWORDS contract:');
{
  const allowed = new Set(EVENT_KEYWORDS);
  const strays = [];
  for (const code of ALL_CODES) {
    const d = await loadLocale(code);
    for (const canonical of Object.values(d.fixi.events)) {
      if (!allowed.has(canonical)) strays.push(`${code}:${canonical}`);
    }
  }
  // The generator throws on this, but assert from the data side too: a stray
  // canonical is what let `pulsacion` sit in the unordered leftovers bucket.
  ok(strays.length === 0, `no published canonical outside EVENT_KEYWORDS${strays.length ? ` (found: ${strays.join(', ')})` : ''}`);
  // `hover` is the specific trap: 18 profiles define it, it is not a DOM event,
  // and publishing it would ship a listener that never fires.
  ok(!allowed.has('hover'), "'hover' stays excluded (not a DOM event name)");
}

console.log('\ndom-vocab/ mirrors locales/ (same contract, both shipped):');
{
  const mismatched = [];
  for (const code of ALL_CODES) {
    const locale = await loadLocale(code);
    const { events } = await import(pathToFileURL(path.join(DOM_VOCAB_DIR, `${code}.js`)).href);
    // Compare entries AND order — dom-vocab carries the same primary-first
    // guarantee in its header and is the file external consumers import.
    if (JSON.stringify(Object.entries(events)) !== JSON.stringify(Object.entries(locale.fixi.events))) {
      mismatched.push(code);
    }
  }
  ok(mismatched.length === 0, `dom-vocab events match locales events, in order${mismatched.length ? ` (differ: ${mismatched.join(', ')})` : ''}`);
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
