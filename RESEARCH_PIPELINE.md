# The terminology-research pipeline

How a term gets from "nobody has ever checked this" to "shipped and tested."

Most of loka's published vocabulary was never read by a native speaker before mid-2026. It came from `@lokascript/semantic` profiles that are themselves best-effort and machine-assisted for most languages. This pipeline exists to fix that a wave at a time, and — more importantly — to make sure a correction that costs 6–30 hours of external research can never be silently lost, contradicted, or applied to only half the places that need it.

[CLAUDE.md](./CLAUDE.md) holds the rules that constrain *code* edits (the data conventions, the three cross-locale terminology rules). This file holds the *process*.

## Lifecycle

```
   brief  ─────────►  payload  ─────────►  queue (MCP)  ─────────►  report lands
 (open question)     (anchored)            6-30h later              (prose)
                                                                        │
                                                                        ▼
   settled record ◄── apply or pend ◄── decide ◄── verification ◄──  distill
   + npm run gen                                    report          findings/<code>.json
        │                                              ▲             (distill.mjs
        ▼                                              │              --check)
     npm test                                          └── verify prompt ┘
                                                          (closed question)
```

Two research passes, deliberately. The brief asks an open question ("what do developers call this?"); the verify prompt asks a closed one ("here is a claim and its sources — attack it"). Reusing the brief for the second pass gets a second opinion formed the same way as the first, which is not independent evidence.

## Ownership: where vocabulary lives

Three homes, and picking the wrong one is the most expensive mistake available here.

| What | Lives in | Editable by us |
|---|---|---|
| Event names a profile publishes | `../hyperfixi/packages/semantic/src/generators/profiles/<profile>.ts` | Only when we own that checkout |
| Event names a profile does **not** publish | `scripts/fx-vocab.mjs` → `fixi.events` | Always |
| Attribute names (`fx-*`) | `scripts/fx-vocab.mjs` → `fixi.attrs` | Always |
| moxi / paxi / rexi / ssexi tokens | `scripts/fx-vocab.mjs` → per-library sub-objects | Always |
| Generated output | `locales/*.js`, `dom-vocab/*.js` | Never by hand — `npm run gen` |

**The shadow rule.** `fixi.events` is for vocabulary genuinely *absent* from a profile. Using it to override a term the profile already publishes creates two disagreeing vocabularies, and the loka-side one wins silently — that is how `pulsacion` shipped for a year while semantic parsed `tecla abajo`. `gen-locales.mjs` now warns on this mechanically.

"Absent" has a precise meaning, because the coinage track depends on it: **a profile is absent for a canonical when it publishes no non-identity form.** An entry like Swahili's `blur: { primary: 'blur' }` is an identity placeholder that `stripIdentity` drops, so it publishes nothing, and supplying a Swahili `blur` term from `fx-vocab.mjs` fills a gap rather than shadowing a decision.

## Stages

### 1. Brief

```bash
npm run brief                             # index: what most needs review
npm run brief -- --locale=de              # markdown brief
npm run brief -- --locale=qu --mode=coinage
npm run brief -- --locale=de --out=research/briefs
```

Emits a self-contained brief so review can happen in a session with no checkout. It carries what a reviewer cannot infer: that the term is an identifier a developer types rather than prose, the placement constraints, that case and separators fold but accents do not, and the three cross-locale rules from earlier waves (see CLAUDE.md, "Event names are nouns, not infinitives").

**Done when** the brief names every term you want an answer about, and no term it presents as settled is actually still moving.

### 2. Payload

```bash
npm run queue-research -- --locale=pt     # print and verify one
npm run queue-research -- --wave          # the current wave
npm run queue-research -- --wave=3        # a specific wave
```

Wraps the brief for the `gemini-deep-research` MCP queue. Prints only — queuing is a separate deliberate step, because the round trip is long enough that eyeballing the payload first is worth it.

The harvest side parses the context with literal `PROJECT:` and `AIMS (decide these):` anchors. Miss one and the report is filed with no synthesis at all, which you learn 6–30 hours later; `assertAnchors` fails the payload locally instead. Aims are phrased as decisions, not questions, because the harvest restates them verbatim and answers a "should we…?" with a summary rather than a verdict.

### 3. Distill

```bash
node scripts/distill.mjs --locale=tr --report=<path/to/report.md>   # prompt
node scripts/distill.mjs --locale=tr --skeleton                     # empty rows
node scripts/distill.mjs --locale=tr --check=research/findings/tr.json
```

A report lands as prose. The judgement in converting it to `research/findings/<code>.json` is still human — that is why `research/findings/` is committed while the rest of `research/` is ignored — but the *shape* is no longer hand-kept.

**Why the structure is imposed here and not asked for upstream.** Two French runs in July 2026 settled this. Asked an open question, Deep Research returned genuinely useful sourced evidence in continuous prose, on a term set of its own choosing. Asked for "a verdict on each of 21 terms" with a row count and an output template, it returned a well-formed 23-row table in which 16 rows were terms nobody asked about — `CSS`, `API`, `Daemon`, `Cache` — including a row assessing the word *verdict*, lifted from the instruction. It is retrieval-first: a long context is a topic to search from, not a work list to iterate over, so a countable output constraint gets satisfied by fabrication. Do not put a required row count back into the brief.

`distill.mjs` builds its row set from `buildBrief`'s `inventory`, so the terms come from our data and cannot be invented, dropped or renamed. `--check` is the part that carries the guarantee, and it is the gate before anything reaches `settled-terms.mjs`:

| Mistake | `--check` says |
|---|---|
| A term the report discussed but we never asked about | `` `API` is not a term we asked about `` |
| A listed term silently omitted | `` missing `input` `` |
| `keep`/`change` asserted with no evidence | asserts usage but cites no sources |
| `change` with no replacement named | needs a `proposed` form |
| `"code.mu (cite 16)"` in `sources` | is not a URL — resolve it against the citation map |

That last one matters more than it looks: Gemini cites inline as `[cite: 7]` and lists sources once at the end. The prompt renders the resolved map so rows carry followable URLs, because the verify prompt's whole premise is that the next reviewer *checks* the sources rather than trusting them.

An unaddressed term is `reject` with reasoning "not addressed by the report" — never an omission. `reject` on a shipped term means "publish nothing", which becomes `concluded: null`: the difference between *we looked and found nothing* and *nobody has looked*.

Checklist for the judgement `--check` cannot make:

- Read the report **against the brief**, not on its own. A report that answers a question you did not ask is a report that drifted.
- One row per claim, including confirmations. A "keep" that nothing recorded is a decision that will be re-litigated next wave.
- Preserve the reviewer's sources per row. The verify prompt cites them so the next pass can check them rather than trust them.
- Note in `overall` whether the review confirmed everything. That is a signal about the review, not the vocabulary — the wave-1 Spanish review confirmed 17 of 19 claims without ever showing a disconfirming search.

Schema, as `verify-prompt.mjs` reads it:

```jsonc
{
  "code": "de",
  "attrs":         [ /* rows */ ],   // fx-* attribute names
  "events":        [ /* rows */ ],   // DOM event names
  "candidates":    [ /* rows */ ],   // exist upstream, unpublished — use `upstream` not `shipped`
  "gaps":          [ /* rows */ ],   // no term anywhere
  "familyTokens":  [ /* rows */ ],   // moxi/paxi/rexi/ssexi — rows also carry `library`
  "variantSplit":  { "warranted": false, "reasoning": "…" },
  "overall":       "…"
}
```

Row shape: `{ canonical, shipped | upstream, verdict, proposed, reasoning, sources[] }`. Verdicts in use: `keep`, `change`, `reject`, `publish`, `publish-corrected`, `propose`.

### 4. Verify

```bash
node scripts/verify-prompt.mjs --locale=de
node scripts/verify-prompt.mjs --all --out=research/verify-prompts
```

Renders findings into an adversarial prompt. It states the prior verdict as a claim to attack rather than a conclusion to review, names the exact sources, asks for a per-claim verdict including CONTRADICTED, and says outright that unanimous confirmation reads as a failed review.

Regenerate this after applying anything. The findings JSON is frozen at the pre-application state, so a stale prompt tells a reviewer "currently: ぼかし" about a term that now ships フォーカス解除. Archive the prompts you have already used (`research/verify-prompts/processed/`) so provenance survives.

### 5. Apply

Decision tree:

| The correction is to… | Do this |
|---|---|
| An event primary the profile publishes | Edit the profile → `npm run gen`. **If the upstream checkout is unavailable, record it `pending-upstream` instead** |
| An event canonical the profile does not publish | Add to `fixi.events` in `fx-vocab.mjs` → `npm run gen` |
| An attribute name | Add/reorder in `fixi.attrs` → `npm run gen` |
| A moxi/paxi/rexi/ssexi token | Edit the per-library sub-object → `npm run gen` |
| Nothing — no term survived review | Record `concluded: null`; publish nothing |

Then add the record to `scripts/settled-terms.mjs` and run `npm test`.

Ordering is load-bearing when demoting a spelling: put the new primary **first**, keep the old one after it. For attributes this is not a courtesy — `fx.name` resolves per element by scanning the registered spellings, and a demoted attribute that is not registered stops resolving, so fixi falls back to its default and an `innerHTML` swap becomes `outerHTML`, deleting the target.

## Settled records

`scripts/settled-terms.mjs` is the single record of "we already looked at this." Two consumers read it: the brief (to mark a term confirm-only) and `test/vocab-ordering.mjs` (to assert the concluded form shipped). They were once two hand-kept copies and had already drifted.

Keys are `code:canonical`, where canonical is a DOM event (`es:mousedown`) or an attribute (`de:fx-swap`).

| Field | Meaning |
|---|---|
| `concluded` | The form we ship and teach. `null` = publish nothing; authors write the English canonical |
| `superseded[]` | Spellings this decision demoted, retained so old pages keep parsing. For `pending-upstream`, `superseded[0]` is the currently-shipping wrong primary |
| `status` | `applied` (default) or `pending-upstream` |
| `basis` | `attested` \| `structural` \| `coined`. Defaults to attested/structural by `sources.length`; **`coined` must be explicit** |
| `why`, `date`, `sources[]`, `variantNote` | Provenance |

A `null` conclusion is the difference between "we looked and found nothing" and "nobody has looked yet." Those are identical in the vocabulary data and opposite in meaning.

## Freeze protocol

When the hyperfixi checkout is owned by another session, event-primary corrections cannot be applied. Do **not** route around it by adding a `fixi.events` override — that is the shadow rule, and it is how `pulsacion` happened.

Instead: record the decision with `status: 'pending-upstream'` and `superseded[0]` set to the form still shipping.

The test then asserts the *pending state* rather than skipping:

- the concluded form must **not** be primary — if it is, upstream applied it and the record should flip to `applied`;
- `superseded[0]` must still be primary — if some third form appears, upstream moved differently and the decision's premise is void.

So the freeze lifting is self-reporting. `node scripts/settled-terms.mjs` lists what is outstanding.

### Freeze-lift runbook

1. `npm run gen` — pull in whatever upstream changed.
2. `npm run test:drift` — confirm committed output matches the current checkout.
3. `npm run test:vocab` — failures now name every record to promote or re-look.
4. Flip promoted records to `status: 'applied'` (or delete `status`).
5. Apply the still-pending profile edits upstream, regen, flip those too.
6. Escalate the `gen-locales.mjs` shadow guard from warn to throw (`TODO(freeze-lift)`).
7. Commit as one change, so the record and the data move together.

## Coinage track

The pipeline's default rule is absolute: no attested usage, no published term. That rule produces the wrong answer in a small number of locales — ones with little or no web-development writing to search, whose speakers are also least able to fall back on an English API. There, evidence-first yields an entirely English experience for exactly the audience loka exists for.

For those locales only, invention is permitted.

**Eligibility** is opt-in per locale via the `COINAGE` table in `scripts/research-brief.mjs`. Currently `qu` and `sw`. Korean is the deliberate counter-example: `ko:resize` and `ko:load` returned UNSUPPORTED and are recorded `concluded: null` rather than opened for coinage, because Korean developers read English identifiers fluently and a coined term would compete with something already working.

**The evidence rule is not relaxed, it is sequenced.** A coinage brief keeps the ordinary attestation search as phase 1 and authorises design only where phase 1 comes back empty — and demands the searches be shown per term.

**Design criteria** (all are wave-1 defects turned into constraints):

- build from the language, not by transliterating English; onomatopoeia is welcome where the language uses it productively;
- coin opposites as pairs sharing a stem — a learner who meets `keydown` will guess `keyup`;
- check the dominant sense first; four languages shipped the *visual* blur word for the focus-loss event;
- noun or participle, citation form;
- transparency test: a term that needs the English word to explain it has not earned its place over the English word.

**Provenance and displacement.** Coined terms are recorded `basis: 'coined'`. The brief renders them as the inverse of confirm-only — "try to falsify this." **An attested term always beats a coined one**: when one is found, rewrite the record with the attested form as `concluded`, `basis: 'attested'`, and the coined form moved into `superseded` (it shipped, so it must keep parsing).

## Waves

Ordered by developer-audience size against how much of the vocabulary has never been read by a native speaker. "Audience" is not speaker count — it is roughly *speakers × how likely they are to learn to code in their own language*, and the second factor dominates. Per-locale reasoning is in `scripts/queue-research.mjs`.

| Wave | Locales | Status |
|---|---|---|
| 1 | ja pt de zh ko es | Applied 2026-07-28 |
| 2 | ar hi id ru bn tr vi fr | In flight. `tr` and `fr` concluded 2026-08-01: both verified by second-pass audits (harvested 2026-07-30), loka-side vocabulary applied, and 7 of the 8 profile-side corrections applied upstream at the same-day freeze-lift (hyperfixi `fix/wave2-tr-fr-event-vocab`). `fr:focus` alone stays `pending-upstream` — its removal touches the French tokenizer and generated grammar, an upstream design decision rather than a vocab reorder. ar hi id ru bn vi not yet queued |
| 3 | it pl uk he ms th tl sw qu | Defined, not queued (`qu`, `sw` in coinage mode) |

Run one wave at a time. Two in flight means harvesting reports against a vocabulary that is moving underneath them.

## Which test catches which mistake

| Mistake | Caught by |
|---|---|
| Committed data disagrees with the profiles | `test/gen-drift.mjs` |
| A concluded term did not actually ship | `test/vocab-ordering.mjs` (SETTLED loop) |
| A demoted spelling stopped parsing | `test/vocab-ordering.mjs` (superseded assertions) |
| A pending decision silently became applied | `test/vocab-ordering.mjs` (pending branch) |
| Upstream moved a term we had pending | `test/vocab-ordering.mjs` (`superseded[0]` premise check) |
| Findings assess a term nobody asked about | `scripts/distill.mjs --check` |
| A briefed term silently absent from findings | `scripts/distill.mjs --check` |
| A verdict asserting usage with no source, or an unfollowable `cite N` source | `scripts/distill.mjs --check` |
| `fx-vocab.mjs` shadowing a profile term | `scripts/gen-locales.mjs` (warn; throw after freeze-lift) |
| A canonical published outside the allowlist | `orderValues` in `gen-locales.mjs` (throws) |
| A localized term never reaching `addEventListener` | `test/loka-js.spec.mjs` phase J |
| An attribute alias that stopped resolving per element | `test/loka-js.spec.mjs` phase J |

## Known gaps

- **Attribute-name aliases have no runtime test beyond phase J's German case.** The mechanism is per-element resolution in `fx.name`; only `de` exercises a demoted spelling.
- **`suspicions()` is blind to word choice.** It catches fused compounds, underscores and camelCase. It cannot see a real word carrying the wrong meaning, which is where every serious defect so far has been. That is why the brief states the cross-locale rules explicitly instead of relying on flags.
- **The three cross-locale rules are stated in prose to reviewers, not enforced anywhere.** A locale could ship a new infinitive primary tomorrow and nothing would fail.
