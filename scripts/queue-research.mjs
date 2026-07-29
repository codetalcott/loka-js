#!/usr/bin/env node
// Turn a terminology brief into a gemini-deep-research topic payload.
//
// Usage:
//   node scripts/queue-research.mjs --locale=pt          # print the payload
//   node scripts/queue-research.mjs --locale=pt --json   # {topic, context, priority}
//   node scripts/queue-research.mjs --wave               # the priority-locale wave
//
// Why a script and not a hand-written prompt
// ------------------------------------------
// The harvest side of that pipeline parses the context string with literal
// anchors — `PROJECT:` and `AIMS (decide these):` must appear exactly, or the
// report lands in "aimless mode" and is filed as a searchable copy with no
// synthesis at all. Hand-composing that per locale is 23 chances to typo an
// anchor and not find out for 6-30 hours.
//
// This does NOT queue anything. It prints a payload for a caller (an agent
// session, or a human) to pass to the `add_research_topic` MCP tool. Queuing
// from here would need the MCP client, and the round trip is long enough that
// eyeballing the payload first is worth the extra step.

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildBrief } from './research-brief.mjs';
import { LOCALES } from './fx-vocab.mjs';
import { settledFor } from './settled-terms.mjs';

// Ordered by developer-audience size against how much of the vocabulary has
// never been read by a native speaker. Not a ranking of languages — a ranking of
// where a wrong term costs the most learners.
//
// "Audience" here is not speaker count. It is roughly
//
//     speakers  ×  how likely they are to learn to code in their own language
//
// and the second factor dominates. India has one of the largest developer
// populations on earth and most of its professional work happens in English, so
// Hindi ranks on the strength of school-age and tier-2/3 beginners rather than
// on the industry. Indonesia is smaller and ranks higher per speaker, because
// English proficiency there is genuinely low and the developer population is
// young and growing. loka exists for the beginner who would otherwise bounce off
// an English-only API, so that is the population being counted.
//
// Coverage is the multiplier: a locale missing 9 of the 16 published canonicals
// has more unwritten vocabulary than wrong vocabulary, and a brief that asks for
// terms we have never had is worth more than one asking to confirm terms we do.
//
// Wave 1 — done 2026-07-28. The six best-covered locales, where the risk was a
// wrong term already in front of learners rather than a missing one.
//
// `es` was in it despite being the one locale whose attribute names had had a
// native-speaker pass: it is also the only locale that localizes the rest of the
// fixi family (moxi modifiers, paxi swaps, rexi verbs, ssexi events), and none of
// that had been reviewed by anyone. It carries roughly three times the tokens of
// any other locale, so it was simultaneously the best-checked and least-checked.
const WAVE_1 = ['ja', 'pt', 'de', 'zh', 'ko', 'es'];

// Wave 2 — the large-audience locales, all of which are also badly under-covered
// (7–10 of 16 canonicals). Every one of them is missing the whole keyboard and
// pointer set, so these briefs lean on the "no term anywhere" section: proposing
// a term is the work, not correcting one.
//
//   ar  ~400M. Attribute names already reviewed and it is the only RTL locale
//       with demo and test coverage, so the events are the gap. 8/16.
//   hi  ~600M speakers, the single largest beginner audience in the set. 8/16.
//   id  ~250M with the lowest coverage of any non-stub locale and the lowest
//       English proficiency of the large candidates. Missing `blur` entirely. 7/16.
//   ru  ~250M including second-language use across Central Asia; large developer
//       community with a long-standing habit of Russian-language documentation. 9/16.
//   bn  ~270M. Bangladesh's freelance and product developer population is growing
//       fast and is served far less well by English material than India's. 8/16.
//   tr  ~85M. Low English proficiency against a large, young developer
//       population — the clearest case where a localized API is the difference. 9/16.
//   vi  ~85M with a very large outsourcing and product sector. 8/16.
//   fr  ~300M including francophone Africa, which is where the beginner audience
//       actually is. Best-covered of this wave (10/16), so the cheapest. Ranked
//       last because French developers are the best served by English material.
const WAVE_2 = ['ar', 'hi', 'id', 'ru', 'bn', 'tr', 'vi', 'fr'];

// Wave 3 — the remainder, deferred rather than dismissed. Smaller audiences,
// with two locales that are a different task entirely:
//
//   qu, sw  queue in COINAGE mode. Searching for Quechua web-development writing
//           returns essentially nothing, and Swahili has the common events but
//           nothing for the keyboard and pointer set. Applying the evidence-first
//           rule there yields an English API for the two audiences least able to
//           fall back on English, so invention is permitted — see
//           RESEARCH_PIPELINE.md, "Coinage track", and the COINAGE table in
//           research-brief.mjs, which gates it per locale.
//
// Not queued yet: wave 2 is still in flight, and running two waves at once means
// harvesting reports against a vocabulary that is moving underneath them.
const WAVE_3 = ['it', 'pl', 'uk', 'he', 'ms', 'th', 'tl', 'sw', 'qu'];

// Locales whose payload is built from a coinage brief rather than a review brief.
const COINAGE_MODE = new Set(['qu', 'sw']);

const WAVES = { 1: WAVE_1, 2: WAVE_2, 3: WAVE_3 };
const DEFAULT_WAVE = 2;

const modeFor = code => (COINAGE_MODE.has(code) ? 'coinage' : 'review');

const PROJECT = 'loka-js';

function parseArgs() {
  const args = { locale: null, wave: null, json: false, help: false, priority: 0 };
  for (const a of process.argv.slice(2)) {
    if (a === '--json') args.json = true;
    else if (a === '--wave') args.wave = DEFAULT_WAVE;
    else if (a.startsWith('--wave=')) args.wave = a.slice('--wave='.length);
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a.startsWith('--locale=')) args.locale = a.slice('--locale='.length);
    else if (a.startsWith('--priority=')) args.priority = Number(a.slice('--priority='.length));
  }
  return args;
}

/**
 * The aims. Written as decisions rather than questions, because the harvest
 * restates them verbatim in the note's TL;DR and answers a "should we…?" with a
 * summary instead of a verdict.
 *
 * Only aims the brief actually supports are included — an aim about regional
 * variants in a locale with one written standard invites an invented finding.
 */
function aimsFor(code, spec, brief) {
  const aims = [
    `For each attribute name and event name in the brief, decide: keep the term we ship, ` +
      `change it to a specific alternative, or record that no ${spec.name} usage was found.`,
    `Decide which of the terms we ship are calques or invented compounds rather than forms ` +
      `${spec.name}-speaking developers actually write, and what should replace each.`,
  ];

  if (brief.context.includes('## Candidates — terms that exist upstream')) {
    aims.push(
      `Decide whether the candidate terms that exist upstream but are unpublished should be ` +
        `published as-is, published in a corrected form, or left out.`
    );
  }
  if (brief.context.includes('## Gaps — no term anywhere')) {
    aims.push(
      `For the canonicals with no term at all, decide whether a natural ${spec.name} term ` +
        `exists to propose, or whether authors should keep writing the English token.`
    );
  }
  if (brief.context.includes('### Specific terms we already suspect')) {
    aims.push(
      `For each term in "Specific terms we already suspect", decide whether the suspicion is ` +
        `correct and what the replacement should be — respecting the placement constraint ` +
        `stated with each one, since the natural phrasing may be illegal in that position.`
    );
  }
  if (brief.context.includes('### Other fixi-family tokens')) {
    aims.push(
      `Decide which of the non-fx-* tokens (moxi modifiers, paxi swap strategies, rexi verbs, ` +
        `ssexi event names) are wrong — these have never been reviewed and were checked by no ` +
        `automated heuristic.`
    );
  }
  if (brief.context.includes('### Regional variation')) {
    aims.push(
      `Decide whether ${spec.name} warrants separate regional vocabularies, and if so, ` +
        `exactly which terms differ — a per-term list, not a general impression.`
    );
  }
  if (brief.context.includes('## Where you find nothing: design a term')) {
    // Phrased so the search is the first half of the deliverable, not a
    // precondition the researcher can skip on the way to the fun part.
    aims.push(
      `For every canonical with no attested ${spec.name} term, deliver one of two things: ` +
        `the attested term you found, or a coined term meeting the stated design criteria — ` +
        `labelled COINED, with the searches you ran before concluding nothing existed.`
    );
    aims.push(
      `Decide which of the coined terms form correct opposing pairs (keydown/keyup, ` +
        `mousedown/mouseup, mouseover/mouseout), since a learner who meets one will guess ` +
        `the other and a pair that does not read as opposites is wrong.`
    );
  }
  return aims;
}

/**
 * Project state the researcher needs and cannot infer from the brief: what loka
 * is, who reads the output, and which questions are already closed. Without the
 * closed ones a report spends its length re-arguing whether to translate event
 * names at all.
 */
function additionalContext(code, spec) {
  const settled = settledFor(code);
  const lines = [
    `loka-js lets developers write fixi-family hypermedia HTML in their own language: an ` +
      `author writes \`fx-gatilho="clique"\` and the library resolves it at attribute-read ` +
      `time, with no DOM rewriting. The audience is deliberately beginner developers in ` +
      `non-English locales, not experienced developers who already read English APIs — so ` +
      `the test for a term is whether a learner would recognise it, not whether it is the ` +
      `most precise translation.`,
    ``,
    `Current state for ${spec.name}: the vocabulary comes from the @lokascript/semantic ` +
      `'${spec.profile}' profile, which is best-effort and machine-assisted for most ` +
      `languages. ${spec.reviewed ? 'Attribute names have had a native-speaker pass; event names have not.' : 'Neither the attribute names nor the event names have ever been read by a native speaker.'}`,
    ``,
    `Decisions already made, which the research should be consistent with rather than ` +
      `revisit:`,
    `- Whether to translate these identifiers at all is settled — yes. That major ` +
      `references keep the English identifiers is known and is not the question.`,
    `- Case and separators are folded at lookup, so capitalization and hyphen-vs-space are ` +
      `not correctness questions. Only the choice of word is.`,
    `- Attribute NAMES cannot contain spaces (an HTML constraint). Event names used as ` +
      `attribute VALUES can.`,
    `- Old spellings are always retained as parse alternatives, so a correction never ` +
      `breaks an existing page. Recommending a change carries no compatibility cost.`,
  ];

  if (settled.length) {
    lines.push(
      `- Already concluded for this locale (confirm if you disagree, but do not spend the ` +
        `report re-deriving): ` +
        settled.map(([canonical, rec]) => `${canonical} → '${rec.concluded}'`).join(', ') +
        `.`
    );
  }

  return lines.join('\n');
}

/**
 * The full payload for `add_research_topic`.
 *
 * `priority` defaults to 0 deliberately. It is a cross-project contention knob —
 * it only does anything when topics from other projects are competing for the
 * same queue slots, and this script cannot see them. Within a wave it is inert:
 * the queue orders by `priority DESC, created_at ASC`, so queuing a wave in
 * order already preserves that order at equal priority. Pass --priority only
 * when you are deciding, at queue time, that this wave outranks other work.
 */
export async function buildPayload(code, priority = 0) {
  const spec = LOCALES[code];
  const brief = await buildBrief(code, modeFor(code));
  const aims = aimsFor(code, spec, brief);

  // The anchors below are load-bearing: the harvest parser keys on the literal
  // strings `PROJECT:` and `AIMS (decide these):`. Do not reformat.
  const context = [
    `PROJECT: ${PROJECT}`,
    ``,
    `AIMS (decide these):`,
    ...aims.map((a, i) => `${i + 1}. ${a}`),
    ``,
    `TOPIC: ${brief.topic}`,
    ``,
    `ADDITIONAL CONTEXT:`,
    additionalContext(code, spec),
    ``,
    `---`,
    ``,
    brief.context,
  ].join('\n');

  return { code, topic: brief.topic, context, priority };
}

/** Fail loudly here rather than 6-30 hours later in an unparseable report. */
function assertAnchors(payload) {
  const problems = [];
  if (!payload.context.startsWith(`PROJECT: ${PROJECT}\n`)) {
    problems.push('context must begin with the `PROJECT: <name>` anchor');
  }
  if (!payload.context.includes('\nAIMS (decide these):\n')) {
    problems.push('context must contain the literal `AIMS (decide these):` anchor');
  }
  // Anchored to the marker, not merely present somewhere: the brief body has its
  // own numbered lists, and a loose match would pass a payload whose AIMS block
  // is empty.
  if (!/\nAIMS \(decide these\):\n1\. \S/.test(payload.context)) {
    problems.push('a numbered aim must follow the AIMS anchor immediately');
  }
  if (!payload.topic || payload.topic.length < 40) {
    problems.push('topic is missing or too short to be a research prompt');
  }
  return problems;
}

async function main() {
  const args = parseArgs();
  if (args.help) {
    console.log(`Compose gemini-deep-research payloads from terminology briefs.

  --locale=<code>  one locale
  --wave           the current wave, ${DEFAULT_WAVE} (${WAVES[DEFAULT_WAVE].join(', ')})
  --wave=<n>       a specific wave${Object.entries(WAVES)
    .map(([n, w]) => `\n                     ${n}: ${w.join(', ')}`)
    .join('')}
  --json           emit JSON instead of a readable payload
  --priority=<n>   queue priority, default 0. Only affects ordering against
                   topics from OTHER projects; within a wave, insertion order
                   already decides
  --help           this message

Prints only. To queue, pass {topic, context, priority} to the
add_research_topic tool on the gemini-deep-research MCP server.`);
    return;
  }

  if (!args.locale && !args.wave) {
    console.error('Specify --locale=<code> or --wave. See --help.');
    process.exit(1);
  }
  if (args.locale && !LOCALES[args.locale]) {
    console.error(`Unknown locale: ${args.locale}`);
    console.error(`Known: ${Object.keys(LOCALES).join(', ')}`);
    process.exit(1);
  }
  if (args.wave && !WAVES[args.wave]) {
    console.error(`Unknown wave: ${args.wave}. Known: ${Object.keys(WAVES).join(', ')}`);
    process.exit(1);
  }

  const codes = args.wave ? WAVES[args.wave] : [args.locale];
  const payloads = [];
  for (const c of codes) payloads.push(await buildPayload(c, args.priority));

  let bad = 0;
  for (const p of payloads) {
    const problems = assertAnchors(p);
    if (problems.length) {
      bad++;
      console.error(`✗ ${p.code}: ${problems.join('; ')}`);
    }
  }
  if (bad) {
    console.error(`\n${bad} payload(s) malformed — not safe to queue.`);
    process.exit(1);
  }

  if (args.json) {
    console.log(JSON.stringify(args.wave ? payloads : payloads[0], null, 2));
    return;
  }

  for (const p of payloads) {
    console.log(`${'='.repeat(72)}\n${p.code}  (${p.context.length} chars)\n${'='.repeat(72)}\n`);
    console.log(p.context);
    console.log('');
  }
  console.error(`✓ ${payloads.length} payload(s), anchors verified.`);
}

const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) await main();
