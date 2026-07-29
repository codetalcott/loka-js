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
import {
  SETTLED,
  describe as describeSettled,
  statusOf,
  basisOf,
} from './settled-terms.mjs';

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

// Terms already researched live in scripts/settled-terms.mjs, shared with
// test/vocab-ordering.mjs so a concluded decision is asserted against the
// generated data rather than only advertised here.

// What each fx-* attribute DOES. An attribute name is a term of art, not a
// dictionary word: `fx-swap` is not "exchange", it is the name of a DOM
// replacement strategy. Without the gloss a reviewer translates the English
// word instead of naming the concept, which is how you get a technically
// correct term no developer would recognise.
const ATTR_GLOSS = {
  'fx-action': 'the URL to request. Concept: the endpoint this element talks to.',
  'fx-method': 'the HTTP verb (GET/POST/…). Concept: the kind of request.',
  'fx-trigger': 'which DOM event fires the request. Concept: the cause, "when this happens".',
  'fx-target': 'which element receives the response. Concept: the destination in the page.',
  'fx-swap': 'how the response is placed (innerHTML/outerHTML/beforeend/…). Concept: the replacement strategy.',
  'mx-ignore': 'marks a subtree moxi should not process.',
  'fx-ignore': 'marks a subtree fixi should not process.',
  live: 'moxi: marks an element as reactively bound.',
  'on-': 'moxi: the prefix that turns an event name into a handler attribute (`on-click`).',
};

// Suspicions a human noticed that no heuristic catches.
//
// The automated checks in suspicions() find fused forms by comparing against the
// English shape ("keydown is two words, so a spaceless term is suspect"), which
// only works where English is itself two words. A term like `unavez` — a fused
// Spanish 'una vez' for a canonical English `once` — reads as an ordinary word
// to every regex we have. It took a human noticing.
//
// Unlike SETTLED these are OPEN questions, so they belong in the brief's
// priority section, not its "confirm only" list. Keyed `${code}:${localizedForm}`.
const NOTED = {
  'es:unavez': {
    canonical: 'once',
    why: "reads as a fusion of 'una vez'; Spanish writes that as two words. Same defect class as the corrected 'ratónabajo' and 'größeändern'.",
    // Without this the obvious answer is unusable, and we'd get it back as a
    // recommendation we then have to reject.
    constraint:
      'This one is a moxi **modifier**, written dotted onto the attribute name ' +
      '(`al-clic.unavez`), so it is parsed out of the name — a space is impossible ' +
      'here. `una vez` cannot be the answer. A hyphen is legal (`una-vez`), as is any ' +
      'single-token alternative. Which reads better to a Spanish developer?',
  },
  'qu:paqariy': {
    canonical: 'blur',
    why:
      "appears to mean 'to dawn' / 'to be born' / 'to originate' — an origination " +
      'sense, which is close to the opposite of an element LOSING focus. If that ' +
      'reading is right this is the same class of defect as ja ぼかし and ko 블러: ' +
      'a real word carrying entirely the wrong meaning.',
    constraint:
      'The whole Quechua event set also ends in -y, the infinitive marker, which ' +
      'collides with the noun rule stated above. Whatever replaces this should be a ' +
      'noun or participle, not another -y infinitive.',
  },
};

// Locales where coinage is permitted (see RESEARCH_PIPELINE.md, "Coinage track").
//
// Everywhere else the rule is absolute: no attested usage, no published term. It
// is relaxed only where that rule produces a worse outcome than a careful
// invention — a locale whose developers do NOT have an English-speaking fallback
// culture, and where searching has genuinely returned nothing. `ko` is the
// counter-example and stays out: Korean developers read English identifiers
// fluently, so ko resize/load are recorded as publish-nothing rather than opened
// for coinage.
//
// `notes` carries what the generic criteria cannot know — the specific trap in
// this language's existing data.
const COINAGE = {
  qu: {
    why:
      'Quechua has little to no web-development writing to search, so the ' +
      'evidence-first rule yields nothing publishable and a Quechua-speaking ' +
      'beginner gets an entirely English API. Coinage is better than that.',
    notes: [
      'Every event term currently shipping ends in `-y`, the infinitive marker ' +
        '(`ñitiy`, `qhaway`, `apakuy`). Under the noun rule above that is the whole ' +
        'set mis-formed. Quechua nominalizers (`-na`, `-sqa`, the agentive `-q`) are ' +
        'the obvious material — please say which construction reads best for an ' +
        'event that has just happened.',
      'The attribute names (`fx-action`, `fx-method`, `fx-trigger`, `fx-target`, ' +
        '`fx-swap`) have NO Quechua forms at all — the table is empty on purpose ' +
        'rather than by oversight. Proposing all five is in scope and valuable.',
      'Glottalized and aspirated spellings (`ñit’iy`, `p’unchaw`) are fine in ' +
        'attribute values, but a term used as a JavaScript global cannot contain an ' +
        'apostrophe. Flag any proposal where that would bite.',
    ],
  },
  sw: {
    why:
      'Swahili has attested terms for the common events but nothing for the ' +
      'keyboard and pointer set, and East African developer writing is thin enough ' +
      'that further searching is unlikely to turn any up.',
    notes: [
      'Unlike Quechua, the existing Swahili vocabulary is in reasonable shape — ' +
        'the task is filling gaps rather than repairing. Match the register of what ' +
        'is already there (`bofya`, `wasilisha`, `sogeza`).',
      'The profile has an identity placeholder for `blur` that publishes nothing, ' +
        'so Swahili currently has no term for it at all. `lenga` / `angazia` are the ' +
        'shipped `focus` pair; the blur term should read as its counterpart.',
    ],
  },
};

// Languages with more than one written standard that a developer might plausibly
// be writing for. Asked about explicitly, because the answer we expect is "no
// split needed" and a reviewer will not volunteer that unprompted.
const VARIANT_QUESTION = {
  pt: ['Brazil (pt-BR)', 'Portugal (pt-PT)'],
  es: ['Spain (es-ES)', 'Latin America (es-419)'],
  zh: ['Simplified / mainland (zh-Hans)', 'Traditional / Taiwan & Hong Kong (zh-Hant)'],
};

/**
 * The attribute-name section.
 *
 * Separate from the events section because the constraints genuinely differ: an
 * attribute NAME can never contain a space (an event name can, in an
 * `fx-trigger` value), and these five tokens are the most visible thing an
 * author types — they appear in every example, every tutorial, every page.
 *
 * They are also the surface the `reviewed` flag actually tracks, and it is true
 * for only four locales, so for twenty of them nothing here has been read by a
 * native speaker.
 */
function attrSection(code, spec) {
  const lines = [];
  const attrs = spec.fixi?.attrs ?? {};
  const canonicalAttrs = ['fx-action', 'fx-method', 'fx-trigger', 'fx-target', 'fx-swap'];

  // localized → canonical, inverted for display, primary-first per README.
  const byCanonical = {};
  for (const [loc, can] of Object.entries(attrs)) (byCanonical[can] ??= []).push(loc);

  lines.push('## Attribute names to assess');
  lines.push('');
  lines.push(
    `These are the attribute names themselves — the tokens an author types on every ` +
    `element. They carry a constraint the event names do not: **an HTML attribute name ` +
    `cannot contain a space**, so every term here must be a single token. Hyphens are ` +
    `fine (\`fx-…\` is already hyphenated); spaces are not.`
  );
  lines.push('');
  lines.push(
    'Each names a concept from hypermedia/AJAX, not an everyday word. Please answer for ' +
    'the concept as described, not for the English word: what would a developer writing ' +
    `a ${spec.name} tutorial about this call it?`
  );
  lines.push('');
  // An empty attrs table for a non-English locale is an unfilled stub, not a
  // set of identity decisions. Saying "deliberately unchanged" there would claim
  // a judgment nobody made, and invite the reviewer to confirm it.
  const isStub = code !== 'en' && Object.keys(attrs).length === 0;

  if (isStub) {
    lines.push(
      `**Nothing is translated yet.** loka ships no ${spec.name} attribute names at all — ` +
      'this is an unfilled stub, not a decision that English reads fine here. Every row ' +
      'below is an open question, and proposing a first term is the whole task.'
    );
    lines.push('');
  }

  lines.push('| attribute | what it does | term we ship | also accepted |');
  lines.push('|---|---|---|---|');
  for (const can of canonicalAttrs) {
    const forms = byCanonical[can] ?? [];
    // Identity omission is a documented convention, not a coverage gap — say so
    // inline, or a reviewer reads the blank as "unsupported" and proposes a term
    // for something we deliberately left in English.
    const untranslated = isStub ? '*nothing yet*' : `\`${can}\` — *deliberately unchanged*`;
    const ship = forms.length ? `\`${forms[0]}\`` : untranslated;
    const alts = forms.length > 1 ? forms.slice(1).map(f => `\`${f}\``).join(', ') : '—';
    lines.push(`| \`${can}\` | ${ATTR_GLOSS[can]} | ${ship} | ${alts} |`);
  }
  lines.push('');
  if (!isStub && canonicalAttrs.some(can => !byCanonical[can])) {
    lines.push(
      '*deliberately unchanged* means we judged the English token to be what a ' +
      `${spec.name} developer would already write, so we publish no translation. That is a ` +
      'real answer, not a gap — but if it is wrong, say so.'
    );
    lines.push('');
  }

  // Other libraries in the family. Only Spanish has these today; rendering them
  // conditionally keeps the other briefs from carrying an empty section.
  const extras = [
    ['moxi attributes', spec.moxi?.attrs],
    ['moxi modifiers (written `.prevenir`-style after an event)', spec.moxi?.modifiers],
    ['paxi swap strategies (values of `fx-swap`)', spec.paxi?.swaps],
    ['rexi global verbs', spec.rexi?.globals],
    ['ssexi server-sent event names', spec.ssexi?.events],
  ].filter(([, table]) => table && Object.keys(table).length);

  if (extras.length) {
    lines.push('### Other fixi-family tokens');
    lines.push('');
    lines.push(
      `${spec.name} is the only locale that localizes the rest of the family, so these ` +
      'have had even less scrutiny than the fx-* names above. Same question for each.'
    );
    lines.push('');
    for (const [label, table] of extras) {
      lines.push(`**${label}**`);
      lines.push('');
      for (const [loc, can] of Object.entries(table)) {
        const gloss = ATTR_GLOSS[can] ? ` — ${ATTR_GLOSS[can]}` : '';
        const flag = NOTED[`${code}:${loc}`] ? ' ⚠ **see below**' : '';
        lines.push(`- \`${can}\` → \`${loc}\`${gloss}${flag}`);
      }
      lines.push('');
    }

    lines.push(
      'These have had the least scrutiny of anything loka publishes, and the fused-compound ' +
      'defect that turned up repeatedly in the event names has not been checked for here at ' +
      'all — the automated check compares against the English word shape, which catches ' +
      'nothing when the English is a single word. Please read each one as "is this how the ' +
      'phrase is actually written?", not just "is this the right word?".'
    );
    lines.push('');
  }

  // Human-noticed suspicions for this locale, in their own section so they are
  // not buried in a list of thirty tokens.
  const noted = Object.entries(NOTED)
    .filter(([key]) => key.startsWith(`${code}:`))
    .map(([key, rec]) => [key.slice(code.length + 1), rec]);

  if (noted.length) {
    lines.push('### Specific terms we already suspect');
    lines.push('');
    lines.push(
      'Noticed by inspection rather than by the automated checks, so these are open ' +
      'questions with no prior conclusion — please treat them as the highest-value items ' +
      'in this brief:'
    );
    lines.push('');
    for (const [form, rec] of noted) {
      lines.push(`- **\`${form}\`** (for \`${rec.canonical}\`) — ${rec.why}`);
      if (rec.constraint) lines.push(`  - ${rec.constraint}`);
    }
    lines.push('');
  }

  const variants = VARIANT_QUESTION[code];
  if (variants) {
    lines.push('### Regional variation');
    lines.push('');
    lines.push(
      `${spec.name} has more than one written standard. loka publishes one vocabulary per ` +
      `language today, so if ${variants.join(' and ')} genuinely diverge we would need to ` +
      'know before deciding whether to split.'
    );
    lines.push('');
    lines.push(
      'Please answer narrowly: **which specific terms, if any, would a developer in ' +
      `${variants[0].replace(/\s*\(.*\)/, '')} and one in ` +
      `${variants[1].replace(/\s*\(.*\)/, '')} write differently?** Not pronounce ` +
      'differently, not prefer stylistically — write as a different token.'
    );
    lines.push('');
    lines.push(
      'If the same tokens are used throughout, say so explicitly. That is the outcome we ' +
      'expect and it saves us shipping a split that would fragment the vocabulary for no ' +
      'gain. A split is expensive: it doubles the terms a learner might encounter and ' +
      'requires runtime work loka has not done.'
    );
    lines.push('');
  }

  return lines;
}

function parseArgs() {
  const args = { locale: null, json: false, all: false, help: false, out: null, mode: 'review' };
  for (const a of process.argv.slice(2)) {
    if (a === '--json') args.json = true;
    else if (a === '--all') args.all = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a.startsWith('--locale=')) args.locale = a.slice('--locale='.length);
    else if (a.startsWith('--out=')) args.out = a.slice('--out='.length);
    else if (a.startsWith('--mode=')) args.mode = a.slice('--mode='.length);
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

/**
 * What the first research wave concluded, stated as rules rather than questions.
 *
 * Both findings were reached independently by four of the six wave-1 reviews. A
 * brief that omits them spends a reviewer's effort re-deriving them, and — worse
 * — invites a recommendation that contradicts vocabulary already shipped in five
 * other locales, which we then have to reject and explain.
 *
 * The blur warning earns its place by hit rate: the visual-blur noun is the
 * single most common defect this project has found, wrong in four of the six
 * locales looked at so far. It is stated as a thing to check rather than a term
 * to avoid, because in a language where the visual sense genuinely does not
 * dominate, the obvious nominalization is fine and we want to hear that.
 */
function crossLocaleFindings(spec) {
  return [
    '## Three things already settled across locales — please apply, not re-derive',
    '',
    '**1. An event name is a noun or a past participle, never a bare infinitive.**',
    'Four independent reviews of other languages reached this separately. An',
    'infinitive reads as an instruction to the browser — German `fokussieren` says',
    '"focus this!" — while an event names something that already happened, and it',
    'collides with the method of the same name (`element.focus()`). German, Spanish',
    'and Portuguese all shipped infinitives and were corrected to nouns',
    '(`fokussieren`→`Fokus`, `enfocar`→`enfoque`, `rolar`→`rolagem`).',
    '',
    `So: if a term below is an infinitive in ${spec.name}, that alone is reason to`,
    'propose the noun or participle — you do not need to find a source preferring it.',
    `If ${spec.name} verbs do not inflect this way, or the distinction does not exist,`,
    'please say so; several languages are unaffected and that is a useful answer.',
    '',
    '**2. Check `blur` specifically, against the visual sense.**',
    'The obvious word for "blur" in most languages is the image/optics one — camera',
    'blur, Gaussian blur, the CSS `filter: blur()` effect. That is not this event,',
    'which fires when an element loses keyboard focus. We shipped the wrong sense in',
    'four languages before catching it (Japanese ぼかし, Korean 블러, Portuguese',
    '`desfoque`, German `defokussieren`), and in each case the fix was a "loss of',
    'focus" construction instead.',
    '',
    `Please check what a ${spec.name} developer would understand from the term below,`,
    'and whether the language has a focus-loss phrasing that is unambiguous. If the',
    'visual sense genuinely is not dominant in your language, say that — the',
    'nominalization is then fine and we would rather know.',
    '',
    '**3. If the language inflects for case, we want the citation form.**',
    'This vocabulary was originally written for a different system, where the terms',
    'appeared inside a phrase meaning "on <event>" — so some locales carry the form',
    'that phrase requires rather than the form a word has on its own. Russian, for',
    'instance, ships `изменении` (prepositional, from `при изменении` "on change")',
    'where a standalone identifier wants the nominative `изменение`.',
    '',
    'An author here types the term by itself, in an attribute, with no preposition',
    `and no sentence around it. If any term below is in an oblique case in ${spec.name},`,
    'or otherwise only makes sense as part of a phrase, say so and give the form a',
    'dictionary would list. If the language does not inflect this way, skip this.',
    '',
  ];
}

/**
 * The coinage brief's extra section. Only rendered for `--mode=coinage`.
 *
 * This inverts the pipeline's central rule, so it is written to invert it as
 * narrowly as possible: phase 1 is still an ordinary evidence search, and design
 * is authorised ONLY where that search comes back empty. A reviewer who reads
 * this as "invent freely" will hand back inventions for concepts that already
 * have words, which is worse than the gap.
 *
 * The criteria are the wave-1 defects turned into design constraints. Every one
 * of them is a mistake this project has already shipped and had to correct.
 */
function coinageCriteria(spec, entry) {
  const L = [
    '## Where you find nothing: design a term',
    '',
    `This locale is one of the few where invention is permitted. ${entry.why}`,
    '',
    '**This does not relax the evidence rule — it applies after it.** For every term,',
    'search first, exactly as you would normally. Report what you find. Only where the',
    'search genuinely comes back empty should you propose something new, and say',
    'plainly that you are doing so. A real term, however clumsy, always beats a',
    'designed one; if we later find attested usage, the coined term is demoted.',
    '',
    '### What a good coined term looks like',
    '',
    '- **Build from the language, not from English.** A metaphor a speaker would',
    '  recognise beats a transliteration of the English word. Onomatopoeia is welcome',
    '  where the language uses it productively — these are names for physical',
    '  actions, and a word that sounds like the action is easier to learn than one',
    '  that transliterates a foreign one.',
    '- **Coin in pairs, sharing a stem.** `keydown`/`keyup`, `mousedown`/`mouseup`,',
    '  `mouseover`/`mouseout` are opposites and must read as opposites. A learner who',
    '  meets one will guess the other; if the guess fails, the pair is wrong. (We hit',
    '  this in Korean: publishing 마우스오버 made 마우스아웃 mandatory whether or not',
    '  it was independently well attested.)',
    '- **Check the dominant sense first.** The coined word will be read cold by a',
    `  beginner with no English. If it already means something common in ${spec.name},`,
    '  that meaning wins and the term is unusable. This is the single most common',
    '  defect found in this project: four languages shipped the *visual* blur word',
    '  for the focus-loss event.',
    '- **Noun or participle, citation form.** Same two rules as above — an event',
    '  names something that happened, not a command, and it appears with no',
    '  preposition or sentence around it.',
    '- **Transparency test.** Would a beginner who has never seen the library guess',
    '  roughly what it does? If it needs the English word to explain it, it has not',
    '  earned its place over the English word.',
    '',
    '### Mechanical constraints on a coined term',
    '',
    '- Spaces are fine in an `fx-trigger` **value**; in an attribute **name** write',
    '  the same term hyphenated (`on-…`). Both resolve — lookup collapses spaces,',
    '  hyphens and underscores. So do not fuse words to avoid a space.',
    '- Terms that become JavaScript globals (the `rexi` verbs, the `paxi` swap name)',
    '  must be a single valid identifier: **no spaces, no hyphens, no apostrophes**.',
    '  Say so if your best proposal would be illegal there.',
    '- Case folds; accents and apostrophes do **not**. Any term carrying a diacritic',
    '  needs a plain-ASCII twin, so give both spellings.',
    '',
  ];
  if (entry.notes?.length) {
    L.push(`### Specific to ${spec.name}`, '');
    for (const n of entry.notes) L.push(`- ${n}`);
    L.push('');
  }
  L.push(
    '### For each term you coin, give us',
    '',
    '1. the term, and its literal meaning word-by-word;',
    '2. its pair partner, where it has one;',
    '3. what you searched before deciding nothing existed;',
    '4. your honest read on whether a beginner would guess it unseen.',
    ''
  );
  return L;
}

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

async function buildBrief(code, mode = 'review') {
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

  const attrCount = new Set(Object.values(spec.fixi?.attrs ?? {})).size;
  const topic =
    `Terminology review: what do ${spec.name}-speaking web developers actually call the ` +
    `DOM browser events (click, keyup, scroll, resize, mousedown, …) and the core ` +
    `hypermedia attribute concepts (request URL, HTTP method, triggering event, target ` +
    `element, swap strategy) when writing or teaching in ${spec.name}? Assess the ` +
    `${attrCount} attribute terms and ${rows.filter(r => r.primary).length} event terms ` +
    `listed in the context and say, for each, whether it is what a native developer would ` +
    `write — and if not, what they would.` +
    (VARIANT_QUESTION[code]
      ? ` Also determine whether ${VARIANT_QUESTION[code].join(' and ')} diverge on any ` +
        `specific term, or use the same vocabulary throughout.`
      : '');

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
  lines.push('Where these terms may appear:');
  lines.push('');
  lines.push('1. As an attribute **value** (`fx-trigger="…"`), written however you like —');
  lines.push('   `"tecla pressionada"` is fine.');
  lines.push('2. As part of an attribute **name** (`on-…`), written with a hyphen or');
  lines.push('   underscore instead of the space — `on-tecla-pressionada`. HTML attribute');
  lines.push('   names cannot contain literal spaces, but lookup collapses runs of');
  lines.push('   space/hyphen/underscore to one space before matching, so the hyphenated');
  lines.push('   spelling resolves to the same term. (Verified against the runtime, not');
  lines.push('   assumed.)');
  lines.push('');
  lines.push('**So do not distort a term to make it one word.** A two-word term that is what');
  lines.push('people actually say beats a fused compound invented to avoid the space — every');
  lines.push('fused form we have checked so far turned out to be malformed. Prefer a single');
  lines.push('token only when the language genuinely offers one.');
  lines.push('');
  lines.push('Case is folded too, so capitalization is never the question. Note that letters');
  lines.push('are otherwise matched exactly: German ß does **not** fold to ss, so if a term');
  lines.push('has a widely-used alternative spelling, name it and we will register both.');
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
  lines.push(...crossLocaleFindings(spec));
  // After the shared rules, because the coinage criteria build on them: a coined
  // term has to satisfy the noun rule and the false-friend check too.
  if (mode === 'coinage') lines.push(...coinageCriteria(spec, COINAGE[code]));

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

  lines.push(...attrSection(code, spec));

  lines.push('## Event names to assess');
  lines.push('');
  lines.push('| DOM event | term we ship | also accepted | source |');
  lines.push('|---|---|---|---|');
  for (const r of rows) {
    if (!r.primary) continue;
    const alts = r.alts.length ? r.alts.map(a => `\`${a}\``).join(', ') : '—';
    // A pending term must NOT read as endorsed: what ships is the form we have
    // already concluded is wrong, and a reviewer told "already reviewed" would
    // confirm it back to us.
    const pending = r.settled && statusOf(r.settled) === 'pending-upstream';
    const flag = pending
      ? ` ⚠ **known wrong** — replaced by \`${r.settled.concluded}\`, not yet applied`
      : r.settled
        ? ' ✓ already reviewed'
        : r.flags.length
          ? ' ⚠'
          : '';
    lines.push(`| \`${r.canonical}\` | \`${r.primary}\`${flag} | ${alts} | ${r.source} |`);
  }
  lines.push('');

  const settled = rows.filter(r => r.settled);
  if (settled.length) {
    lines.push('Already researched — mostly confirm only, do not re-derive:');
    lines.push('');
    for (const r of settled) {
      lines.push(`- \`${r.canonical}\`: ${describeSettled(r.settled)}`);
      const basis = basisOf(r.settled);
      if (basis === 'coined') {
        // The inverse of "confirm only". A coinage is a term we invented because
        // nothing existed; the most useful thing a reviewer can do is break it.
        lines.push(
          `  - **coined ${r.settled.date}, not attested.** Please try to falsify it: ` +
          `search for any real term for this concept. If you find one, it wins ` +
          `automatically — a term people already use always beats one we designed.`
        );
      } else if (basis === 'structural') {
        lines.push(
          `  - decided ${r.settled.date} on structural grounds, with no cited ` +
          `source. If your reading disagrees, say so — this is not settled by evidence.`
        );
      }
      if (statusOf(r.settled) === 'pending-upstream') {
        lines.push(
          `  - **not yet shipping.** The table above shows the OLD form because the ` +
          `correction lands in a repo we cannot edit yet. Judge the concluded term, ` +
          `not the shipped one.`
        );
      }
      if (r.settled.variantNote) {
        lines.push(`  - regional caveat on record: ${r.settled.variantNote}`);
      }
    }
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
  lines.push('of reasoning, and the sources.');
  lines.push('');
  lines.push('Answering "no evidence found" for a term we already ship is a useful result, not a');
  lines.push('failure to complete the task — it tells us the term was invented. Please do not');
  lines.push('upgrade it to a confirmation to be agreeable, and if you end up confirming');
  lines.push('everything, say so explicitly and show what you searched that could have');
  lines.push('contradicted it.');

  return { code, topic, context: lines.join('\n'), priorityCount: priority.length };
}

async function main() {
  const args = parseArgs();
  if (args.help) {
    console.log(`Emit terminology-research briefs.

  --locale=<code>  brief for one locale
  --all            every locale
  --mode=<m>       review (default) | coinage — coinage adds a "design a term
                   where you find nothing" section, and is only permitted for
                   ${Object.keys(COINAGE).join(', ')}
  --json           emit {topic, context} instead of markdown
  --out=<dir>      write <dir>/<code>.md (or .json) instead of stdout
  --help           this message`);
    return;
  }

  if (args.mode !== 'review' && args.mode !== 'coinage') {
    console.error(`Unknown mode: ${args.mode}. Use 'review' or 'coinage'.`);
    process.exit(1);
  }

  if (!args.locale && !args.all) {
    // Default: an index of what most needs review.
    const rows = [];
    for (const code of Object.keys(LOCALES)) {
      if (code === 'en') continue;
      const b = await buildBrief(code);
      // Pending decisions are the thing to check before queueing a new wave: a
      // locale with pending records is one whose brief describes vocabulary
      // that is already known to be changing.
      const pending = Object.entries(SETTLED).filter(
        ([k, r]) => k.startsWith(`${code}:`) && statusOf(r) === 'pending-upstream'
      ).length;
      rows.push([
        code,
        LOCALES[code].name,
        LOCALES[code].reviewed ? 'attrs reviewed' : '',
        b.priorityCount,
        pending,
        COINAGE[code] ? 'coinage' : '',
      ]);
    }
    rows.sort((a, b) => b[4] - a[4] || b[3] - a[3]);
    console.log('locale  language        attrs           suspect  pending  mode');
    console.log('-'.repeat(66));
    for (const [code, name, rev, n, pending, mode] of rows) {
      console.log(
        code.padEnd(8) +
          name.padEnd(16) +
          rev.padEnd(16) +
          String(n || '').padEnd(9) +
          String(pending || '').padEnd(9) +
          mode
      );
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

  // Coinage is opt-in per locale, and the gate is deliberate rather than
  // advisory: authorising invention for a language that has attested vocabulary
  // is how you get invented terms competing with real ones.
  const notEligible = args.mode === 'coinage' && codes.filter(c => !COINAGE[c]);
  if (notEligible && notEligible.length) {
    console.error(`Coinage is not enabled for: ${notEligible.join(', ')}`);
    console.error(`Enabled: ${Object.keys(COINAGE).join(', ')}`);
    console.error('Add an entry to COINAGE in scripts/research-brief.mjs to enable one,');
    console.error('but read RESEARCH_PIPELINE.md "Coinage track" first — the bar is high.');
    process.exit(1);
  }

  const briefs = [];
  for (const c of codes) briefs.push(await buildBrief(c, args.mode));

  // --out writes one file per locale, so a brief can be handed to a research
  // agent or a reviewer without a checkout. Stdout stays the default.
  if (args.out) {
    fs.mkdirSync(args.out, { recursive: true });
    for (const b of briefs) {
      const ext = args.json ? 'json' : 'md';
      const file = path.join(args.out, `${b.code}.${ext}`);
      fs.writeFileSync(file, args.json ? JSON.stringify(b, null, 2) + '\n' : b.context + '\n');
      console.log(`wrote ${path.relative(process.cwd(), file)}`);
    }
    return;
  }

  if (args.json) {
    console.log(JSON.stringify(args.all ? briefs : briefs[0], null, 2));
  } else {
    console.log(briefs.map(b => b.context).join('\n\n---\n\n'));
  }
}

// Only run when invoked directly, so scripts/queue-research.mjs can import
// buildBrief rather than shelling out and re-parsing stdout.
const invokedDirectly =
  process.argv[1] &&
  fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
if (invokedDirectly) await main();

export { buildBrief };
