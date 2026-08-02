// Terminology decisions that have concluded — the single source for "we already
// looked at this term."
//
// Two consumers, previously two hand-maintained copies of the same four facts:
//
//   scripts/research-brief.mjs   marks a term settled so a brief doesn't spend a
//                                reviewer's effort re-deriving it
//   test/vocab-ordering.mjs      asserts the concluded form is primary AND the
//                                superseded spellings still parse
//
// They drifted apart in the obvious way: a correction reached one and not the
// other, so the brief could advertise a term as reviewed while nothing tested
// that the reviewed spelling actually shipped.
//
// Records are phrased as the CONCLUSION, not the transition ("we ship X" rather
// than "we changed Y to X"), so the entry stays unambiguous when read against a
// checkout that predates the regeneration.
//
// Adding a record after a review concludes
// ----------------------------------------
// The term itself does NOT live here. This file records that a decision was
// made; the vocabulary lives upstream:
//
//   event names → ../hyperfixi/packages/semantic/src/generators/profiles/<profile>.ts
//   attr names  → scripts/fx-vocab.mjs
//
// Change it there, `npm run gen`, then add the record below. `npm test` fails if
// a record and the generated data disagree.
//
// When the upstream half is unavailable — another session owns the hyperfixi
// checkout, say — record the decision anyway with `status: 'pending-upstream'`.
// See RESEARCH_PIPELINE.md, "Freeze protocol".

/**
 * @typedef {{
 *   concluded: string|null, // the form we ship and teach — must be primary in the locale.
 *                           // null means the decision was to publish NOTHING: no term
 *                           // survived review, so authors write the canonical English
 *                           // token (identity). ko resize/load and de mouseover/mouseout
 *                           // are the cases. A null record is what distinguishes "we
 *                           // looked and found nothing" from "nobody has looked yet" —
 *                           // the second is a gap, the first is a conclusion.
 *   superseded: string[],   // spellings THIS decision demoted, retained as parse
 *                           // alternatives for back-compat. Not a list of every
 *                           // alternative: legitimate synonyms that were never wrong
 *                           // (pt 'mouse liberado', de 'Größe ändern') don't belong here,
 *                           // because the assertion attached to this field is "the bad
 *                           // old spelling still resolves", not "alts exist". One
 *                           // exception: a COINED form later displaced by an attested one
 *                           // belongs here even though it was never wrong — it shipped,
 *                           // learners may have typed it, and it must keep parsing.
 *                           // For `pending-upstream` records, superseded[0] is the
 *                           // currently-shipping wrong primary — the test asserts it, so
 *                           // that a third form appearing means upstream moved
 *                           // differently and the record's premise is void.
 *   why: string,            // one line; what was wrong with the superseded form
 *   date: string,           // ISO date the decision concluded
 *   sources: string[],      // URLs the decision rests on; [] for pre-research corrections
 *   variantNote: string|null, // regional caveat, e.g. 'pt-BR usage; pt-PT unverified'
 *   status?: 'applied'|'pending-upstream', // absent = 'applied'. 'pending-upstream' means
 *                           // the decision is made but the edit lands in a repo we cannot
 *                           // touch right now, so the WRONG form is still shipping. The
 *                           // brief must say so rather than advertising the term as
 *                           // reviewed, and vocab-ordering asserts the pending state
 *                           // affirmatively so the freeze lifting is self-reporting.
 *   basis?: 'attested'|'structural'|'coined', // absent: sources.length ? attested :
 *                           // structural. 'attested' = real usage was found. 'structural'
 *                           // = decided on morphology/collision grounds with no citation.
 *                           // 'coined' = deliberately invented because no term existed
 *                           // (see RESEARCH_PIPELINE.md, "Coinage track"). MUST be set
 *                           // explicitly — a coinage has no sources either, so it is
 *                           // indistinguishable from 'structural' by the default rule,
 *                           // and the two get opposite treatment in a brief: structural
 *                           // is open to challenge, coined is actively asking to be
 *                           // falsified by any attested term at all.
 * }} SettledTerm
 */

/**
 * Keyed `${localeCode}:${canonical}`, where canonical is either a DOM event name
 * (`es:mousedown`) or an attribute name (`de:fx-swap`). Attribute records were
 * previously a hardcoded table inside verify-prompt.mjs and comments in
 * fx-vocab.mjs — the same two-copies-of-one-fact problem this file was created
 * to end, reintroduced for the other half of the vocabulary.
 * @type {Record<string, SettledTerm>}
 */
export const SETTLED = {
  // The 2026-05-23 decision here (un-fuse 'ratónabajo' → 'ratón abajo') was
  // correct but incomplete: it fixed the orthography and left the calque. Both
  // records were rewritten 2026-07-28 rather than added alongside, because the
  // file states conclusions, not transitions — and the conclusion moved.
  'es:mousedown': {
    concluded: 'ratón pulsado',
    superseded: ['ratón abajo', 'ratónabajo'],
    why: "'ratón abajo' translated the English word 'down' as a position — it says the mouse is physically below something, and reports nothing about the button. Spanish describes the actuation: 'detecta cuando un botón del ratón está siendo presionado'. Now parallel to 'tecla pulsada' and to pt 'mouse pressionado'",
    date: '2026-07-28',
    sources: ['https://platzi.com/blog/eventos-del-mouse-en-javascript/'],
    variantNote: "Latin America says 'mouse' where Spain says 'ratón' (RAE, Diccionario panhispánico de dudas); 'mouse presionado' registered as an alias",
  },
  'es:mouseup': {
    concluded: 'ratón soltado',
    superseded: ['ratón arriba', 'ratónarriba'],
    why: "same calque as es:mousedown — 'arriba' is a position, and the event is the release of the button, which Spanish renders with 'soltar'",
    date: '2026-07-28',
    sources: ['https://platzi.com/blog/eventos-del-mouse-en-javascript/'],
    variantNote: "'mouse soltado' registered for Latin American usage",
  },
  'es:keydown': {
    concluded: 'tecla pulsada',
    superseded: ['tecla abajo'],
    why: "'tecla abajo' was the same spatial calque as the mouse pair; Spanish course material titles the lesson 'Tecla pulsada' and explains the event as 'cuando se presiona una tecla'",
    date: '2026-07-28',
    sources: [
      'https://lenguajejs.com/eventos/eventos-navegador/keyboard-event/',
      'https://es.javascript.info/keyboard-events',
    ],
    variantNote: "Spain says 'pulsar', Latin America 'presionar'; 'tecla presionada' registered as an alias",
  },
  'es:keyup': {
    concluded: 'tecla soltada',
    superseded: ['tecla arriba'],
    why: "es.javascript.info defines keyup as 'cuando una tecla pulsada se suelta'; 'arriba' described a position rather than the release",
    date: '2026-07-28',
    sources: ['https://es.javascript.info/keyboard-events'],
    variantNote: "'tecla liberada' registered for Latin American usage",
  },
  'es:focus': {
    concluded: 'enfoque',
    superseded: ['enfocar'],
    why: 'nominalization — the infinitive read as a command and collided conceptually with the elem.focus() method; both spellings already shipped, so this is an ordering fix',
    date: '2026-07-28',
    sources: ['https://es.javascript.info/focus-blur'],
    variantNote: null,
  },
  'es:blur': {
    concluded: 'pérdida de foco',
    superseded: ['desenfocar', 'desenfoque'],
    why: "DEPARTS from the Spanish review, which endorsed 'desenfoque'. The parallel Portuguese review rejected the exact cognate 'desfoque' as the CSS visual blur, and that false friend is the most common defect this project has found (ja ぼかし, ko 블러, de defokussieren). Spanish 'desenfoque' is likewise the photographic sense; the Spanish review itself lists 'pérdida de foco' as attested for the event",
    date: '2026-07-28',
    sources: ['https://es.javascript.info/focus-blur'],
    variantNote: null,
  },
  'es:init': {
    concluded: 'inicio',
    superseded: ['iniciar'],
    why: "nominalization, same as es:focus. 'inicialización' also registered — it is the form the de and pt corrections landed on, so a learner moving between locales meets a cognate",
    date: '2026-07-28',
    sources: [],
    variantNote: null,
  },
  'es:scroll': {
    concluded: 'desplazamiento',
    superseded: ['desplazar'],
    why: "nominalization; 'barra de desplazamiento' is the noun every Spanish reader knows, while 'desplazar' is the action. Ordering fix — both already shipped",
    date: '2026-07-28',
    sources: ['https://lenguajejs.com/eventos/introduccion/addeventlistener/'],
    variantNote: "Spanish developers colloquially say 'hacer scroll'; the English token resolves by identity anyway",
  },
  'es:resize': {
    concluded: 'cambio de tamaño',
    superseded: ['redimensionar'],
    why: 'nominalization: the infinitive commands the browser to resize, while the event reports that the size changed',
    date: '2026-07-28',
    sources: [],
    variantNote: null,
  },
  'pt:mousedown': {
    concluded: 'mouse pressionado',
    superseded: ['mouse baixo', 'mouseBaixo'],
    why: "'mouse baixo' calqued the English spatial down/up; Portuguese describes the button state",
    date: '2026-07-28',
    sources: [],
    variantNote: 'pt-BR usage; pt-PT unverified (pt-PT also prefers "rato" over "mouse")',
  },
  'pt:mouseup': {
    concluded: 'mouse solto',
    superseded: ['mouse cima', 'mouseCima'],
    why: "'mouse cima' calqued the English spatial down/up; Portuguese describes the button state",
    date: '2026-07-28',
    sources: [],
    variantNote: 'pt-BR usage; pt-PT unverified (pt-PT also prefers "rato" over "mouse")',
  },
  'de:resize': {
    concluded: 'Größenänderung',
    superseded: ['größeändern'],
    why: "'größeändern' was a malformed compound — German either separates the verb phrase or compounds with the linking -n-",
    date: '2026-07-28',
    sources: [],
    variantNote: null,
  },
  // ── First research wave, 2026-07-28 ──────────────────────────────────────
  // `blur` was wrong in three of the five locales reviewed, each in the same
  // way: the profile carried the VISUAL blur sense (image/optics) instead of
  // focus-loss. English `blur` is a false friend, and a round-trip test cannot
  // catch it — the term parses fine, it just means something else.
  'de:blur': {
    concluded: 'Fokusverlust',
    superseded: ['defokussieren', 'entfokussieren'],
    why: "'defokussieren' has no attested use in German web writing — it belongs to optics/photography. German HTML references gloss onblur as 'bei Fokusverlust', paired with 'bei Fokuserhalt' for onfocus",
    date: '2026-07-28',
    sources: [
      'https://brauchbar.de/html-4-referenz/attribute-onblur',
      'https://wiki.selfhtml.org/wiki/JavaScript/DOM/Event/blur',
      'https://molily.de/javascript-fokus-zentral/',
    ],
    variantNote: null,
  },
  'ja:blur': {
    concluded: 'フォーカス解除',
    superseded: ['ぼかし', 'フォーカスアウト'],
    why: "'ぼかし' is the image-processing sense (Photoshop ぼかしフィルター) and carries no focus meaning in Japanese; 'フォーカスアウト' shipped as primary for one day before an independent pass pointed out it is the Japanese name for the DOM `focusout` event — a different event from `blur` (focusout bubbles, blur does not), so it teaches a false equivalence. 'フォーカス解除' names focus loss without naming another API",
    date: '2026-07-28',
    sources: [
      'https://ja.javascript.info/focus-blur',
      'https://developer.mozilla.org/ja/docs/Web/API/Element/blur_event',
      'https://code.mu/ja/javascript/manual/dom/blur/',
      'https://e-words.jp/w/%E3%83%95%E3%82%A9%E3%83%BC%E3%82%AB%E3%82%B9%E3%82%A2%E3%82%A6%E3%83%88.html',
    ],
    variantNote: null,
  },
  'ko:blur': {
    concluded: '포커스아웃',
    superseded: ['블러'],
    why: "'블러' means the visual blur effect almost exclusively in Korean (블러 처리, filter: blur()), so it reads as image blurring rather than focus loss",
    date: '2026-07-28',
    sources: [
      'https://developer.mozilla.org/ko/docs/Web/CSS/filter-function/blur',
      'https://kyounghwan01.github.io/blog/React/focus-blur/',
    ],
    variantNote: null,
  },
  // ── ja, first verified wave (2026-07-28) ─────────────────────────────────
  // Newly published, not corrections of shipped vocabulary: loka carried no
  // Japanese term for these, so an author had to write the English identifier.
  // Recorded here so the next brief asks a reviewer to confirm rather than
  // re-derive. keydown/keyup/mouseover/mouseout are deliberately NOT recorded —
  // they were published on plain confirmation, and キーアップ in particular is
  // the weakest term in the set (attested mainly in reference-entry titles;
  // organic prose says キーを離したとき). Leaving them unmarked keeps them open
  // to challenge in the next round.
  'ja:mousedown': {
    concluded: 'マウスダウン',
    superseded: ['マウス押下'],
    why: "'マウス押下' is genuine Japanese but SIer spec-document register — junior developers report looking 押下 up on first encounter — and it has no usable partner for mouseup. Japanese javascript.info uses マウスダウン, which pairs with マウスアップ",
    date: '2026-07-28',
    sources: [
      'https://ja.javascript.info/mouse-events-basics',
      'https://www.javadrive.jp/javascript/event/index17.html',
      'https://hitoridemanabou.net/js-mouse-events/',
    ],
    variantNote: null,
  },
  'ja:mouseup': {
    concluded: 'マウスアップ',
    // マウス解放 is NOT retained: it is a fabrication rather than an old spelling
    // authors might have typed, so there is no back-compat to preserve.
    superseded: [],
    why: "upstream's proposed 'マウス解放' is a context-free translation of English 'release' — 解放 in Japanese computing means freeing a resource (memory, locks, file handles), never releasing a button, and an exact-phrase search returns no use in the event sense",
    date: '2026-07-28',
    sources: [
      'https://ja.javascript.info/mouse-events-basics',
      'https://developer.mozilla.org/ja/docs/Web/API/Element/mouseup_event',
      'https://www.javadrive.jp/javascript/event/index17.html',
    ],
    variantNote: null,
  },
  'ja:resize': {
    concluded: 'サイズ変更',
    // リサイズ is a legitimate synonym, never a wrong spelling — this record
    // locks the primary-first ordering, not a correction.
    superseded: [],
    why: 'both サイズ変更 and リサイズ are real; サイズ変更 leads because it is what tutorial prose uses to explain the event (「ウィンドウサイズが変更されたとき」) and is transparent to a beginner with no English',
    date: '2026-07-28',
    sources: [
      'https://www.javadrive.jp/javascript/event/index23.html',
      'https://developer.mozilla.org/ja/docs/Web/API/Window/resize_event',
    ],
    variantNote: null,
  },
  'ja:load': {
    concluded: '読み込み',
    // Ordering correction: upstream listed ロード first.
    superseded: [],
    why: 'both are real, but 読み込み dominates Japanese tutorial prose for loading assets and parsing documents, while ロード survives mainly inside discussion of the onload identifier itself — primary-first ordering was backwards',
    date: '2026-07-28',
    sources: [
      'https://ja.javascript.info/onload-onerror',
      'https://www.javadrive.jp/javascript/event/index1.html',
    ],
    variantNote: null,
  },
  // ── Verified wave, 2026-07-28: de / pt / zh ──────────────────────────────
  // The cross-locale finding of this wave: an event identifier must be a NOUN or
  // a past participle, never a bare infinitive. Four independent reviews reached
  // it separately — an infinitive reads as a command to the browser ('focus
  // this!') while an event names something that already happened. Locales whose
  // nouns don't inflect (ja, ko, zh) were already right by accident; the Latin
  // ones shipped infinitives as primaries.
  'de:focus': {
    concluded: 'Fokus',
    superseded: ['fokussieren'],
    why: "'fokussieren' is a bare infinitive and read as a command, out of step with every other German identifier here (Klick, Eingabe, Änderung, Absenden). 'Fokuserhalt' is the form German HTML references pair with 'Fokusverlust'; 'Fokus' leads as the shortest recognisable noun",
    date: '2026-07-28',
    sources: ['https://www.mediaevent.de/javascript/focus-event.html'],
    variantNote: null,
  },
  'de:init': {
    concluded: 'Initialisierung',
    superseded: ['initialisieren'],
    why: "same word-class correction as de:focus — 'bei Initialisierung' patterns with 'bei Änderung' / 'bei Eingabe', while the infinitive instructs rather than reports",
    date: '2026-07-28',
    sources: ['https://wiki.selfhtml.org/wiki/JavaScript/Tutorials/Zeit_%26_Datum'],
    variantNote: null,
  },
  'de:keydown': {
    concluded: 'taste gedrückt',
    // 'taste runter' was upstream's aspirational form; never shipped here, so
    // there is nothing to keep parsing.
    superseded: [],
    why: "upstream's 'taste runter' used colloquial directional adverbs no German developer would type as an identifier; SelfHTML's keyboard tutorial names its own handlers TasteGedrückt / TasteLosgelassen",
    date: '2026-07-28',
    sources: [
      'https://wiki.selfhtml.org/wiki/JavaScript/DOM/Event/Tastaturabfragen',
      'https://www.mediaevent.de/javascript/keydown.html',
    ],
    variantNote: null,
  },
  'de:load': {
    concluded: 'geladen',
    superseded: [],
    why: "'laden' collides with 'der Laden' (the shop) and 'Ladung' means cargo or electrical charge; the participle 'geladen' is unambiguous and matches MediaEvent's 'wenn die gesamte Seite geladen ist'",
    date: '2026-07-28',
    sources: ['https://www.mediaevent.de/javascript/mouseover.html'],
    variantNote: null,
  },
  'pt:focus': {
    concluded: 'foco',
    superseded: ['focar'],
    why: 'nominalization: Portuguese prose says an element "recebe o foco", and the infinitive read as a command',
    date: '2026-07-28',
    sources: [
      'https://www.javascriptprogressivo.net/2019/01/Eventos-Formulario-onfocus-focus-onblur-blur.html',
    ],
    variantNote: null,
  },
  'pt:blur': {
    concluded: 'perda de foco',
    superseded: ['desfocar'],
    why: "'desfoque' was the obvious nominalization and is exactly the trap that ぼかし was in Japanese and 블러 in Korean — in front-end Portuguese it names the CSS visual blur (filter: blur(), backdrop-filter). MDN pt-BR describes the event as the moment an element 'perde foco'",
    date: '2026-07-28',
    sources: [
      'https://developer.mozilla.org/pt-BR/docs/Web/API/Element/blur_event',
      'https://cursos.alura.com.br/forum/topico-duvida-addeventlistener-diferenca-entre-blur-e-focusout-268930',
    ],
    variantNote: null,
  },
  'pt:init': {
    concluded: 'inicialização',
    superseded: ['iniciar', 'inicializar'],
    why: 'nominalization: the noun names the lifecycle phase being observed, the infinitive commands it',
    date: '2026-07-28',
    sources: [
      'https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Operators/Object_initializer',
    ],
    variantNote: null,
  },
  'pt:scroll': {
    concluded: 'rolagem',
    superseded: ['rolar'],
    why: '"evento de rolagem" is the attested phrasing throughout Portuguese tutorials and Vue\'s own pt docs; "rolar" is the action, not the event',
    date: '2026-07-28',
    sources: ['https://br.vuejs.org/v2/cookbook/creating-custom-scroll-directives'],
    variantNote: 'pt-PT also says "deslocamento" (barra de deslocamento); registered as an alias',
  },
  'pt:resize': {
    concluded: 'redimensionamento',
    superseded: ['redimensionar'],
    why: 'nominalization; "evento de redimensionamento" is the documented phrasing and the spelling is identical across variants',
    date: '2026-07-28',
    sources: ['https://horadecodar.com.br/eventos-de-redimensionamento-da-janela-em-angular/'],
    variantNote: null,
  },
  'pt:load': {
    concluded: 'carregamento',
    // 'carregar' was never published for pt, so there is no old spelling to keep
    // parsing — and registering it would actively mislead a pt-PT reader.
    superseded: [],
    why: "'carregar' is a cross-variant trap: in European Portuguese 'carregar (em)' means to press a button, so fx-gatilho=\"carregar\" reads as a click in Lisbon and as a page load in São Paulo. 'carregamento' means loading in both",
    date: '2026-07-28',
    sources: ['https://www.infopedia.pt/dicionarios/lingua-portuguesa/carregar'],
    variantNote: 'the divergence is why the infinitive is unpublishable, not merely dispreferred',
  },
  'zh:mouseover': {
    concluded: '鼠标移入',
    superseded: [],
    why: "'鼠标进入' was rejected: Chinese tutorials reserve 进入/离开 for the non-bubbling mouseenter/mouseleave pair and 移入/移出 for the bubbling mouseover/mouseout pair. Using 进入 for mouseover erases the contrast that bubbling is taught with",
    date: '2026-07-28',
    sources: [
      'https://zh.javascript.info/mousemove-mouseover-mouseout-mouseenter-mouseleave',
    ],
    variantNote: 'Taiwan/HK 滑鼠移入 registered as an alias',
  },
  'zh:keyup': {
    concluded: '按键松开',
    superseded: [],
    why: "upstream's '松键' is a back-formation with no attestation as a DOM event name; MDN zh-CN says '按键被松开时触发'",
    date: '2026-07-28',
    sources: ['https://developer.mozilla.org/zh-CN/docs/Web/API/Element/keyup_event'],
    variantNote: null,
  },
  'pl:resize': {
    concluded: 'zmiana rozmiaru',
    superseded: ['zmieńrozmiar'],
    why: "'zmieńrozmiar' fused a two-word phrase; Polish writes the noun 'zmiana rozmiaru'",
    date: '2026-07-28',
    sources: [],
    variantNote: null,
  },

  // ── ko candidates: the two-pass reversal (recorded late, 2026-08-01) ─────
  // Korean's wave-1 review had a second pass — the "Formative Review" doc of
  // 2026-07-29, harvested to research-notes/loka-js-verification-review-
  // korean-terminology-audit.md — which CONTRADICTED the first pass's
  // rejection of these six with direct Hangul attestation. What shipped
  // followed the second pass, but only the FIRST pass was ever distilled into
  // research/findings/ko.json, so the brief flagged all six as suspects and
  // the regenerated verify prompt claimed they had been "read by nobody
  // since". These records file the decision where the tooling can see it.
  // Dates are the decision date (applied in #10), not the recording date.
  //
  // The dividing line the second pass drew: natural loanword fusion (클릭-
  // pattern single tokens that entered colloquial Korean) is authentic, while
  // forced fusion of semantic words would violate 띄어쓰기 — so the fused-
  // compound heuristic's flag on these was a false positive.
  'ko:keydown': {
    concluded: '키다운',
    superseded: [],
    why: "first pass rejected it as unattested; the second-pass audit contradicted that with organic Hangul usage ('키다운 로직구현', '간단한 키다운 이벤트') and a structural driver — Hangul IME composition bugs force Korean developers to work with raw key events, so the transliterated pair is unusually alive in Korean writing",
    date: '2026-07-29',
    sources: [
      'https://sh77113.tistory.com/entry/Jquery-%ED%82%A4%EB%B3%B4%EB%93%9Ckeydown%EC%9D%B4%EB%B2%A4%ED%8A%B8',
      'https://davinchicoder.tistory.com/entry/TIL-20220929-keydown-%ED%95%9C%EA%B8%80%EC%9E%85%EB%A0%A5-%EC%97%90%EB%9F%AC%ED%95%B4%EA%B2%B0-feat-compositionEnd',
      'https://velog.io/@kjuni1914/IME%EB%A5%BC-%ED%86%B5%ED%95%9C-%ED%95%9C%EA%B5%AD%EC%96%B4-%EC%9E%85%EB%A0%A5%EA%B3%BC-isComposing',
    ],
    variantNote: null,
  },
  'ko:keyup': {
    concluded: '키업',
    superseded: [],
    why: "pairs with ko:keydown; attested in Hangul ('키업 이벤트(키가 눌리고 올라올 때)') in the same IME-driven tutorials that keep the pair alive",
    date: '2026-07-29',
    sources: [
      'https://velog.io/@tmdgp0212/MiniProject-virtualkeyboard',
      'https://gomtak.tistory.com/m/3',
    ],
    variantNote: null,
  },
  'ko:mousedown': {
    concluded: '마우스다운',
    superseded: [],
    why: "first pass said only machine-translated Microsoft docs use it; the audit contradicted that with human-authored click-lifecycle tutorials ('실행 - 마우스다운, 마우스무브, 마우스업')",
    date: '2026-07-29',
    sources: [
      'https://shinluckyarchive.tistory.com/56',
      'https://jows1110.tistory.com/84',
    ],
    variantNote: null,
  },
  'ko:mouseup': {
    concluded: '마우스업',
    superseded: [],
    why: "attested alongside 마우스다운 ('마우스 다운시와 업할때'), and drag-and-drop write-ups lean on the 마우스업-vs-클릭 distinction to prevent accidental firing after a drag",
    date: '2026-07-29',
    sources: [
      'https://23life.tistory.com/entry/DragDrop-%EC%BB%B4%ED%8F%AC%EB%84%8C%ED%8A%B8%EC%97%90%EC%84%9C-%ED%81%B4%EB%A6%AD-%EC%9D%B4%EB%B2%A4%ED%8A%B8%EC%99%80-%EB%93%9C%EB%9E%98%EA%B7%B8-%EC%9D%B4%EB%B2%A4%ED%8A%B8-%EB%B6%84%EB%A6%AC%ED%95%98%EA%B8%B0',
      'https://aosceno.tistory.com/555',
    ],
    variantNote: null,
  },
  'ko:mouseover': {
    concluded: '마우스오버',
    superseded: [],
    why: "the one candidate both passes agreed on — standard across web-design, no-code and DOM tutorials; tutorial titles carry it in Hangul",
    date: '2026-07-29',
    sources: [
      'https://green-grapes.tistory.com/m/entry/Javascript-%EB%A7%88%EC%9A%B0%EC%8A%A4%EC%98%A4%EB%B2%84-%EB%A7%88%EC%9A%B0%EC%8A%A4%EC%95%84%EC%9B%83-%EC%8A%AC%EB%9D%BC%EC%9D%B4%EB%93%9C-%EB%A7%8C%EB%93%A4%EA%B8%B0',
      'https://rgy0409.tistory.com/3028',
    ],
    variantNote: null,
  },
  'ko:mouseout': {
    concluded: '마우스아웃',
    superseded: [],
    why: "first pass published it 'reluctantly, weakest item, no textual evidence'; the audit contradicted the non-attestation claim — the 마우스오버/마우스아웃 pairing is robust in Hangul because teaching the bubbling contrast against mouseenter/mouseleave requires naming both",
    date: '2026-07-29',
    sources: [
      'https://green-grapes.tistory.com/m/entry/Javascript-%EB%A7%88%EC%9A%B0%EC%8A%A4%EC%98%A4%EB%B2%84-%EB%A7%88%EC%9A%B0%EC%8A%A4%EC%95%84%EC%9B%83-%EC%8A%AC%EB%9D%BC%EC%9D%B4%EB%93%9C-%EB%A7%8C%EB%93%A4%EA%B8%B0',
      'https://ahnsso.tistory.com/180',
    ],
    variantNote: null,
  },

  // ── Publish-nothing conclusions ──────────────────────────────────────────
  // `concluded: null`. These look like gaps in the data and are not: someone
  // looked, found nothing worth shipping, and decided the English canonical is
  // what an author should write. Recorded so the next brief does not re-ask, and
  // so vocab-ordering asserts the absence rather than trusting a comment.
  'ko:resize': {
    concluded: null,
    superseded: [],
    why: "the 2026-07-29 second-pass audit returned UNSUPPORTED rather than agreeing — the first pass endorsed 리사이즈, but the audit's one source URL was inaccessible and no Hangul usage could be verified in a DOM-event context. An artifacts failure, not counter-evidence; publishing on intuition is what this pipeline exists to stop",
    date: '2026-07-28',
    sources: [],
    variantNote: 'revisit with Tistory/Velog evidence; 리사이즈 is plausible but unverified — the audit names the exact snippets needed (see research-notes/loka-js-verification-review-korean-terminology-audit.md)',
  },
  'ko:load': {
    concluded: null,
    superseded: [],
    why: "same as ko:resize — the audit was given no snippet showing whether Korean developers write 로드, 페이지 로드 or the native 불러오기 for the event, so the first pass's endorsement of 로드 could not be corroborated",
    date: '2026-07-28',
    sources: [],
    variantNote: 'the three candidates are 로드 / 페이지 로드 / 불러오기; evidence would settle it',
  },
  'de:mouseover': {
    concluded: null,
    superseded: [],
    why: "the literal glosses 'maus über' / 'maus drüber' appear only in prose explaining the English word to beginners, never as identifiers; German developers say 'hovern' and write the English names. Localizing here would isolate a learner from CSS :hover and from every tutorial they read next — the one case found so far where translating costs more than it gives",
    date: '2026-07-28',
    sources: ['https://www.mediaevent.de/javascript/mouseover.html'],
    variantNote: null,
  },
  'de:mouseout': {
    concluded: null,
    superseded: [],
    why: "same as de:mouseover; 'maus heraus' is clumsy and unidiomatic as an identifier, and the alternative 'maus verlässt' pairs with nothing",
    date: '2026-07-28',
    sources: ['https://www.mediaevent.de/javascript/mouseover.html'],
    variantNote: null,
  },

  // ── Attribute names ──────────────────────────────────────────────────────
  // Keyed on the attribute rather than an event. These decisions were previously
  // recorded twice and tested zero times: prose in fx-vocab.mjs, plus a
  // hardcoded APPLIED_EXTRA table in verify-prompt.mjs that had to be hand-edited
  // after every round. Both are gone; this is the single record.
  //
  // Note these matter more at runtime than event records do. An event alias
  // resolves through lookupEvt, which consults the whole map, so demoting an
  // event spelling is free. An attribute alias only resolves because fx.name
  // scans the element for each registered spelling — see CLAUDE.md, "An
  // attribute-name alias is only an alias if it resolves per element".
  'ja:fx-swap': {
    concluded: 'fx-置換',
    superseded: ['fx-スワップ'],
    why: "スワップ is a real IT loanword but no Japanese source uses it for DOM content replacement — both Japanese htmx write-ups reach for 置換/挿入方式. It reads as memory or financial swapping",
    date: '2026-07-28',
    sources: [
      'https://www.appleple.com/blog/frontend/htmx202402.html',
      'https://e-words.jp/w/%E3%82%B9%E3%83%AF%E3%83%83%E3%83%97.html',
    ],
    variantNote: null,
  },
  'de:fx-swap': {
    concluded: 'fx-ersetzung',
    superseded: ['fx-tausch'],
    why: "'Tausch' is a reciprocal barter — both sides give something up, which is not what a swap does to the DOM. The German htmx introduction calls hx-swap's job 'die Ersetzung' and its options 'Ersetzungsstrategie'",
    date: '2026-07-28',
    sources: ['https://www.innoq.com/de/blog/2024/06/htmx-einstieg/'],
    variantNote: null,
  },
  'ko:fx-swap': {
    concluded: 'fx-교체',
    superseded: ['fx-스왑'],
    why: "스왑 in Korean is the finance sense, or the two-variable exchange (교체 연산) — bidirectional either way, while a hypermedia swap replaces",
    date: '2026-07-28',
    sources: [],
    variantNote: null,
  },
  'zh:fx-swap': {
    concluded: 'fx-替换',
    superseded: ['fx-交换'],
    why: "交换 is a symmetrical exchange (A and B trade places); a swap unidirectionally replaces the target's subtree. Chinese DOM writing says 替换. 交换 kept parsing because the community htmx cheatsheet translation uses it (交换策略)",
    date: '2026-07-28',
    sources: ['https://quickref.me/zh-CN/docs/htmx.html'],
    variantNote: null,
  },
  'ko:fx-method': {
    concluded: 'fx-메서드',
    superseded: ['fx-메소드'],
    why: "메서드 is the National Institute of Korean Language transcription of [meθəd] and what javascript.info ko and MDN ko use; 메소드 survives in general usage mainly from 메소드 연기 (method acting) subtitles",
    date: '2026-07-28',
    sources: [],
    variantNote: null,
  },
  'ko:fx-action': {
    concluded: 'fx-주소',
    superseded: ['fx-액션'],
    why: "액션 in Korean is overwhelmingly the film/performance sense and has no attested use for a request URL; Korean tutorials gloss the concept as 주소 / '전송할 위치(URL)'",
    date: '2026-07-28',
    sources: ['https://lasbe.tistory.com/83'],
    variantNote: null,
  },
  'zh:fx-action': {
    concluded: 'fx-地址',
    superseded: ['fx-动作'],
    why: "动作 means a physical movement or gesture — it translates the English word 'action', not the concept (an endpoint URL). Chinese docs say 地址 / 请求地址 / URL. 'fx-请求地址' is registered alongside as the more precise form the verification pass preferred",
    date: '2026-07-28',
    sources: ['https://www.w3school.com.cn/tags/att_form_action.asp'],
    variantNote: null,
  },

  // ── Second research wave: tr / fr ────────────────────────────────────────
  // First pass 2026-07-29, adversarial second pass 2026-07-30, decided
  // 2026-08-01. The two audits behaved very differently and these records
  // weigh them accordingly: the French audit did the citation-integrity work
  // (it caught three miscited first-pass sources, including a psychology
  // textbook cited for fx-swap) but its one "contradiction" (fx-action)
  // misread the identity convention; the Turkish audit confirmed every
  // substantive first-pass claim without checking a single citation, so its
  // six reversals are accepted only where the term is attested in the
  // pedagogical sources it names, and its weakest pair is marked open to
  // challenge. hyperfixi was owned by another session earlier on 2026-08-01,
  // so profile-side corrections were first recorded pending-upstream; the
  // freeze lifted the same evening and seven of the eight were applied
  // upstream (hyperfixi branch fix/wave2-tr-fr-event-vocab). fr:focus alone
  // stays pending — its record says why.
  'tr:fx-action': {
    concluded: 'fx-istek',
    superseded: ['fx-eylem'],
    why: "'eylem' translates the English attribute's name ('deed/act'), not the concept — an endpoint URL. Turkish developers universally write 'istek' / 'İstek Adresi' for the request target, and 'hedef' is taken by fx-target. Both passes agree",
    date: '2026-08-01',
    sources: [
      'https://github.com/luminati-io/luminati-proxy/blob/master/www/lum/pub/locale/tr.json',
      'https://thinktech.stm.com.tr/uploads/docs/1634628247_stm-siber-tehdit-durum-raporu-temmuz-eylul-2021.pdf',
    ],
    variantNote: null,
  },
  'tr:fx-swap': {
    concluded: 'fx-değiştirme',
    superseded: ['fx-değişim'],
    why: "'değişim' (-im) is the intransitive noun of systemic change (değişim yönetimi = change management) and collided with the `change` event's accepted alternative; 'değiştirme' (-me on the causative stem) is the transitive act of replacing. Same replace-not-exchange convergence as de/ko/zh/ja/fr; 'takas' rejected as financial",
    date: '2026-08-01',
    sources: [
      'https://www.scribd.com/document/500407320/3rd-International-New-York-Conference-on-Evolving-Trends-in-Interdisciplinary-Research-Practices-Bildiri-Kitab%C4%B1',
    ],
    variantNote: null,
  },
  'tr:keydown': {
    concluded: 'tuşa basma',
    superseded: [],
    why: "reversal of the first pass's keep-English verdict: it had searched for the fused 'tuşbasma' (upstream's aspirational form, orthographically invalid, never shipped) and found nothing; the attested pedagogical phrase is the noun phrase 'tuşa basma' ('klavyedeki tuşlara basılma anı'), legal here because lookup collapses spaces",
    date: '2026-08-01',
    sources: ['https://afguven.com/depo/dersnot/bahar22/Bkontrol/Bkontrol2.pdf'],
    variantNote: null,
  },
  'tr:keyup': {
    concluded: 'tuşu bırakma',
    superseded: [],
    why: "pairs with tr:keydown on the basma/bırakma dichotomy Turkish tutorials teach the two events with ('tuşu bırakma', 'tuş bırakıldığında'); the fused 'tuşbırakma' never shipped",
    date: '2026-08-01',
    sources: [
      'https://afguven.com/depo/dersnot/bahar22/Bkontrol/Bkontrol2.pdf',
      'https://www.ekasunucu.com/en/software-knowledge',
    ],
    variantNote: null,
  },
  'tr:mousedown': {
    concluded: 'fare tuşuna basma',
    superseded: [],
    why: "instructional texts define the event as 'farenin herhangi bir tuşuna basılması'; the token names the button press, parallel to es 'ratón pulsado' and de 'maustaste gedrückt'. Upstream's 'fare_bas'/'farebas' never shipped",
    date: '2026-08-01',
    sources: ['https://afguven.com/depo/dersnot/bahar22/Bkontrol/Bkontrol2.pdf'],
    variantNote: null,
  },
  'tr:mouseup': {
    concluded: 'fare tuşunu bırakma',
    superseded: [],
    why: "documented as 'fare tuşu serbest bırakıldığında'; keeps structural symmetry with tr:mousedown",
    date: '2026-08-01',
    sources: ['https://www.scribd.com/document/970238368/JAVASCRI-PT'],
    variantNote: null,
  },
  'tr:mouseover': {
    concluded: 'üzerine gelme',
    superseded: [],
    why: "'Fare işaretçisi ile nesne üzerine gelme' is how Turkish web-design course notes describe the event. The audit itself flags this pair as its weakest — the gerund is derived from descriptive prose, not found as a standalone token. Open to challenge next wave",
    date: '2026-08-01',
    sources: [
      'https://afguven.com/depo/dersnot/bahar22/Bkontrol/Bkontrol2.pdf',
      'https://cemsutcu.files.wordpress.com/2013/10/web-design-ders-notlarc4b1-tc3bcrkc3a7e_ac3bcuzem.pdf',
    ],
    variantNote:
      'a government IT glossary or university syllabus mapping W3C UI Events to Turkish noun phrases would settle it — the audit names exactly this missing artifact',
  },
  'tr:mouseout': {
    concluded: 'dışına çıkma',
    superseded: [],
    why: "tutorials describe the exit as 'dışına çıktığımızda' / 'üzerinden çekildiğinde'; pairs spatially with üzerine gelme. Same weakest-pair caveat as tr:mouseover — derived from prose, open to challenge",
    date: '2026-08-01',
    sources: [
      'https://www.scribd.com/document/970238368/JAVASCRI-PT',
      'https://github.com/busenurcetin/JavaScript-Tutorial-Notlar',
    ],
    variantNote: 'same evidence gap as tr:mouseover',
  },
  'tr:resize': {
    concluded: 'yeniden boyutlandırma',
    superseded: [],
    why: "'one of the most successful technical localizations in the Turkish tech ecosystem' — but the attested form carries 'yeniden' (again); bare 'boyutlandırma' means the initial dimensioning and is registered as a close-miss parse alias, not primary. Both passes agree",
    date: '2026-08-01',
    sources: [
      'https://www.udemy.com/course/komple-web-uygulamas-gelistirme-egitimi-net-framework/',
      'https://manual.calibre-ebook.com/tr/calibre.pdf',
    ],
    variantNote: null,
  },
  'tr:input': {
    concluded: 'girdi',
    superseded: ['giriş'],
    why: "'giriş' reads as entry/login (giriş yapma) and can imply an authentication event; the technical term for data input is 'girdi' ('Girdi (Input) Eventleri'). Ordering fix — girdi already ships as a profile alternative",
    date: '2026-08-01',
    sources: [
      'https://eroglumit.medium.com/javascript-notlar%C4%B1-iii-events-de45e324ac5c',
      'https://www.scribd.com/document/502552773/Ybs405u-Internet-Ve-Web-Programlama',
    ],
    variantNote: null,
  },
  'tr:focus': {
    concluded: 'odaklanma',
    superseded: ['odak'],
    why: "both are attested, but 'odak' names the static focal point where 'odaklanma' names the act of acquiring it — the event ('odaklanma olayı', 'odaklanma durumu'). Ordering fix — odaklanma already ships as a profile alternative",
    date: '2026-08-01',
    sources: [
      'https://developer.android.com/develop/ui/views/layout/webapps/understand-window-insets?hl=tr',
      'https://www.klinik.com.tr/bilgi-bankasi/blog/wcag-22-uyumlu-ozel-odak-gostergeleri-olusturma',
    ],
    variantNote: null,
  },
  'tr:blur': {
    concluded: 'odak kaybı',
    superseded: ['bulanık'],
    why: "the fifth locale found shipping the optical sense: 'bulanık' is strictly visual (CSS filters, image processing) and 'absolutely never used by native developers' for the DOM event; the pedagogical term is 'odak kaybı' (loss of focus), the same construction as de/pt/es/fr",
    date: '2026-08-01',
    sources: [
      'https://github.com/busenurcetin/YazilimTerimleriSozlugu/blob/main/readme.md',
      'https://www.hizhosting.com/blog/asp-net-mvc-ile-gelismis-form-dogrulama-teknikleri',
    ],
    variantNote:
      "ASCII twin 'odak kaybi' registered upstream (ı does not fold); 'bulanıklık'/'bulanik' remain as parse alternatives behind the demoted primary",
  },
  'tr:scroll': {
    concluded: 'kaydırma',
    superseded: ['kaydır'],
    why: "'kaydır' is the bare imperative ('scroll!'); every attested form is the verbal noun 'kaydırma' ('kaydırma olayı', 'sayfaları kaydırma') — the same imperative-stem defect the noun rule exists to catch",
    date: '2026-08-01',
    sources: ['https://noyabilgisayar.net/ders-notlari/java-script-ders-notlari.pdf'],
    variantNote: "ASCII twin 'kaydirma' registered upstream",
  },
  'fr:fx-swap': {
    concluded: 'fx-remplacement',
    superseded: ['fx-échange'],
    why: "'échange' implies a bidirectional trade between co-equal entities, and 'FX swap' is entrenched financial French for foreign-exchange swaps; a hypermedia swap destructively replaces, and French DOM writing says 'remplacement' (Node.replaceChild = remplacer l'enfant). The first pass's citation for this claim was one of the three the audit caught as fabricated (a psychology textbook); the conclusion survives on the audit's re-verified sources",
    date: '2026-08-01',
    sources: [
      'https://www.banque-france.fr/system/files/2023-05/822288_livre_diip_v2.pdf',
      'https://fr.scribd.com/document/733601975/Tutoriel-Dynamisez-Vos-Sites-Web-Avec-Javascript',
    ],
    variantNote: null,
  },
  'fr:fx-action': {
    concluded: null,
    superseded: [],
    why: "'action' is a native French noun spelled identically to the canonical, so identity omission already publishes exactly what both passes want authors to write. The audit's CONTRADICTED verdict ('publish action rather than null') misread the omission-means-identity convention — its recommended outcome is the current state",
    date: '2026-08-01',
    sources: [],
    variantNote: null,
  },
  'fr:keydown': {
    concluded: 'touche enfoncée',
    superseded: [],
    why: "upstream's 'touche bas' must never ship — it is the standardized French name of the Down ARROW key, so a reader would bind the event to one specific key (the audit's false-friend finding, which the first pass missed). 'touche enfoncée' is standard French for a depressed key across technical registers and parallels es 'tecla pulsada' / de 'taste gedrückt' / pt 'tecla pressionada'",
    date: '2026-08-01',
    sources: [
      'https://ppk.developpez.com/tutoriels/javascript/creer-fonctionnalite-drag-and-drop-sur-votre-site/',
      'https://docs.oracle.com/cd/E19253-01/817-3917/817-3917.pdf',
    ],
    variantNote:
      'attestation is strongest in system/device documentation; French web prose mostly writes the English identifier — our audience reads the pedagogical register',
  },
  'fr:keyup': {
    concluded: 'touche relâchée',
    superseded: [],
    why: "'touche haut' is the Up ARROW key — same false friend as fr:keydown; 'relâchée' is the mechanical opposite of 'enfoncée' ('relâchement de la touche')",
    date: '2026-08-01',
    sources: ['https://docs.oracle.com/cd/E19253-01/817-3917/817-3917.pdf'],
    variantNote: 'same register caveat as fr:keydown',
  },
  'fr:mouseover': {
    concluded: 'survol',
    superseded: [],
    why: "'survol' is the universally standardized French hover noun — 'état au survol', 'au moment du survol' — used by web.dev and Mailchimp's French docs; upstream's 'souris dessus' is an infantile calque and never shipped",
    date: '2026-08-01',
    sources: [
      'https://web.dev/learn/css/transitions?hl=fr',
      'https://mailchimp.com/fr/resources/dropdown-menu/',
    ],
    variantNote: null,
  },
  'fr:mouseout': {
    concluded: null,
    superseded: [],
    why: "publish nothing yet: 'survol' has no attested exit partner. The audit proposed 'fin de survol' but itself flags it as needing user testing against 'sortie survol' — the noun is attested in prose, the token is not, and French is not a coinage locale",
    date: '2026-08-01',
    sources: [],
    variantNote:
      "candidates: 'fin de survol', 'sortie survol'; corpus attestation of either token, or the bootcamp A/B test the audit describes, would settle it",
  },
  'fr:mousedown': {
    concluded: null,
    superseded: [],
    why: "both passes agree no attested token exists ('souris descendue' is nonsensical; developers write the English identifier). The audit's 'appui souris' is a constructed pairing whose sources are VB.NET-era desktop books, unattested as a web token — below the evidence bar for a non-coinage locale",
    date: '2026-08-01',
    sources: [],
    variantNote: "candidate: 'appui souris', pending real attestation as an identifier",
  },
  'fr:mouseup': {
    concluded: null,
    superseded: [],
    why: "same as fr:mousedown; 'relâchement souris' is unattested as a token",
    date: '2026-08-01',
    sources: [],
    variantNote: "candidate: 'relâchement souris', pending real attestation as an identifier",
  },
  'fr:blur': {
    concluded: 'perte de focus',
    superseded: ['défocaliser'],
    why: "the sixth locale on the optical false friend: 'le flou' is visual, and French pedagogy exclusively writes 'perte de focus' for the event. 'défocaliser' is an unattested infinitive, doubly condemned by the noun rule. This is the one first-pass citation the audit re-verified and confirmed",
    date: '2026-08-01',
    sources: [
      'https://www.lycee-rene-cassin-montfort-sur-meu.ac-rennes.fr/sites/lycee-rene-cassin-montfort-sur-meu.ac-rennes.fr/IMG/pdf/javascript.pdf',
      'https://fr.scribd.com/document/733601975/Tutoriel-Dynamisez-Vos-Sites-Web-Avec-Javascript',
    ],
    variantNote: null,
  },
  'fr:scroll': {
    concluded: 'défilement',
    superseded: ['défiler'],
    why: "infinitive→noun: MDN fr writes 'l'événement de défilement' and the OQLF standardizes 'défilement'; 'défiler' commands. The first pass's second citation here was one of the miscites the audit caught (an English-only W3C/Mozilla page) — MDN fr is the good source",
    date: '2026-08-01',
    sources: ['https://developer.mozilla.org/fr/docs/Web/API/Document_Object_Model/Events'],
    variantNote: null,
  },
  'fr:resize': {
    concluded: 'redimensionnement',
    superseded: ['redimensionner'],
    why: "'lors du redimensionnement de la fenêtre' is the documented phrasing (MDN fr: 'Désactive le redimensionnement'); the infinitive commands. Confirmed by both passes",
    date: '2026-08-01',
    sources: ['https://developer.mozilla.org/fr/docs/Web/API/Document_Object_Model/Events'],
    variantNote: null,
  },
  'fr:focus': {
    concluded: null,
    superseded: ['focaliser'],
    why: "publish nothing: 'focus' is wholly assimilated French technical jargon (RGAA standardizes 'le focus clavier'; developers write 'donner le focus'), and native alternatives ('la focalisation') are 'overly academic and generally ignored'. 'focaliser' is the infinitive of the ignored form. Single-pass evidence — the audit did not revisit it — but the noun rule independently condemns the current primary",
    date: '2026-08-01',
    sources: [
      'https://fr.scribd.com/document/733601975/Tutoriel-Dynamisez-Vos-Sites-Web-Avec-Javascript',
      'https://www.lycee-rene-cassin-montfort-sur-meu.ac-rennes.fr/sites/lycee-rene-cassin-montfort-sur-meu.ac-rennes.fr/IMG/pdf/javascript.pdf',
    ],
    variantNote:
      "the profile's alternative 'concentrer' is equally unattested for the event and goes with it. Deliberately NOT applied at the 2026-08-01 freeze-lift with the other seven: those were primary/alternative swaps, but 'focaliser' is load-bearing upstream beyond the profile (French tokenizer, event-handler patterns, generated grammar), so publishing nothing means removing French focus vocabulary from hyperscript parsing — an upstream design decision to take to hyperfixi explicitly, not a vocab reorder",
    status: 'pending-upstream',
  },
};

/** Records for one locale, as `[canonical, record]` pairs. */
export function settledFor(code) {
  return Object.entries(SETTLED)
    .filter(([key]) => key.startsWith(`${code}:`))
    .map(([key, rec]) => [key.slice(code.length + 1), rec]);
}

/** True for a record keyed on an attribute name rather than a DOM event. */
export const isAttrKey = canonical => canonical.startsWith('fx-');

/** Effective status/basis, applying the documented defaults. */
export const statusOf = rec => rec.status ?? 'applied';
export const basisOf = rec => rec.basis ?? (rec.sources.length ? 'attested' : 'structural');

/** Decisions concluded but not yet applied, as `[key, rec]` pairs, oldest first. */
export function pendingRecords() {
  return Object.entries(SETTLED)
    .filter(([, rec]) => statusOf(rec) === 'pending-upstream')
    .sort(([, a], [, b]) => a.date.localeCompare(b.date));
}

/**
 * One-line prose rendering, the shape research-brief.mjs puts in front of a
 * reviewer: what we concluded, why, and what to check it against.
 *
 * The three qualifiers are not decoration — each one changes what we are asking
 * the reviewer to do. A pending record is asking them to check a term that is
 * NOT what they will see shipping; a coined one is asking them to break it; a
 * null one is asking whether "nothing" was the right answer.
 */
export function describe(rec) {
  const src = rec.sources.length ? ` [${rec.sources.join(', ')}]` : '';
  const basis = basisOf(rec);
  const head =
    rec.concluded === null
      ? 'concluded: publish no term — authors write the English canonical'
      : `concluded: '${rec.concluded}'`;
  const flags = [];
  if (statusOf(rec) === 'pending-upstream') {
    flags.push(
      `NOT YET SHIPPING — the wrong form ('${rec.superseded[0] ?? '?'}') is still live, ` +
        'because the fix lands in a repo we cannot edit right now'
    );
  }
  if (basis === 'coined') {
    flags.push(
      `coined ${rec.date}, no attested usage existed — any attested term you find replaces it`
    );
  } else if (basis === 'structural') {
    flags.push('decided on structural grounds with no citation — open to challenge');
  }
  const suffix = flags.length ? ` (${flags.join('; ')})` : '';
  return `${head} — ${rec.why}${src}${suffix}`;
}

// `node scripts/settled-terms.mjs` — what is concluded but not yet shipping.
// Cheap to run, and the thing to check before queueing a new wave: a pending
// record means a locale's brief is describing vocabulary that is about to change.
if (import.meta.url === `file://${process.argv[1]}`) {
  const pending = pendingRecords();
  if (!pending.length) {
    console.log('No pending-upstream decisions — everything concluded is shipping.');
  } else {
    console.log(`${pending.length} decision(s) concluded but not yet applied:\n`);
    for (const [key, rec] of pending) {
      console.log(`  ${key}`);
      console.log(`    concluded ${rec.date}: ${rec.concluded ?? '(publish nothing)'}`);
      console.log(`    still shipping: ${rec.superseded[0] ?? '(unknown)'}`);
    }
    console.log('\nSee RESEARCH_PIPELINE.md, "Freeze-lift runbook".');
  }
}
