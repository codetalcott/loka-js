#!/usr/bin/env node
// Guards that the committed locales/*.js and dom-vocab/*.js match what the
// generator produces from the current @lokascript/semantic checkout.
//
// Why this exists
// ---------------
// The vocabulary has three homes: the semantic profiles in the hyperfixi
// sibling, the LOCALES table in scripts/fx-vocab.mjs, and the generated files
// committed here. Nothing forced the third to agree with the first two, and the
// disagreement is invisible: `npm run gen` silently rewrites, so whoever runs it
// next absorbs an unrelated vocabulary change into their diff — or, if they
// don't run it, the published data quietly lags the upstream terms.
//
// This bit us concretely. A round of event-term corrections (de/pl/pt resize and
// mousedown/mouseup) was applied to the locale files here before the matching
// fix landed upstream, so for a window the committed output could not be
// reproduced from the checkout. Reading event counts could not distinguish
// "committed files are ahead" from "checkout is behind"; this test answers it in
// one command.
//
// A failure here is NOT necessarily a bug. It means the checkout and the
// committed output disagree, and you have to decide which is right:
//   - upstream changed and the change is wanted → `npm run gen`, commit both
//   - the sibling checkout is stale            → pull hyperfixi, re-run
//   - a locale file was hand-edited            → don't; edit fx-vocab.mjs or the
//                                                 profile and regenerate
//
// Pure Node, no browser/server needed:  node test/gen-drift.mjs

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderLocale } from '../scripts/gen-locales.mjs';
import { LOCALES } from '../scripts/fx-vocab.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
let skipped = 0;
const ok = (cond, msg) => {
  if (cond) {
    console.log(`  ✓ ${msg}`);
  } else {
    console.error(`  ✗ ${msg}`);
    failures++;
  }
};

/** First differing line, so a failure names the term rather than the file. */
function firstDifference(committed, fresh) {
  const a = committed.split('\n');
  const b = fresh.split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      return `line ${i + 1}\n      committed: ${JSON.stringify(a[i] ?? '<end of file>')}\n      generated: ${JSON.stringify(b[i] ?? '<end of file>')}`;
    }
  }
  return 'files differ only in trailing content';
}

console.log('Generated output matches the current semantic checkout:');

for (const code of Object.keys(LOCALES)) {
  const result = renderLocale(code);

  // The sibling checkout is optional by design — gen-locales.mjs skips locales
  // whose profile is missing rather than failing. Mirror that here so the test
  // is runnable without hyperfixi, and say so loudly at the end.
  if (result.skipped) {
    console.log(`  – ${code}: skipped, no profile at ${path.relative(ROOT, result.profilePath)}`);
    skipped++;
    continue;
  }

  for (const { path: outPath, output } of result.files) {
    const rel = path.relative(ROOT, outPath);
    if (!fs.existsSync(outPath)) {
      ok(false, `${rel} exists`);
      continue;
    }
    const committed = fs.readFileSync(outPath, 'utf-8');
    if (committed === output) {
      ok(true, rel);
    } else {
      ok(false, `${rel} — regenerating would change it\n      ${firstDifference(committed, output)}`);
    }
  }
}

console.log('');
if (skipped) {
  console.log(
    `${skipped} locale(s) skipped: the @lokascript/semantic checkout is not at\n` +
      `../hyperfixi, so their vocabulary could not be verified against upstream.`
  );
}

if (failures) {
  console.error(`${failures} check(s) failed — committed output does not match a fresh generate.`);
  console.error(`Run \`npm run gen\` and inspect the diff before committing it.`);
  process.exit(1);
}
console.log('All generated files reproduce from the current checkout.');
