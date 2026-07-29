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

  // ── Publish-nothing conclusions ──────────────────────────────────────────
  // `concluded: null`. These look like gaps in the data and are not: someone
  // looked, found nothing worth shipping, and decided the English canonical is
  // what an author should write. Recorded so the next brief does not re-ask, and
  // so vocab-ordering asserts the absence rather than trusting a comment.
  'ko:resize': {
    concluded: null,
    superseded: [],
    why: "the review returned UNSUPPORTED rather than agreeing — its sources for 리사이즈 were inaccessible and no Hangul usage could be verified in a DOM-event context. Publishing on intuition is what this pipeline exists to stop",
    date: '2026-07-28',
    sources: [],
    variantNote: 'revisit with Tistory/Velog evidence; 리사이즈 is plausible but unverified',
  },
  'ko:load': {
    concluded: null,
    superseded: [],
    why: "same as ko:resize — no snippet showed whether Korean developers write 로드, 페이지 로드 or the native 불러오기 for the event",
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
