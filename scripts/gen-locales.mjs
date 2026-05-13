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

const EVENT_KEYWORDS = ['click', 'change', 'submit', 'input', 'focus', 'blur', 'init'];

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
 */
function extractEventValues(profileSource) {
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

/** Stable key order: group by canonical name following EVENT_KEYWORDS. */
function orderValues(values) {
  const ordered = {};
  for (const canonical of EVENT_KEYWORDS) {
    for (const [key, val] of Object.entries(values)) {
      if (val === canonical) ordered[key] = val;
    }
  }
  // Defensive: append any leftovers
  for (const [key, val] of Object.entries(values)) {
    if (!(key in ordered)) ordered[key] = val;
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
export const events = ${eventsBlock};
export const props = ${propsBlock};
`;
}

function renderLocaleFile(code, spec, fixiEvents) {
  const unreviewedBanner = spec.reviewed
    ? ''
    : `// ⚠ Unreviewed: fixi attribute names for this locale have not been
//   native-speaker reviewed. Event-name vocabulary IS reviewed (from
//   @lokascript/semantic profile). To suggest corrections, edit
//   loka-js/scripts/fx-vocab.mjs (LOCALES.${code}) and regenerate.
`;

  const header = `// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/${spec.profile}.ts (events)
//         loka-js/scripts/fx-vocab.mjs (fixi attrs + event overrides)
// Regenerate: cd loka-js && npm run gen
${unreviewedBanner}`;

  if (code === 'en') {
    return `${header}// English no-op — registered for completeness; English is canonical.
window.loka.register('en', { fixi: { attrs: {}, events: {} } });
`;
  }

  const attrs = stripIdentity(spec.fixi?.attrs ?? {});
  const events = stripIdentity(fixiEvents);

  const attrsBlock = formatObject(attrs, 4);
  const eventsBlock = formatObject(events, 4);

  return `${header}window.loka.register('${code}', {
  fixi: {
    attrs: ${attrsBlock},
    events: ${eventsBlock},
  },
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
    const events = orderValues(merged);

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

main();
