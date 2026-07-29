#!/usr/bin/env node
// Turn a Deep Research report into research/findings/<code>.json.
//
// Usage:
//   node scripts/distill.mjs --locale=tr --report=path/to/report.md   # prompt
//   node scripts/distill.mjs --locale=tr --skeleton                   # empty rows
//   node scripts/distill.mjs --locale=tr --check=research/findings/tr.json
//
// Why this exists
// ---------------
// Deep Research will not produce a per-term verdict table, and asking harder
// makes it worse. Two French runs established this:
//
//   - Asked as an open question, it returned genuinely useful sourced evidence
//     about real usage, in continuous prose, covering a term set of its own
//     choosing.
//   - Asked for "a verdict on each of 21 terms" with a row count and an output
//     template, it returned a well-formed 23-row table in which 16 rows were
//     terms nobody asked about (`CSS`, `API`, `Daemon`, `Cache`) — including one
//     row assessing the word "verdict", lifted from the instruction itself.
//
// It is retrieval-first: a long context is a topic to search from, not a work
// list to iterate over, so a countable output constraint gets satisfied by
// fabrication. The fix is not a better prompt. It is to stop asking the
// research step for structure, and impose the structure locally afterwards —
// where the row set is generated from `buildBrief`'s inventory and therefore
// cannot be invented, omitted, or renamed.
//
// This script does not call a model. It renders a prompt for a session that
// already has one, in the same way research-brief.mjs and verify-prompt.mjs do,
// and it validates the result when it comes back. `--check` is the part that
// carries the guarantee: a filled findings file is compared against the
// inventory, so a missing term or an invented one fails here rather than
// surviving into the settled record.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildBrief } from './research-brief.mjs';
import { LOCALES } from './fx-vocab.mjs';

// Verdict vocabulary per section, matching RESEARCH_PIPELINE.md. The sections
// take different verdicts because they ask different questions: a shipped term
// is kept or corrected, an unpublished candidate is published or dropped, and a
// gap either yields a proposal or does not.
const VERDICTS = {
  // `reject` on a shipped term means "no usage found" — publish nothing and let
  // authors write the English canonical. That becomes `concluded: null`, which
  // is the difference between "we looked and found nothing" and "nobody looked".
  attrs: ['keep', 'change', 'reject'],
  events: ['keep', 'change', 'reject'],
  candidates: ['publish', 'publish-corrected', 'reject'],
  gaps: ['propose', 'reject'],
};

const SECTIONS = ['attrs', 'events', 'candidates', 'gaps'];

function parseArgs() {
  const args = { locale: null, report: null, check: null, skeleton: false, help: false };
  for (const a of process.argv.slice(2)) {
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--skeleton') args.skeleton = true;
    else if (a.startsWith('--locale=')) args.locale = a.slice('--locale='.length);
    else if (a.startsWith('--report=')) args.report = a.slice('--report='.length);
    else if (a.startsWith('--check=')) args.check = a.slice('--check='.length);
  }
  return args;
}

/** Group the brief's inventory into the findings-file section shape. */
function sectionsFor(inventory) {
  const out = { attrs: [], events: [], candidates: [], gaps: [] };
  for (const row of inventory) out[row.kind].push(row);
  return out;
}

/** An empty findings file with every row present and no verdict filled in. */
function skeleton(code, inventory) {
  const grouped = sectionsFor(inventory);
  const blank = row => {
    const base = { canonical: row.canonical };
    if (row.kind === 'candidates') base.upstream = row.upstream;
    else base.shipped = row.shipped;
    return { ...base, verdict: null, proposed: null, reasoning: '', sources: [] };
  };
  const doc = { code };
  for (const s of SECTIONS) doc[s] = grouped[s].map(blank);
  doc.familyTokens = [];
  doc.variantSplit = { warranted: false, reasoning: '' };
  doc.overall = '';
  return doc;
}

/**
 * Resolve a report's `[cite: N]` markers against its trailing source list.
 *
 * Gemini cites inline by number and lists the sources once at the end, as
 * `12. [example.com](https://vertexaisearch.cloud.google.com/…redirect…)`.
 * Without this map a distiller writes `"code.mu (cite 16)"` into `sources[]`,
 * which is not a citation anyone can follow — and the verify prompt's whole
 * premise is that the next reviewer checks the sources rather than trusting
 * them. The redirect URLs may not outlive the report, so the domain is kept
 * alongside: between the two, a dead link is still traceable.
 */
function citationMap(report) {
  const map = new Map();
  for (const m of report.matchAll(/^(\d+)\.\s+\[([^\]]+)\]\((\S+?)\)\s*$/gm)) {
    map.set(Number(m[1]), { domain: m[2], url: m[3] });
  }
  return map;
}

function describe(row) {
  if (row.kind === 'candidates') {
    return `\`${row.canonical}\` — upstream proposes ${row.upstream.map(f => `\`${f}\``).join(', ')}, we publish nothing`;
  }
  if (row.kind === 'gaps') return `\`${row.canonical}\` — no term anywhere; authors write the English token`;
  if (!row.shipped) return `\`${row.canonical}\` — deliberately untranslated`;
  const alts = row.alts?.length ? ` (also accepted: ${row.alts.map(a => `\`${a}\``).join(', ')})` : '';
  return `\`${row.canonical}\` — we ship \`${row.shipped}\`${alts}`;
}

function prompt(code, spec, inventory, report) {
  const grouped = sectionsFor(inventory);
  const total = inventory.length;
  const L = [];

  L.push(`# Distill the ${spec.name} terminology report into findings`);
  L.push('');
  L.push(
    `Below are ${total} terms loka publishes or considered publishing for ${spec.name}, and a ` +
    `Deep Research report about ${spec.name} developer usage. Produce one verdict row per term.`
  );
  L.push('');
  L.push('## The rule that matters');
  L.push('');
  L.push(
    `The term list is fixed. Every row of your output corresponds to exactly one term below, ` +
    `all ${total} of them, in this order. You may not add a term the list does not contain, ` +
    `however much the report discusses it — the report was free to research whatever it liked, ` +
    `and it did. **If the report says nothing about a term, that term's verdict is \`reject\` ` +
    `with reasoning "not addressed by the report".** That is the expected outcome for many of ` +
    `them and is not a failure.`
  );
  L.push('');
  L.push(
    'Do not infer a verdict from general claims. A report that says developers keep English ' +
    'identifiers has not thereby assessed our term — it has, at most, supplied evidence that ' +
    'no native term is in use, which is `reject`, not `keep`. Quote or closely paraphrase the ' +
    'report in `reasoning`, and carry its sources across.'
  );
  L.push('');
  const cites = citationMap(report);
  if (cites.size) {
    L.push(
      `\`sources\` must contain resolved URLs from the citation map below — not \`cite N\` ` +
      `strings, which nobody can follow. The report marks citations inline as \`[cite: 3, 7]\`; ` +
      `look each number up and copy the URL.`
    );
    L.push('');
  }
  L.push('');

  L.push('## The terms');
  L.push('');
  for (const s of SECTIONS) {
    if (!grouped[s].length) continue;
    L.push(`**${s}** — verdict is one of ${VERDICTS[s].map(v => `\`${v}\``).join(', ')}`);
    L.push('');
    for (const row of grouped[s]) L.push(`- ${describe(row)}`);
    L.push('');
  }

  L.push('## Output');
  L.push('');
  L.push(`Emit this JSON, filling every \`verdict\`, \`reasoning\` and \`sources\`. Set`);
  L.push('`proposed` only for `change`, `publish-corrected` and `propose`.');
  L.push('');
  L.push('```json');
  L.push(JSON.stringify(skeleton(code, inventory), null, 2));
  L.push('```');
  L.push('');
  L.push(
    `Write it to \`research/findings/${code}.json\`, then run ` +
    `\`node scripts/distill.mjs --locale=${code} --check=research/findings/${code}.json\`, ` +
    `which fails if any term is missing or unknown.`
  );
  L.push('');
  L.push('Set `overall` to a sentence on whether the report actually answered the brief —');
  L.push('including, if true, that it largely did not. That is a signal about the review, not');
  L.push('the vocabulary, and it is the thing most worth recording.');
  L.push('');
  if (cites.size) {
    L.push('## Citation map');
    L.push('');
    L.push(`\`[cite: N]\` in the report resolves as follows (${cites.size} sources).`);
    L.push('');
    L.push('| N | site | url |');
    L.push('|---|---|---|');
    for (const [n, { domain, url }] of [...cites].sort((a, b) => a[0] - b[0])) {
      L.push(`| ${n} | ${domain} | ${url} |`);
    }
    L.push('');
  }

  L.push('## The report');
  L.push('');
  L.push(report.trim());

  return L.join('\n');
}

/** Compare a filled findings file against the inventory it must cover. */
function check(code, inventory, doc) {
  const problems = [];
  const grouped = sectionsFor(inventory);

  if (doc.code !== code) problems.push(`\`code\` is ${JSON.stringify(doc.code)}, expected "${code}"`);

  for (const s of SECTIONS) {
    const expected = grouped[s].map(r => r.canonical);
    const actual = (doc[s] ?? []).map(r => r.canonical);

    for (const canonical of expected) {
      if (!actual.includes(canonical)) problems.push(`${s}: missing \`${canonical}\``);
    }
    for (const canonical of actual) {
      if (!expected.includes(canonical)) {
        // The failure this whole script exists to catch.
        problems.push(`${s}: \`${canonical}\` is not a term we asked about`);
      }
    }
    const seen = new Set();
    for (const canonical of actual) {
      if (seen.has(canonical)) problems.push(`${s}: \`${canonical}\` appears more than once`);
      seen.add(canonical);
    }

    for (const row of doc[s] ?? []) {
      if (!expected.includes(row.canonical)) continue;
      if (!VERDICTS[s].includes(row.verdict)) {
        problems.push(
          `${s}/${row.canonical}: verdict ${JSON.stringify(row.verdict)} is not one of ` +
          VERDICTS[s].join(', ')
        );
      }
      const needsProposal = ['change', 'publish-corrected', 'propose'].includes(row.verdict);
      if (needsProposal && !row.proposed) {
        problems.push(`${s}/${row.canonical}: verdict \`${row.verdict}\` needs a \`proposed\` form`);
      }
      if (!needsProposal && row.proposed) {
        problems.push(`${s}/${row.canonical}: verdict \`${row.verdict}\` must not carry \`proposed\``);
      }
      if (!row.reasoning?.trim()) problems.push(`${s}/${row.canonical}: empty \`reasoning\``);
      // Sources are required for any positive claim about usage. A `reject`
      // meaning "found nothing" legitimately has none.
      const positive = ['keep', 'change', 'publish', 'publish-corrected', 'propose'];
      if (positive.includes(row.verdict) && !(row.sources?.length)) {
        problems.push(`${s}/${row.canonical}: verdict \`${row.verdict}\` asserts usage but cites no sources`);
      }
      // A source has to be followable. `"code.mu (cite 16)"` is a note about a
      // citation, not a citation — and verify-prompt.mjs hands these to the
      // next reviewer expecting them to be checkable.
      for (const src of row.sources ?? []) {
        if (!/^https?:\/\/\S+$/.test(String(src).trim())) {
          problems.push(
            `${s}/${row.canonical}: source ${JSON.stringify(src)} is not a URL — ` +
            'resolve it against the report\'s citation map'
          );
        }
      }
    }
  }

  if (!doc.overall?.trim()) problems.push('`overall` is empty — record whether the report answered the brief');
  return problems;
}

async function main() {
  const args = parseArgs();
  if (args.help || (!args.locale && !args.help)) {
    console.log(`Impose per-term structure on a Deep Research report, locally.

  --locale=<code>       required
  --report=<path>       render a distillation prompt around this report
  --skeleton            print the empty findings JSON and exit
  --check=<path>        validate a filled findings file against the term list
  --help                this message

The research step is not asked for structure — it cannot hold to a fixed term
list. The row set here is generated from the brief's own inventory, so a
missing or invented term fails --check instead of reaching settled-terms.`);
    return;
  }
  if (!LOCALES[args.locale]) {
    console.error(`Unknown locale: ${args.locale}`);
    console.error(`Known: ${Object.keys(LOCALES).join(', ')}`);
    process.exit(1);
  }

  const spec = LOCALES[args.locale];
  const { inventory } = await buildBrief(args.locale, 'review');

  if (args.skeleton) {
    console.log(JSON.stringify(skeleton(args.locale, inventory), null, 2));
    return;
  }

  if (args.check) {
    let doc;
    try {
      doc = JSON.parse(fs.readFileSync(args.check, 'utf8'));
    } catch (e) {
      console.error(`✗ cannot read ${args.check}: ${e.message}`);
      process.exit(1);
    }
    const problems = check(args.locale, inventory, doc);
    if (problems.length) {
      for (const p of problems) console.error(`  ✗ ${p}`);
      console.error(`\n${problems.length} problem(s) — findings do not match the term list.`);
      process.exit(1);
    }
    console.log(`✓ ${args.check}: all ${inventory.length} terms accounted for, verdicts valid.`);
    return;
  }

  if (!args.report) {
    console.error('Specify --report=<path>, --skeleton, or --check=<path>. See --help.');
    process.exit(1);
  }
  const report = fs.readFileSync(args.report, 'utf8');
  console.log(prompt(args.locale, spec, inventory, report));
  console.error(`✓ ${inventory.length} terms, prompt rendered.`);
}

const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) await main();

export { skeleton, check, sectionsFor, VERDICTS };
