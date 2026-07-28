#!/usr/bin/env node
// Emit a self-contained terminology-research brief for one locale.
//
// Usage:
//   node scripts/research-brief.mjs                 # list locales, flag what needs review
//   node scripts/research-brief.mjs --locale=de     # markdown brief (human-readable)
//   node scripts/research-brief.mjs --locale=de --json
//                                                   # {topic, context} for a research tool
//   node scripts/research-brief.mjs --all --json    # every locale, as a JSON array
//
// Why this exists
// ---------------
// loka publishes localized DOM-event names as authoring tokens. Almost none of
// that vocabulary has been read by a native speaker: it comes from
// @lokascript/semantic profiles, which are themselves best-effort for most
// languages. Auditing it needs sources in the target language — tutorials,
// blog posts, course material — not English API docs, because MDN and friends
// do not translate event identifiers at all.
//
// That research happens outside this repo, in sessions with no checkout. So the
// brief has to carry everything: what the token is for, where it is allowed to
// appear, what we currently ship, and what would count as evidence. Anything
// left implicit comes back as an answer to the wrong question.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { EVENT_KEYWORDS } from './gen-locales.mjs';
import { LOCALES } from './fx-vocab.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.resolve(__dirname, '..', 'locales');
const PROFILES_DIR = path.resolve(
  __dirname,
  '../../hyperfixi/packages/semantic/src/generators/profiles'
);
// @lokascript/semantic keeps a SECOND, purpose-built event vocabulary here,
// separate from the profile `keywords` maps that gen-locales.mjs scrapes. It is
// event-only (no grammar or command entries), so it covers events the profiles
// never mention — German `taste runter`/`maus über`, Japanese キーダウン,
// Korean 마우스다운. A brief that ignored it would ask reviewers to invent terms
// that already exist upstream.
const EVENT_TABLE = path.resolve(
  __dirname,
  '../../hyperfixi/packages/semantic/src/patterns/event-handler.ts'
);

// Terms already researched, so a brief doesn't spend effort re-deriving them.
// Keyed `${code}:${canonical}`.
// Phrased as the concluded form rather than the transition, so the note stays
// unambiguous even if it is read against a checkout predating the regeneration.
const SETTLED = {
  'es:mousedown': "concluded: 'ratón abajo' — the fused 'ratónabajo' was malformed",
  'es:mouseup': "concluded: 'ratón arriba' — the fused 'ratónarriba' was malformed",
  'pt:mousedown': "concluded: 'mouse pressionado' — 'mouse baixo' calqued the English down/up",
  'pt:mouseup': "concluded: 'mouse solto' — 'mouse cima' calqued the English down/up",
  'de:resize': "concluded: 'Größenänderung' — 'größeändern' was a malformed compound",
  'pl:resize': "concluded: 'zmiana rozmiaru' — 'zmieńrozmiar' fused a two-word phrase",
};

function parseArgs() {
  const args = { locale: null, json: false, all: false, help: false };
  for (const a of process.argv.slice(2)) {
    if (a === '--json') args.json = true;
    else if (a === '--all') args.all = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a.startsWith('--locale=')) args.locale = a.slice('--locale='.length);
  }
  return args;
}

const _cache = new Map();
async function loadLocale(code) {
  if (_cache.has(code)) return _cache.get(code);
  const captured = {};
  globalThis.window = { loka: { register: (c, d) => { captured.data = d; } } };
  await import(pathToFileURL(path.join(LOCALES_DIR, `${code}.js`)).href);
  _cache.set(code, captured.data);
  return captured.data;
}

/**
 * Read `eventNameTranslations` and the round-trip denylist out of semantic's
 * event-handler source. Regex rather than an import, matching how
 * gen-locales.mjs reads the profiles — no build step, no TS toolchain.
 *
 * Returns { [lang]: { events: { canonical: [native, ...] }, deny: Set } }.
 * Empty when the sibling checkout is absent; the brief degrades to loka's own
 * data rather than failing.
 */
function upstreamEventTable() {
  let src;
  try {
    src = fs.readFileSync(EVENT_TABLE, 'utf8');
  } catch {
    return {};
  }
  const out = {};

  const tableStart = src.indexOf('export const eventNameTranslations');
  if (tableStart !== -1) {
    const body = src.slice(tableStart);
    // Each language is a two-space-indented block: `  ko: { ... },`
    const langRe = /^ {2}([a-z]{2}(?:-[a-z]+)?):\s*\{([\s\S]*?)^ {2}\},/gm;
    let m;
    while ((m = langRe.exec(body))) {
      const [, lang, block] = m;
      const events = {};
      // Keys come in three shapes: bare identifiers (클릭:), single-quoted when
      // they contain spaces ('taste runter':), and DOUBLE-quoted when they
      // contain an apostrophe — which is how Quechua's glottalized consonants
      // are written ("ñit'iy":). Missing that third case silently truncated
      // every Quechua term at the apostrophe.
      const entryRe = /(?:'([^']+)'|"([^"]+)"|([^\s:,'"{}]+))\s*:\s*'([^']+)'/g;
      let e;
      while ((e = entryRe.exec(block))) {
        const native = e[1] ?? e[2] ?? e[3];
        (events[e[4]] ??= []).push(native);
      }
      if (Object.keys(events).length) out[lang] = { events, deny: new Set() };
    }
  }

  const denyStart = src.indexOf('const eventLocalizationDenylist');
  if (denyStart !== -1) {
    const body = src.slice(denyStart, src.indexOf('};', denyStart));
    const denyRe = /([a-z]{2}):\s*new Set\(\[([\s\S]*?)\]\)/g;
    let m;
    while ((m = denyRe.exec(body))) {
      const set = new Set([...m[2].matchAll(/'([^']+)'/g)].map(x => x[1]));
      if (out[m[1]]) out[m[1]].deny = set;
    }
  }
  return out;
}

const UPSTREAM = upstreamEventTable();

/** Native language name from the semantic profile, when the sibling checkout exists. */
function nativeName(profile) {
  try {
    const src = fs.readFileSync(path.join(PROFILES_DIR, `${profile}.ts`), 'utf8');
    return src.match(/nativeName:\s*'([^']+)'/)?.[1] ?? null;
  } catch {
    return null; // sibling hyperfixi checkout absent — brief still works
  }
}

/**
 * Spellings that are probably artifacts rather than words. These are worth the
 * researcher's attention first — every one confirmed so far (ratónabajo,
 * größeändern, zmieńrozmiar) turned out to be malformed.
 */
function suspicions(form, canonical, spaced) {
  const out = [];
  const twoWord = /^(keydown|keyup|mousedown|mouseup|mouseover|mouseout)$/.test(canonical);
  if (twoWord && spaced && !/[\s-]/.test(form)) out.push('fused (English is two words)');
  if (/_/.test(form)) out.push('underscore — likely a tokenizer artifact');
  if (/[a-z][A-Z]/.test(form)) out.push('camelCase — not a natural spelling');
  // Deliberately NOT flagging capitalization. German capitalizes nouns, so
  // `Klick` is correct German, and lookup folds case anyway — flagging it would
  // send a reviewer after a non-issue.
  return out;
}

/** Group a locale's parse map by canonical, preserving primary-first order. */
function byCanonical(events) {
  const groups = {};
  for (const [form, canonical] of Object.entries(events)) {
    (groups[canonical] ??= []).push(form);
  }
  return groups;
}

async function buildBrief(code) {
  const spec = LOCALES[code];
  const data = await loadLocale(code);
  const groups = byCanonical(data.fixi.events);
  const handAuthored = new Set(Object.keys(spec.fixi?.events ?? {}));
  const native = nativeName(spec.profile);
  const label = native ? `${spec.name} (${native})` : spec.name;
  // Latin-script languages with spaces; used only to judge whether a fused
  // two-word form is suspicious.
  const spaced = !['zh', 'ja', 'th'].includes(code);

  const upstream = UPSTREAM[code] ?? { events: {}, deny: new Set() };

  const rows = [];
  for (const canonical of EVENT_KEYWORDS) {
    const forms = groups[canonical];
    if (!forms) {
      rows.push({
        canonical,
        primary: null,
        // A canonical loka doesn't publish may still have a term upstream that
        // simply never reached us — that is a candidate to validate, not a gap.
        upstreamOnly: upstream.events[canonical] ?? null,
        denied: upstream.deny.has(canonical),
      });
      continue;
    }
    const [primary, ...alts] = forms;
    const flags = suspicions(primary, canonical, spaced);
    rows.push({
      canonical,
      primary,
      alts,
      source: handAuthored.has(primary) ? 'hand-authored in loka' : `@lokascript/semantic '${spec.profile}' profile`,
      flags,
      settled: SETTLED[`${code}:${canonical}`] ?? null,
      multiword: /\s/.test(primary),
    });
  }

  const priority = rows.filter(r => r.flags?.length && !r.settled);
  const candidates = rows.filter(r => !r.primary && r.upstreamOnly);
  const missing = rows.filter(r => !r.primary && !r.upstreamOnly);

  const topic =
    `Terminology review: what do ${spec.name}-speaking web developers actually call the ` +
    `DOM browser events (click, keyup, scroll, resize, mousedown, …) when writing or ` +
    `teaching in ${spec.name}? Assess the ${rows.filter(r => r.primary).length} candidate ` +
    `${spec.name} terms listed in the context and say, for each, whether it is what a ` +
    `native developer would write — and if not, what they would.`;

  const lines = [];
  lines.push(`# Terminology review — ${label} [${code}]`);
  lines.push('');
  lines.push('## What these words are for');
  lines.push('');
  lines.push(
    `loka-js lets developers write HTML hypermedia attributes in their own language. ` +
    `Where an English author writes \`fx-trigger="click"\`, a ${spec.name} author writes ` +
    `the ${spec.name} token instead. So each term below is an **identifier a developer types**, ` +
    `not prose — it must be short, recognisable, and unambiguous out of context.`
  );
  lines.push('');
  lines.push('Two placement constraints shape what is usable:');
  lines.push('');
  lines.push('1. As an attribute **value** (`fx-trigger="…"`), multi-word terms are fine.');
  lines.push('2. As part of an attribute **name** (`on-…`), they are not — HTML attribute');
  lines.push('   names cannot contain spaces. A single-token term therefore works in both');
  lines.push('   places and a multi-word term only in the first. Single-token is preferable');
  lines.push('   where the language allows one naturally; do not invent a compound to get it.');
  lines.push('');
  lines.push('Case and separators (space/hyphen/underscore) are folded at lookup, so those');
  lines.push('are not correctness questions — only the choice of word is.');
  lines.push('');
  lines.push('## What we need from the research');
  lines.push('');
  lines.push(`Evidence of **real ${spec.name} usage**, preferably informal: tutorials, blog`);
  lines.push('posts, university or bootcamp course material, YouTube captions, forum threads,');
  lines.push(`Stack Overflow in ${spec.name}, translated framework docs. Please distinguish:`);
  lines.push('');
  lines.push(`- what formal/localized documentation calls the event, versus`);
  lines.push(`- what ${spec.name}-speaking developers say informally when teaching or explaining it.`);
  lines.push('');
  lines.push('The second matters more here — the audience is beginners learning hypermedia in');
  lines.push('their own language.');
  lines.push('');
  lines.push('Please cite sources per term, and say explicitly where you found nothing —');
  lines.push('"no usage found" is a useful answer and much better than a plausible guess.');
  lines.push('');
  lines.push('**Not in scope:** whether event names should be translated at all. We know major');
  lines.push('references (MDN and similar) keep the English identifiers; that is a settled');
  lines.push('product decision, not the question.');
  lines.push('');

  if (priority.length) {
    lines.push('## Priority — these spellings look like artifacts');
    lines.push('');
    lines.push('Every term of this shape checked so far turned out to be malformed rather than');
    lines.push('merely awkward, so start here:');
    lines.push('');
    for (const r of priority) {
      lines.push(`- **${r.canonical}** → \`${r.primary}\` — ${r.flags.join('; ')}`);
    }
    lines.push('');
  }

  lines.push('## Terms to assess');
  lines.push('');
  lines.push('| DOM event | term we ship | also accepted | source |');
  lines.push('|---|---|---|---|');
  for (const r of rows) {
    if (!r.primary) continue;
    const alts = r.alts.length ? r.alts.map(a => `\`${a}\``).join(', ') : '—';
    const flag = r.settled ? ' ✓ already reviewed' : r.flags.length ? ' ⚠' : '';
    lines.push(`| \`${r.canonical}\` | \`${r.primary}\`${flag} | ${alts} | ${r.source} |`);
  }
  lines.push('');

  const settled = rows.filter(r => r.settled);
  if (settled.length) {
    lines.push('Already researched and corrected — confirm only, do not re-derive:');
    lines.push('');
    for (const r of settled) lines.push(`- \`${r.canonical}\`: ${r.settled}`);
    lines.push('');
  }

  if (candidates.length) {
    lines.push('## Candidates — terms that exist upstream but we do not publish');
    lines.push('');
    lines.push(
      `A separate ${spec.name} table in @lokascript/semantic has these, but they never ` +
      `reached loka. That table is documented upstream as **aspirational** — it lists ` +
      `forms that were proposed rather than verified in use — so these need the closest ` +
      `reading. Are they real ${spec.name}, or invented compounds?`
    );
    lines.push('');
    lines.push('| DOM event | proposed term | upstream round-trip |');
    lines.push('|---|---|---|');
    for (const r of candidates) {
      const forms = r.upstreamOnly.map(f => `\`${f}\``).join(', ');
      lines.push(`| \`${r.canonical}\` | ${forms} | ${r.denied ? '**fails** — extra scrutiny' : 'passes'} |`);
    }
    lines.push('');
    lines.push('"Fails round-trip" upstream means the form does not re-parse back to the same');
    lines.push('event there. That is a different system from loka, so it is not disqualifying —');
    lines.push('but it correlates with a term being invented rather than observed, so treat it');
    lines.push('as a reason to look harder for real usage.');
    lines.push('');
  }

  if (missing.length) {
    lines.push('## Gaps — no term anywhere');
    lines.push('');
    lines.push(
      `Neither loka nor @lokascript/semantic has a ${spec.name} term for these, so authors ` +
      `must write the English token. If a natural ${spec.name} term exists, proposing one ` +
      `is as valuable as correcting a wrong one:`
    );
    lines.push('');
    lines.push(missing.map(r => `\`${r.canonical}\``).join(', '));
    lines.push('');
  }

  lines.push('## Answer format');
  lines.push('');
  lines.push('Per term: **keep** / **change to X** / **no evidence found**, one or two sentences');
  lines.push('of reasoning, and the sources. Flag any term that reads as an imperative command');
  lines.push('("do this") rather than an event ("this happened") — that distinction is the one');
  lines.push('we are least sure we have right.');

  return { code, topic, context: lines.join('\n'), priorityCount: priority.length };
}

async function main() {
  const args = parseArgs();
  if (args.help) {
    console.log(`Emit terminology-research briefs.

  --locale=<code>  brief for one locale
  --all            every locale
  --json           emit {topic, context} instead of markdown
  --help           this message`);
    return;
  }

  if (!args.locale && !args.all) {
    // Default: an index of what most needs review.
    const rows = [];
    for (const code of Object.keys(LOCALES)) {
      if (code === 'en') continue;
      const b = await buildBrief(code);
      rows.push([code, LOCALES[code].name, LOCALES[code].reviewed ? 'attrs reviewed' : '', b.priorityCount]);
    }
    rows.sort((a, b) => b[3] - a[3]);
    console.log('locale  language        attrs           suspect terms');
    console.log('-'.repeat(58));
    for (const [code, name, rev, n] of rows) {
      console.log(code.padEnd(8) + name.padEnd(16) + rev.padEnd(16) + (n || ''));
    }
    console.log('\nBrief for one locale:  node scripts/research-brief.mjs --locale=<code>');
    return;
  }

  const codes = args.all ? Object.keys(LOCALES).filter(c => c !== 'en') : [args.locale];
  if (args.locale && !LOCALES[args.locale]) {
    console.error(`Unknown locale: ${args.locale}`);
    console.error(`Known: ${Object.keys(LOCALES).join(', ')}`);
    process.exit(1);
  }

  const briefs = [];
  for (const c of codes) briefs.push(await buildBrief(c));

  if (args.json) {
    console.log(JSON.stringify(args.all ? briefs : briefs[0], null, 2));
  } else {
    console.log(briefs.map(b => b.context).join('\n\n---\n\n'));
  }
}

main();
