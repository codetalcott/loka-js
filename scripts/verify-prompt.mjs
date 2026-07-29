#!/usr/bin/env node
// Emit a verification prompt per locale, for pasting into a deep-research tool.
//
// Usage:
//   node scripts/verify-prompt.mjs --locale=de
//   node scripts/verify-prompt.mjs --all --out=research/verify
//
// Why this is not research-brief.mjs
// ----------------------------------
// The brief asks an open question: "what do developers call this?". This asks a
// closed one: "here is a claim, a verdict, and the sources it rests on — is it
// right?". Those need different prompts, and reusing the brief for verification
// gets you a second opinion formed the same way as the first, which is not
// independent evidence.
//
// The specific risk being designed against is agreement. A model handed a
// well-argued claim and asked "do you agree?" tends to agree, and a second pass
// that confirms everything has told us nothing. So the prompt: states the prior
// verdict as a claim to be attacked rather than a conclusion to be reviewed,
// names the exact sources so they can be checked rather than trusted, asks
// explicitly for a per-claim verdict including CONTRADICTED, and says outright
// that unanimous confirmation will be read as a failed review.
//
// It also carries the corrected placement constraints. The first wave ran with a
// brief that misstated them (it claimed multi-word terms cannot be attribute
// names), and at least one recommendation was shaped by that error.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { LOCALES } from './fx-vocab.mjs';
import { SETTLED, statusOf, basisOf } from './settled-terms.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FINDINGS_DIR = path.resolve(__dirname, '..', 'research', 'findings');

// Corrections already shipped as a result of wave 1. These carry higher stakes
// than the pending ones — they are live in the published vocabulary now — so the
// prompt calls them out separately and asks for them to be attacked first.
// Event-name corrections come from SETTLED; the rest are attrs, modifiers and
// globals, which SETTLED does not cover.
// Applied changes that SETTLED does not record, because they are not decisions
// about which of several spellings wins: they are additions and removals of
// alternates, and moxi/rexi tokens that live outside the attr/event namespaces.
// Everything that IS a "we ship X, demoting Y" decision — including every
// attribute name — now comes from SETTLED. This table used to carry those too,
// which meant hand-editing it after every round to keep it agreeing with
// settled-terms.mjs; that is precisely the drift settled-terms exists to end.
const APPLIED_EXTRA = {
  'zh:change': "reordered to '变化' primary, '改变' second",
  'ja:focus': "dropped the alternate '集中' (kept 'フォーカス')",
  'ja:init': "dropped the alternate 'イニット' (kept '初期化')",
  'es:once': "shipped the moxi modifier '.una-vez' as primary, demoting '.unavez'",
  'es:transition': "registered the global 'transición' alongside 'transicion'",
  'de:resize': "added 'grössenänderung' (ss) as an alias for Swiss keyboards",
  'ko:fx-method': "added 'fx-타깃' as a target alias",
  'zh:fx-action': "added 'fx-请求地址' alongside 'fx-地址'",
  'pt:fx-trigger': "added 'fx-acionador' and 'fx-disparador' as aliases of 'fx-gatilho'",
  'pt:fx-target': "added 'fx-destino' as an alias of 'fx-alvo'",
  'pt:fx-swap': "added 'fx-substituição' as an alias of 'fx-troca'",
};

// Vocabulary published for the first time in the wave-1 round: canonicals that
// had NO term in this locale before. One reviewer proposed each, and nothing has
// checked them since — so the prompt asks for them by name rather than letting
// them pass as settled.
const NEWLY_PUBLISHED = {
  ja: 'キーダウン (keydown), キーアップ (keyup), マウスダウン (mousedown), マウスアップ (mouseup), マウスオーバー (mouseover), マウスアウト (mouseout), サイズ変更 (resize), 読み込み (load)',
  de: 'taste gedrückt (keydown), taste losgelassen (keyup), maustaste gedrückt (mousedown), maustaste losgelassen (mouseup), geladen (load). mouseover and mouseout were deliberately left in English — challenge that too',
  pt: 'tecla pressionada (keydown), tecla solta (keyup), mouse sobre (mouseover), saída do mouse (mouseout), carregamento (load)',
  ko: '키다운 (keydown), 키업 (keyup), 마우스다운 (mousedown), 마우스업 (mouseup), 마우스오버 (mouseover), 마우스아웃 (mouseout). resize and load were left unpublished for lack of evidence — challenge that too',
  zh: '按键按下 (keydown), 按键松开 (keyup), 鼠标按下 (mousedown), 鼠标松开 (mouseup), 鼠标移入 (mouseover), 鼠标移出 (mouseout), 尺寸变化 (resize), 加载 (load), plus the zh-Hant aliases 滑鼠-, 捲動, 載入, 送出, 取得焦點, 失去焦點',
};

function parseArgs() {
  const args = { locale: null, all: false, out: null, help: false };
  for (const a of process.argv.slice(2)) {
    if (a === '--all') args.all = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a.startsWith('--locale=')) args.locale = a.slice('--locale='.length);
    else if (a.startsWith('--out=')) args.out = a.slice('--out='.length);
  }
  return args;
}

const cite = srcs => (srcs?.length ? srcs.join(' , ') : '*(no source was cited — treat as unsupported)*');

/** One claim, rendered so the source list is checkable rather than decorative. */
function claim(n, { label, was, verdict, proposed, why, sources, applied }) {
  const lines = [];
  const state = applied ? ` — **ALREADY SHIPPED**: ${applied}` : '';
  lines.push(`**${n}. ${label}**${state}`);
  if (was) lines.push(`- currently: \`${was}\``);
  if (verdict) lines.push(`- verdict reached: **${verdict}**${proposed ? ` → \`${proposed}\`` : ''}`);
  lines.push(`- reasoning given: ${why}`);
  lines.push(`- sources cited: ${cite(sources)}`);
  lines.push('');
  return lines;
}

/**
 * Render the adversarial verification prompt for one locale.
 *
 * Exported so queue-research.mjs can wrap it in the harvest anchors. A verify
 * prompt queued without them is filed in aimless mode — a searchable copy with
 * no synthesis — which you discover 6-30 hours later.
 */
export function build(code) {
  const spec = LOCALES[code];
  const f = JSON.parse(fs.readFileSync(path.join(FINDINGS_DIR, `${code}.json`), 'utf8'));
  const L = [];
  let n = 0;

  // A term can be touched by both a SETTLED correction and a later tweak (de
  // resize was concluded in an earlier round AND gained the Swiss alias in this
  // one), so report both rather than letting the first match win.
  const appliedFor = (canonical) => {
    const notes = [];
    const s = SETTLED[`${code}:${canonical}`];
    // Was `s.date === '2026-07-28'`, a literal standing in for "applied in the
    // round being verified" — which silently stops being true for every later
    // round. Status is the real question, and a pending record must NOT be
    // described as shipped: what ships is still the wrong form.
    if (s && statusOf(s) !== 'pending-upstream') {
      notes.push(
        s.concluded === null
          ? 'decided to publish NO term — authors write the English canonical'
          : `ships '${s.concluded}'` +
            (s.superseded.length
              ? `, demoting ${s.superseded.map(x => `'${x}'`).join(', ')}`
              : '')
      );
    }
    const extra = APPLIED_EXTRA[`${code}:${canonical}`];
    if (extra) notes.push(extra);
    return notes.length ? notes.join('; also ') : null;
  };

  /** Concluded but not shipping — the cheapest possible moment to be challenged. */
  const pendingFor = (canonical) => {
    const s = SETTLED[`${code}:${canonical}`];
    return s && statusOf(s) === 'pending-upstream' ? s : null;
  };

  // Show the hyphenation rule using a term from THIS language. A Spanish example
  // in a German prompt invites the model to reason about the wrong language.
  const hyphenExample = {
    de: 'on-taste-losgelassen', es: 'al-tecla-pulsada', pt: 'on-tecla-pressionada',
    ja: 'on-マウスダウン', ko: 'on-포커스아웃', zh: 'on-按键按下',
  }[code] ?? 'on-two-word-term';

  L.push(`# Verification review — ${spec.name} developer terminology`);
  L.push('');
  L.push('## What I need');
  L.push('');
  L.push(
    `A previous research pass produced the ${spec.name} terminology claims below. I need them ` +
    `**checked**, not repeated. For each numbered claim return one of:`
  );
  L.push('');
  L.push('- **CONFIRMED** — the cited sources support it and you found corroborating usage.');
  L.push('- **CONTRADICTED** — the sources do not say what is claimed, or real usage points elsewhere. Say what the term should be instead.');
  L.push('- **BETTER ALTERNATIVE** — the claim is not wrong but a different term is what developers actually write. Give it.');
  L.push('- **UNSUPPORTED** — you could not find evidence either way. This is a useful answer; do not upgrade it to CONFIRMED to be agreeable.');
  L.push('');
  L.push('Two things I specifically want you to do:');
  L.push('');
  L.push(
    '1. **Open the cited URLs and check they say what the reasoning claims.** Several of these ' +
    'claims rest on a single source, and at least one prior claim in this project turned out to ' +
    'cite a page that discussed a different concept entirely.'
  );
  L.push(
    '2. **Look for disconfirming evidence before confirming.** A review that confirms every claim ' +
    'is not a successful review, it is a failed one — the prior pass was fallible and I am paying ' +
    'for an independent check, not a second opinion formed the same way. If you genuinely confirm ' +
    'everything, say so explicitly and show what you searched that could have contradicted it.'
  );
  L.push('');

  L.push('## Context you need to judge these');
  L.push('');
  L.push(
    `These are **identifiers a developer types in HTML**, not prose. The library lets someone write ` +
    `hypermedia attributes in ${spec.name} instead of English — where an English author writes ` +
    `\`fx-trigger="click"\`, a ${spec.name} author writes the ${spec.name} token. The audience is ` +
    `**beginner developers**, so the test is whether a learner would recognise the term, not whether ` +
    `it is the most precise translation.`
  );
  L.push('');
  L.push('**Placement rules** (these were misstated in the earlier pass, so ignore any reasoning below that assumes otherwise):');
  L.push('');
  L.push(`- Multi-word terms are fine. As an attribute value (\`fx-trigger="…"\`) write them with spaces; as part of an attribute name write them hyphenated (\`${hyphenExample}\`) — lookup collapses spaces, hyphens and underscores before matching, so both resolve. **Do not compress a term into one word to avoid a space.** Every fused compound found in this vocabulary so far has been malformed.`);
  L.push('- Case is folded, so capitalization is never the issue.');
  L.push('- Accents and ß are **not** folded. If a term has a common alternative spelling, name it.');
  L.push('- Exception: `rexi` verbs and `paxi` swap names become JavaScript globals (`window.<term>`), so those must be single valid JS identifiers — no hyphens, no spaces.');
  L.push('');
  L.push('**Settled, do not re-argue:** whether to translate these identifiers at all (yes — that major references keep English identifiers is known and is not the question), and back-compatibility (old spellings are always retained as parse aliases, so recommending a change costs nothing).');
  L.push('');

  // ── Applied first: these are live, so a wrong one is already doing damage ──
  const isApplied = r => !!appliedFor(r.canonical);
  const allRows = [
    ...(f.attrs ?? []).map(r => ({ ...r, kind: 'attribute name' })),
    ...(f.events ?? []).map(r => ({ ...r, kind: 'event name' })),
    ...(f.familyTokens ?? []).map(r => ({ ...r, kind: `${r.library} token` })),
  ];
  const isPending = r => !!pendingFor(r.canonical);
  const applied = allRows.filter(r => isApplied(r) && !isPending(r));
  const pending = allRows.filter(isPending);
  const rest = r => !isApplied(r) && !isPending(r);
  const changes = allRows.filter(r => rest(r) && r.verdict === 'change');
  const keeps = allRows.filter(r => rest(r) && r.verdict === 'keep');

  if (applied.length) {
    L.push('## Part 1 — Already shipped (attack these first)');
    L.push('');
    L.push(
      'These changes are live in the published vocabulary. If one is wrong it is actively ' +
      'misleading learners right now, so they carry the highest stakes and deserve the most scrutiny.'
    );
    L.push('');
    for (const r of applied) {
      L.push(...claim(++n, {
        label: `\`${r.canonical}\` (${r.kind})`,
        was: r.shipped,
        verdict: r.verdict,
        proposed: r.proposed,
        why: r.reasoning,
        sources: r.sources,
        applied: appliedFor(r.canonical),
      }));
    }
  }

  if (pending.length) {
    L.push('## Part 1b — Concluded, not yet applied (challenge these before we act)');
    L.push('');
    L.push(
      'We have decided to change these but the edit has not landed, so what ships is still ' +
      'the old form. That makes this the cheapest possible moment to tell us we are wrong: ' +
      'nothing has been published, no learner has seen the new term, and reversing costs ' +
      'nothing. After it ships, reversing means another correction on top of a correction.'
    );
    L.push('');
    for (const r of pending) {
      const s = pendingFor(r.canonical);
      L.push(...claim(++n, {
        label: `\`${r.canonical}\` (${r.kind})`,
        was: r.shipped,
        verdict: r.verdict,
        proposed: r.proposed,
        why: r.reasoning,
        sources: r.sources,
        applied:
          `CONCLUDED but NOT shipping — we intend '${s.concluded}'` +
          (s.superseded.length ? `, replacing '${s.superseded[0]}'` : '') +
          `. Reason on record: ${s.why}`,
      }));
    }
  }

  if (changes.length) {
    L.push('## Part 2 — Proposed changes, not yet applied');
    L.push('');
    L.push('Each says the shipped term is wrong. Is it? And is the proposed replacement the right one?');
    L.push('');
    for (const r of changes) {
      L.push(...claim(++n, {
        label: `\`${r.canonical}\` (${r.kind})`,
        was: r.shipped,
        verdict: 'change',
        proposed: r.proposed,
        why: r.reasoning,
        sources: r.sources,
      }));
    }
  }

  if (keeps.length) {
    L.push('## Part 3 — Judged correct, left alone');
    L.push('');
    L.push(
      'A wrong "keep" is the easiest error to miss, because nothing draws attention to it. Skim ' +
      'these for anything that is a false friend, a calque, or a word whose dominant meaning in ' +
      `${spec.name} is something other than the concept described. Flag only what is wrong — you ` +
      'need not comment on each.'
    );
    L.push('');
    L.push(`| concept | term shipped | why it was kept |`);
    L.push('|---|---|---|');
    for (const r of keeps) {
      L.push(`| \`${r.canonical}\` (${r.kind}) | \`${r.shipped}\` | ${r.reasoning.replace(/\|/g, '\\|').slice(0, 240)} |`);
    }
    L.push('');
    n += keeps.length;
  }

  // ── Unpublished vocabulary: publish-or-not is still open ──
  const cands = f.candidates ?? [];
  const gaps = f.gaps ?? [];
  if (cands.length || gaps.length) {
    L.push('## Part 4 — Terms that were not published when the claims below were written');
    L.push('');
    L.push(
      'These concepts had **no term** in this locale, so an author had to write the English ' +
      `identifier. The question was whether a real ${spec.name} term exists to publish. Some ` +
      'candidates come from an upstream table documented as *aspirational* — forms proposed but ' +
      'never verified in use — and the prior pass judged several of them invented.'
    );
    L.push('');
    if (NEWLY_PUBLISHED[code]) {
      L.push(
        '**Several were published as a result of that review, and are now live:** ' +
        `${NEWLY_PUBLISHED[code]}.`
      );
      L.push('');
      L.push(
        'Those carry more risk than anything else in this prompt, not less. Every other term here ' +
        'has been in front of users long enough for someone to complain about it; these were ' +
        'proposed by one reviewer, applied within a day, and have been read by nobody since. ' +
        'Treat them as Part 1 — attack them first, and say plainly if one is not a real term.'
      );
      L.push('');
    }
    L.push('Confirm or contradict each judgement below, and propose a term where none is offered.');
    L.push('');
    for (const r of cands) {
      L.push(...claim(++n, {
        label: `\`${r.canonical}\` — upstream proposes \`${r.upstream}\``,
        verdict: r.verdict,
        proposed: r.proposed,
        why: r.reasoning,
        sources: r.sources,
      }));
    }
    for (const r of gaps) {
      L.push(...claim(++n, {
        label: `\`${r.canonical}\` — no term anywhere`,
        verdict: 'propose',
        proposed: r.proposed,
        why: r.reasoning,
        sources: r.sources,
      }));
    }
  }

  // ── Regional ──
  const vs = f.variantSplit;
  if (vs) {
    L.push('## Part 5 — Regional variation');
    L.push('');
    L.push(`The prior pass concluded a regional split is **${vs.warranted ? 'warranted' : 'NOT warranted'}**, reasoning:`);
    L.push('');
    L.push(`> ${vs.reasoning.replace(/\n/g, '\n> ')}`);
    L.push('');
    if (vs.divergentTerms?.length) {
      L.push('Divergent terms identified:');
      L.push('');
      for (const d of vs.divergentTerms) {
        const pair = Object.entries(d).filter(([k]) => !['canonical', 'sources'].includes(k));
        L.push(`- \`${d.canonical}\`: ${pair.map(([k, v]) => `${k} = \`${v}\``).join(' vs ')}`);
      }
      L.push('');
    }
    L.push(
      'Is that right? Specifically: is the list of divergent terms complete, and is anything on it ' +
      'actually the same word rather than a different one? I am **not** looking for pronunciation or ' +
      'style differences — only cases where a developer in one region would type a different token.'
    );
    L.push('');
  } else if (f.variantNote) {
    L.push('## Part 5 — Regional note');
    L.push('');
    L.push(`> ${f.variantNote.replace(/\n/g, '\n> ')}`);
    L.push('');
    L.push('Confirm or contradict, and add anything missed.');
    L.push('');
  }

  // ── Contested ──
  const contested = [
    ...(f.events ?? []),
    ...(f.attrs ?? []),
  ].filter(r => /disagree|DISAGREES/i.test(r.reasoning || ''));
  if (contested.length) {
    L.push('## Part 6 — Contested: the prior pass overturned an earlier decision');
    L.push('');
    L.push(
      'These terms were reviewed once before and concluded settled; this pass disagrees. I need a ' +
      'tiebreak, so weigh both readings explicitly rather than deferring to the more recent one.'
    );
    L.push('');
    for (const r of contested) {
      const prior = SETTLED[`${code}:${r.canonical}`];
      L.push(`**\`${r.canonical}\`**`);
      L.push(`- shipped now: \`${r.shipped}\`${prior ? ` (concluded ${prior.date}: ${prior.why})` : ''}`);
      L.push(`- this pass says: **change → \`${r.proposed}\`** — ${r.reasoning}`);
      L.push(`- sources: ${cite(r.sources)}`);
      L.push('');
    }
  }

  L.push('## Summary I need at the end');
  L.push('');
  L.push('1. A table: claim number → CONFIRMED / CONTRADICTED / BETTER ALTERNATIVE / UNSUPPORTED → the term you land on.');
  L.push('2. The claims you were **least** able to verify, and what evidence would settle them.');
  L.push('3. Anything wrong that I did not ask about — including whether any of these concepts is better left in English for this language.');
  L.push('');
  L.push('Cite sources per answer, in the target language wherever possible. Informal developer usage — tutorials, course material, forum threads, blog posts — outweighs formal specification translations, because the audience is people learning from exactly those sources.');

  return L.join('\n');
}

function main() {
  const args = parseArgs();
  if (args.help) {
    console.log(`Emit verification prompts from research/findings/*.json.

  --locale=<code>  one locale
  --all            every locale with a findings file
  --out=<dir>      write <dir>/<code>.md instead of stdout
  --help           this message`);
    return;
  }

  if (!fs.existsSync(FINDINGS_DIR)) {
    console.error(`No findings at ${path.relative(process.cwd(), FINDINGS_DIR)} — nothing to verify.`);
    process.exit(1);
  }

  const have = fs.readdirSync(FINDINGS_DIR).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, ''));
  if (!args.locale && !args.all) {
    console.log(`Findings available: ${have.join(', ')}`);
    console.log(`\nnode scripts/verify-prompt.mjs --locale=<code>`);
    return;
  }
  if (args.locale && !have.includes(args.locale)) {
    console.error(`No findings for '${args.locale}'. Have: ${have.join(', ')}`);
    process.exit(1);
  }

  const codes = args.all ? have : [args.locale];
  for (const code of codes) {
    const text = build(code);
    if (args.out) {
      fs.mkdirSync(args.out, { recursive: true });
      const file = path.join(args.out, `${code}.md`);
      fs.writeFileSync(file, text + '\n');
      console.log(`wrote ${path.relative(process.cwd(), file)} (${text.length} chars)`);
    } else {
      console.log(text);
    }
  }
}

// Only run when invoked directly — this module is imported by
// queue-research.mjs, which must not trigger a stdout dump.
const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) main();
