#!/usr/bin/env node
// Generate loka-js locale files from @lokascript/semantic profiles +
// fx-vocab.mjs.
//
// Usage:
//   node scripts/gen-locales.mjs              # write all locales
//   node scripts/gen-locales.mjs --dry-run    # preview only
//   node scripts/gen-locales.mjs --locale=es  # one locale
//
// Inputs:
//   - ../hyperfixi/packages/semantic/src/generators/profiles/{profile}.ts
//     (event vocab — sibling-checkout dependency)
//   - scripts/fx-vocab.mjs (per-library attr/event vocab + props)
//
// Outputs (both regenerated together):
//   - locales/{code}.js     — fixi-specific (script-tag loaded; calls window.loka.register)
//   - dom-vocab/{code}.js   — shared DOM-keyword vocab (ES module; consumed by
//                             psatina-modular and any other library that needs
//                             event/property name translation)

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { LOCALES } from './fx-vocab.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LOCALES_DIR = path.resolve(ROOT, 'locales');
const DOM_VOCAB_DIR = path.resolve(ROOT, 'dom-vocab');
const PROFILES_DIR = path.resolve(
  ROOT,
  '../hyperfixi/packages/semantic/src/generators/profiles'
);

// Hypermedia trigger events — the canonical names loka publishes localized
// forms for. This list is a contract, not a convenience: a semantic profile's
// `keywords` map is one flat namespace mixing DOM events with hyperscript
// grammar (`if`, `repeat`, `tell`, `and`, `end`) and commands (`put`, `fetch`,
// `morph`), so the map cannot be consumed wholesale. Something has to choose,
// and this is where the choosing is written down.
//
// A canonical belongs here when all three hold:
//   1. It names a real DOM event. (The listener has to fire.)
//   2. An author plausibly binds it on a page element to drive a request or a
//      moxi handler.
//   3. The localized token reads unambiguously as "this happened" in trigger
//      position, not as "do this".
//
// Order matters twice: it is also the canonical group sort order in
// `orderValues`. APPEND new entries — reordering churns every generated file.
// Exported so test/vocab-ordering.mjs can assert the published data stays
// inside this contract.
export const EVENT_KEYWORDS = [
  // Form and interaction — the 95% case
  'click', 'change', 'submit', 'input', 'focus', 'blur',
  // fixi's synthetic lifecycle trigger (fixi.js `send(elt, "init")`), not a
  // browser event. The one deliberate exception to rule 1.
  'init',
  // Keyboard — `keyup` is the live-search idiom (cf. hx-trigger="keyup")
  'keydown', 'keyup',
  // Pointer
  'mousedown', 'mouseup', 'mouseover', 'mouseout',
  // Window and resource
  'scroll', 'resize', 'load',
];

// Deliberately NOT published, so a future profile bump has a rule to follow
// rather than a guess:
//
// - `hover` (18 profiles). Not a DOM event name. Publishing `sobrevolar →
//   hover` would ship `addEventListener('hover')` — a listener that never
//   fires. Omitting it is no worse than today (both are dead) and avoids
//   shipping a binding that looks supported and isn't. Whether semantic should
//   normalize `hover` to `mouseover` is an upstream question, not ours.
//
// - `select`, `reset`, `close`, `toggle`, `copy` (24 profiles each). Real DOM
//   events, but in the profiles these are hyperscript COMMANDS: the localized
//   primaries are imperatives (`cerrar` = "close it", not "on close"), and each
//   fires only on a narrow element type (<dialog>, <details>, <form>,
//   clipboard). Fails rule 3 — a beginner writing fx-disparador="cerrar" on a
//   button would get a listener that never fires. Revisit if semantic ever
//   separates command vocabulary from event vocabulary.
//
// - `keypress`, `mouseenter`, `mouseleave`, `dblclick`, `contextmenu`, `paste`,
//   `drag`, `drop`. No profile defines them. Nothing to publish.

function parseArgs() {
  const args = { dryRun: false, locale: null, help: false };
  for (const arg of process.argv.slice(2)) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg.startsWith('--locale=')) args.locale = arg.slice('--locale='.length);
  }
  return args;
}

/**
 * Extract event-name translations from a profile file.
 * Returns a map of localized-form -> canonical English name.
 *
 * Ordering invariant (relied on by downstream consumers — see README
 * "Consuming the vocabulary data"): within each canonical group the
 * PRIMARY localized form is inserted before its `alternatives`. Callers
 * that invert the map and take the first-wins entry per canonical therefore
 * recover the preferred form. `orderValues` preserves this within-group
 * order, and test/vocab-ordering.mjs guards it against regressions.
 * Exported so that test can assert the invariant directly.
 */
export function extractEventValues(profileSource) {
  const values = {};
  for (const kw of EVENT_KEYWORDS) {
    const blockRe = new RegExp(`\\b${kw}:\\s*\\{([\\s\\S]*?)\\}`, 'g');
    const blockMatch = blockRe.exec(profileSource);
    if (!blockMatch) continue;
    const block = blockMatch[1];

    const primaryMatch = block.match(/primary:\s*['"]([^'"]+)['"]/);
    const normalizedMatch = block.match(/normalized:\s*['"]([^'"]+)['"]/);
    const altMatch = block.match(/alternatives:\s*\[([^\]]*)\]/);

    if (!primaryMatch || !normalizedMatch) continue;
    const canonical = normalizedMatch[1];

    const primary = primaryMatch[1];
    if (primary !== canonical && primary !== 'TODO') {
      values[primary] = canonical;
    }

    if (altMatch) {
      const alts = altMatch[1].match(/['"]([^'"]+)['"]/g);
      if (alts) {
        for (const raw of alts) {
          const v = raw.replace(/['"]/g, '');
          if (v && v !== canonical && v !== 'TODO') {
            values[v] = canonical;
          }
        }
      }
    }
  }
  return values;
}

/**
 * Stable key order: group by canonical name following EVENT_KEYWORDS.
 *
 * A canonical outside EVENT_KEYWORDS is a build error, not a leftover to sweep
 * up. This used to append unknown canonicals in raw insertion order, which
 * silently broke the primary-first guarantee the generated header asserts —
 * and let `fx-vocab.mjs` publish a hand-authored event (`pulsacion: 'keydown'`)
 * that shadowed the profile's own `keydown` translation for a year without
 * anything noticing. Failing loudly keeps the allowlist the single place where
 * scope is decided.
 */
function orderValues(values, code) {
  const ordered = {};
  for (const canonical of EVENT_KEYWORDS) {
    for (const [key, val] of Object.entries(values)) {
      if (val === canonical) ordered[key] = val;
    }
  }
  const unknown = Object.entries(values).filter(([key]) => !(key in ordered));
  if (unknown.length) {
    const list = unknown.map(([k, v]) => `${k} -> ${v}`).join(', ');
    throw new Error(
      `[${code}] event canonical outside EVENT_KEYWORDS: ${list}\n` +
        `  Add the canonical to EVENT_KEYWORDS in scripts/gen-locales.mjs (and say\n` +
        `  why it passes the three-part test), or drop the entry from fx-vocab.mjs.`
    );
  }
  return ordered;
}

/** Format a JS object literal with single-quoted keys/values, 2-space indent. */
function formatObject(obj, indent) {
  const entries = Object.entries(obj);
  if (entries.length === 0) return '{}';
  const pad = ' '.repeat(indent);
  const padInner = ' '.repeat(indent + 2);
  const lines = entries.map(([key, val]) => {
    const qkey = /^[a-zA-Z_$][\w$]*$/.test(key) ? key : `'${key.replace(/'/g, "\\'")}'`;
    return `${padInner}${qkey}: '${val.replace(/'/g, "\\'")}',`;
  });
  return `{\n${lines.join('\n')}\n${pad}}`;
}

/** Strip identity mappings (e.g., French 'fx-action': 'fx-action'). */
function stripIdentity(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([k, v]) => k !== v));
}

function renderDomVocabFile(code, spec, events) {
  const props = spec.props ?? {};
  const eventsBlock = formatObject(stripIdentity(events), 0);
  const propsBlock = formatObject(stripIdentity(props), 0);
  return `// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/${spec.profile}.ts (events)
//         loka-js/scripts/fx-vocab.mjs (event overrides + props)
// Regenerate: cd loka-js && npm run gen
//
// DOM-keyword vocabulary for the '${code}' locale. Shared between loka-js
// (fixi fx-trigger value translation) and any other consumer that needs
// to translate event or DOM-property names (e.g., psatina-modular's
// p:on:<event> and p:set:<prop> directives).
//
// Maps are localized→canonical; an omitted canonical means identity (use the
// canonical token); the primary localized synonym is listed first per
// canonical (first-wins inversion = preferred form). See README.
//
// Provenance: event names come from the '${spec.profile}' semantic profile,
// except entries overridden in fx-vocab.mjs, which are loka-local.${
    spec.reviewed
      ? ''
      : `\n// ⚠ fixi attribute names for this locale are not native-speaker reviewed.`
  }
// Scope: only canonicals on the EVENT_KEYWORDS allowlist in gen-locales.mjs are
// published — see that file for what is in, what is out, and why.
export const events = ${eventsBlock};
export const props = ${propsBlock};
`;
}

function renderLocaleFile(code, spec, fixiEvents) {
  // State provenance rather than assert review. The previous wording claimed
  // "Event-name vocabulary IS reviewed (from @lokascript/semantic profile)",
  // which is false for the locales whose event tables are hand-authored here
  // (ms, tl, sw) — their profiles define no click/change/submit/input.
  const unreviewedBanner = spec.reviewed
    ? ''
    : `// ⚠ Unreviewed: fixi attribute names for this locale have not been
//   native-speaker reviewed. Event names come from the @lokascript/semantic
//   '${spec.profile}' profile (reviewed by that project), except any entry
//   overridden in loka-js/scripts/fx-vocab.mjs, which is loka-local. To
//   suggest corrections, edit fx-vocab.mjs (LOCALES.${code}) and regenerate.
`;

  // A non-English locale with no localized fixi attribute names is an
  // intentional stub (no reviewed translations available yet), not a
  // generation bug — flag it so it isn't mistaken for one.
  const attrsEmpty =
    code !== 'en' && Object.keys(stripIdentity(spec.fixi?.attrs ?? {})).length === 0;
  const stubBanner = attrsEmpty
    ? `// ⓘ fixi attrs intentionally empty: no reviewed ${spec.name} attribute-name
//   translations yet, so ${spec.name} authors use the canonical fx-* names.
//   Deliberate stub, not a generation bug; event vocabulary is still localized.
`
    : '';

  // Conventions every consumer of this data relies on (see README,
  // "Consuming the vocabulary data"):
  const conventions = `// Conventions: maps are localized→canonical (parse direction). A canonical
//   token absent from a map is intentionally identical to the canonical form
//   (identity mappings are omitted — write the canonical token). Within each
//   canonical group the primary localized form is listed first, so first-wins
//   inversion yields the preferred form to teach/author. Only canonicals on the
//   EVENT_KEYWORDS allowlist in gen-locales.mjs are published — see that file
//   for what is in, what is out, and why.
`;

  const header = `// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/${spec.profile}.ts (events)
//         loka-js/scripts/fx-vocab.mjs (fixi attrs + event overrides + per-library vocab)
// Regenerate: cd loka-js && npm run gen
${conventions}${unreviewedBanner}${stubBanner}`;

  if (code === 'en') {
    return `${header}// English no-op — registered for completeness; English is canonical.
window.loka.register('en', { fixi: { attrs: {}, events: {} } });
`;
  }

  const attrs = stripIdentity(spec.fixi?.attrs ?? {});
  const events = stripIdentity(fixiEvents);

  const attrsBlock = formatObject(attrs, 4);
  const eventsBlock = formatObject(events, 4);

  const fields = [`  fixi: {
    attrs: ${attrsBlock},
    events: ${eventsBlock},
  },`];

  // paxi — emit if any paxi vocab is present
  const paxiSwaps = stripIdentity(spec.paxi?.swaps ?? {});
  const paxiGlobals = stripIdentity(spec.paxi?.globals ?? {});
  if (Object.keys(paxiSwaps).length || Object.keys(paxiGlobals).length) {
    const parts = [];
    if (Object.keys(paxiSwaps).length)   parts.push(`    swaps: ${formatObject(paxiSwaps, 4)},`);
    if (Object.keys(paxiGlobals).length) parts.push(`    globals: ${formatObject(paxiGlobals, 4)},`);
    fields.push(`  paxi: {\n${parts.join('\n')}\n  },`);
  }

  // rexi — globals only (pure JS API)
  const rexiGlobals = stripIdentity(spec.rexi?.globals ?? {});
  if (Object.keys(rexiGlobals).length) {
    fields.push(`  rexi: {\n    globals: ${formatObject(rexiGlobals, 4)},\n  },`);
  }

  // ssexi — events only (no attributes; localization via event re-fire)
  const sseEvents = stripIdentity(spec.ssexi?.events ?? {});
  if (Object.keys(sseEvents).length) {
    fields.push(`  ssexi: {\n    events: ${formatObject(sseEvents, 4)},\n  },`);
  }

  // moxi — attrs + modifiers + globals (events shared with fixi)
  const moxiAttrs = stripIdentity(spec.moxi?.attrs ?? {});
  const moxiMods = stripIdentity(spec.moxi?.modifiers ?? {});
  const moxiGlobals = stripIdentity(spec.moxi?.globals ?? {});
  if (Object.keys(moxiAttrs).length || Object.keys(moxiMods).length || Object.keys(moxiGlobals).length) {
    const parts = [];
    if (Object.keys(moxiAttrs).length)   parts.push(`    attrs: ${formatObject(moxiAttrs, 4)},`);
    if (Object.keys(moxiMods).length)    parts.push(`    modifiers: ${formatObject(moxiMods, 4)},`);
    if (Object.keys(moxiGlobals).length) parts.push(`    globals: ${formatObject(moxiGlobals, 4)},`);
    fields.push(`  moxi: {\n${parts.join('\n')}\n  },`);
  }

  // affordances — GRAIL HTML binding vocabulary, see GRAIL_HTML_BINDING.md (v0.3)
  const aff = spec.affordances ?? {};
  const affTables = ['intents', 'classes', 'conditions'];
  const affParts = [];
  for (const t of affTables) {
    const tbl = stripIdentity(aff[t] ?? {});
    if (Object.keys(tbl).length) affParts.push(`    ${t}: ${formatObject(tbl, 4)},`);
  }
  if (affParts.length) {
    fields.push(`  affordances: {\n${affParts.join('\n')}\n  },`);
  }

  if (spec.globalsOptIn) {
    fields.push(`  globalsOptIn: true,`);
  }

  return `${header}window.loka.register('${code}', {
${fields.join('\n')}
});
`;
}

function main() {
  const args = parseArgs();

  if (args.help) {
    console.log(`Generate loka-js locale files.

  --dry-run        preview output without writing
  --locale=<code>  process only one locale
  --help           show this help`);
    return;
  }

  if (!fs.existsSync(LOCALES_DIR)) {
    fs.mkdirSync(LOCALES_DIR, { recursive: true });
  }
  if (!fs.existsSync(DOM_VOCAB_DIR)) {
    fs.mkdirSync(DOM_VOCAB_DIR, { recursive: true });
  }

  if (args.locale && !LOCALES[args.locale]) {
    console.error(`Unknown locale: ${args.locale}`);
    console.error(`Known: ${Object.keys(LOCALES).join(', ')}`);
    process.exit(1);
  }

  const codes = args.locale ? [args.locale] : Object.keys(LOCALES);
  let writeCount = 0;
  let skipCount = 0;

  for (const code of codes) {
    const spec = LOCALES[code];
    const profilePath = path.join(PROFILES_DIR, `${spec.profile}.ts`);

    let profileSource = '';
    if (fs.existsSync(profilePath)) {
      profileSource = fs.readFileSync(profilePath, 'utf-8');
    } else if (code !== 'en') {
      console.error(`  [SKIP] ${code}: profile not found at ${profilePath}`);
      skipCount++;
      continue;
    }

    const profileValues = profileSource ? extractEventValues(profileSource) : {};
    const merged = { ...profileValues, ...(spec.fixi?.events ?? {}) };
    const events = orderValues(merged, code);

    const output = renderLocaleFile(code, spec, events);
    const outPath = path.join(LOCALES_DIR, `${code}.js`);

    const domVocabOutput = renderDomVocabFile(code, spec, events);
    const domVocabPath = path.join(DOM_VOCAB_DIR, `${code}.js`);

    if (args.dryRun) {
      console.log(`  [DRY] ${code}: ${Object.keys(events).length} events, ${Object.keys(spec.fixi?.attrs ?? {}).length} attrs, ${Object.keys(spec.props ?? {}).length} props`);
    } else {
      // locales/{code}.js
      const prev = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf-8') : '';
      if (prev === output) {
        console.log(`  [SAME] locales/${code}.js`);
      } else {
        fs.writeFileSync(outPath, output);
        console.log(`  [WROTE] locales/${code}.js`);
      }
      // dom-vocab/{code}.js
      const prevDV = fs.existsSync(domVocabPath) ? fs.readFileSync(domVocabPath, 'utf-8') : '';
      if (prevDV === domVocabOutput) {
        console.log(`  [SAME] dom-vocab/${code}.js`);
      } else {
        fs.writeFileSync(domVocabPath, domVocabOutput);
        console.log(`  [WROTE] dom-vocab/${code}.js`);
      }
      writeCount++;
    }
  }

  if (!args.dryRun) {
    console.log(`\nProcessed ${writeCount} locales (${skipCount} skipped).`);
  }
}

// Only run when invoked directly (`node scripts/gen-locales.mjs`), so the
// module can be imported by tests (which need extractEventValues) without
// triggering a generation pass.
const invokedDirectly =
  process.argv[1] &&
  fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
if (invokedDirectly) main();
