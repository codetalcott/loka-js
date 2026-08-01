// Per-library, per-locale vocabulary for loka-js.
//
// Each locale entry has library-agnostic metadata (profile, name, reviewed)
// plus per-library sub-objects (`fixi`, `moxi`, `ssexi`, `paxi`, `rexi`)
// and shared DOM-keyword vocab (props). The generator at
// scripts/gen-locales.mjs reads this file alongside the semantic profile
// and emits both locales/{code}.js (calls window.loka.register) and
// dom-vocab/{code}.js (shared events+props for psatina-modular etc.).
//
// Reviewed locales (fixi attrs): es, ja, ar. Others are best-effort and
// warrant native-speaker review. The per-library `reviewed` flag inside
// each library's vocab tracks library-specific review status — a locale
// can have reviewed fixi vocab but unreviewed paxi vocab.
//
// Two conventions the generator and every downstream consumer rely on
// (also documented in each generated file's header and in the README,
// "Consuming the vocabulary data"):
//
//   1. Identity mappings are OMITTED. If a canonical token (e.g. 'fx-action'
//      for French, where "action" is already French) is absent from a
//      locale's map, it is intentionally identical to the canonical form —
//      authors write the canonical token. `en` is empty for this reason.
//      The generator's stripIdentity() drops any k===v pair, so never rely
//      on a missing key meaning "unsupported"; it means "identity".
//
//   2. Primary-first ordering. Within each canonical group, list the PRIMARY
//      localized form before its alternatives (e.g. Spanish click → 'clic'
//      before 'hacer clic'). Profile-derived events already arrive in this
//      order; keep hand-authored `events`/attr entries primary-first too.
//      Consumers that invert a parse map and take first-wins recover the
//      preferred form. test/vocab-ordering.mjs guards this invariant.
//
// Fields:
//   profile        basename of the semantic profile file (without .ts)
//   name           display name for the language
//   reviewed       true if a native speaker has reviewed fixi vocabulary
//   globalsOptIn   if true, emit window.loka.alias calls for {moxi,paxi,rexi}.globals
//                  so localized JS function names land on globalThis. Off by
//                  default to avoid namespace pollution for locales that only
//                  want localized attributes.
//   fixi.attrs     localized HTML attribute name -> canonical English name
//   fixi.events    event-name translations genuinely ABSENT from the semantic
//                  profile — ja/ar/ms/tl/sw profiles define no click/change/
//                  submit/input, so those four are supplied here. Not for
//                  overriding vocabulary the profile already has: the profile
//                  is the source of truth, and a hand-authored entry that
//                  shadows it creates two disagreeing vocabularies. (This field
//                  once carried `pulsacion: 'keydown'` on the belief that the
//                  Spanish profile lacked keydown; it did not — the entry was
//                  being filtered out by EVENT_KEYWORDS, and loka shipped
//                  `pulsacion` while semantic parsed `tecla abajo`. Retired.)
//                  Canonicals must be on the EVENT_KEYWORDS allowlist in
//                  gen-locales.mjs; the generator throws otherwise.
//   paxi.swaps     localized fx-swap value -> canonical (e.g., `morfar: 'morph'`)
//   paxi.globals   localized JS global -> canonical (e.g., `morfar: 'morph'`)
//   paxi.reviewed  true if paxi vocab has been native-speaker reviewed
//   props          localized DOM property name -> canonical (e.g., `valor: 'value'`).
//                  Currently used by psatina-modular's p:set:<prop> directive.
//                  fixi does not consume `props`.

/**
 * @typedef {{
 *   profile: string,
 *   name: string,
 *   reviewed: boolean,
 *   globalsOptIn?: boolean,
 *   fixi: {
 *     attrs: Record<string, string>,
 *     events?: Record<string, string>,
 *   },
 *   paxi?: {
 *     reviewed?: boolean,
 *     swaps?: Record<string, string>,
 *     globals?: Record<string, string>,
 *   },
 *   rexi?: {
 *     reviewed?: boolean,
 *     globals?: Record<string, string>,
 *   },
 *   ssexi?: {
 *     reviewed?: boolean,
 *     events?: Record<string, string>,
 *   },
 *   moxi?: {
 *     reviewed?: boolean,
 *     attrs?: Record<string, string>,      // 'vivo': 'live', 'al-': 'on-', 'mx-ignorar': 'mx-ignore'
 *     modifiers?: Record<string, string>,  // dotted modifiers: 'prevenir': 'prevent'
 *     globals?: Record<string, string>,
 *   },
 *   affordances?: {                        // see GRAIL_HTML_BINDING.md (v0.3)
 *     reviewed?: boolean,
 *     intents?: Record<string, string>,    // 'borrar-post': 'soft-delete-post'
 *     classes?: Record<string, string>,    // 'borrar': 'delete'
 *     conditions?: Record<string, string>, // 'post.existe': 'post.exists'
 *   },
 *   props?: Record<string, string>,
 * }} LocaleSpec
 */

/** @type {Record<string, LocaleSpec>} */
export const LOCALES = {
  en: {
    profile: 'english',
    name: 'English',
    reviewed: true,
    fixi: { attrs: {} },
  },

  es: {
    profile: 'spanish',
    name: 'Spanish',
    reviewed: true,
    globalsOptIn: true,
    fixi: {
      attrs: {
        'fx-acción': 'fx-action',
        'fx-método': 'fx-method',
        'fx-disparador': 'fx-trigger',
        'fx-objetivo': 'fx-target',
        'fx-intercambio': 'fx-swap',
      },
      // No `events` override: the Spanish profile is the sole source. It
      // defines every canonical on the allowlist, keydown included
      // (`tecla abajo`).
    },
    paxi: {
      reviewed: true,
      swaps: { morfar: 'morph' },
      globals: { morfar: 'morph' },
    },
    rexi: {
      reviewed: false,
      globals: {
        obtener: 'get',
        publicar: 'post',
        poner: 'put',
        parchear: 'patch',
        cabecera: 'head',
        eliminar: 'del',
      },
    },
    ssexi: {
      reviewed: false,
      events: {
        abrir: 'open',
        mensaje: 'message',
        intercambiado: 'swapped',
        cerrar: 'close',
        // 'error' is identical in both languages; stripIdentity drops it.
      },
    },
    moxi: {
      reviewed: false,
      attrs: {
        vivo: 'live',
        'al-': 'on-',
        'mx-ignorar': 'mx-ignore',
      },
      modifiers: {
        prevenir: 'prevent',
        detener: 'stop',
        parar: 'halt',
        // 'unavez' fused 'una vez'; Spanish invariably writes it as two words in
        // exactly this context (Alpine/Vue Spanish docs, lenguajejs on the
        // addEventListener `once` option). The hyphen is not a compromise —
        // moxi splits modifiers out of the attribute name and lookup collapses
        // hyphens to a space, so `.una-vez` resolves identically. Old spelling
        // retained as a parse alternative.
        'una-vez': 'once',
        unavez: 'once',
        mismo: 'self',
        fuera: 'outside',
        captura: 'capture',
        pasivo: 'passive',
        // 'cc' is technical (camelCase conversion); stays English.
      },
      globals: {
        consulta: 'q',
        esperar: 'wait',
        // Globals are aliased by EXACT property name (loka.js `collectAliases`),
        // and the event-lookup normalizer that folds case and separators does not
        // apply here — nor does it fold accents anywhere. So a Spanish author who
        // correctly writes `transición()` got a ReferenceError while the shipped
        // fx-acción and fx-método carried their accents. Register both spellings.
        'transición': 'transition',
        transicion: 'transition',
      },
    },
    // GRAIL HTML binding vocabulary (see GRAIL_HTML_BINDING.md, v0.3).
    // Three tables:
    //   - intents:    free-form per application (we seed common ones).
    //   - classes:    the canonical taxonomy (read/create/update/delete/...).
    //   - conditions: condition names used in preconditions/effects. Both
    //                 fields share this table since they're drawn from
    //                 the same naming space.
    // Dropped from v0.2: reversibilities, authorities, effect-taxonomy —
    // these are representable via GRAIL primitives (e.g., authority is a
    // precondition like `user.role.admin`; reversibility is the existence
    // of a paired affordance with linked conditions).
    affordances: {
      reviewed: false,
      intents: {
        // tiny-CMS demo intents
        'borrar-post': 'soft-delete-post',
        'restaurar-post': 'restore-post',
        'purgar-post': 'purge-post',
        'crear-post': 'create-post',
        'editar-post': 'edit-post',
        'publicar-post': 'publish-post',
        'enviar-comentario': 'submit-comment',
        'abrir-editor': 'open-editor',
        'cerrar-editor': 'close-editor',
        'navegar-inicio': 'navigate-home',
        'alternar-archivo': 'toggle-archive',
        'buscar': 'search',
        // incident-response intents (matches grail-domains/incident_response affordance names)
        'reconocer-incidente': 'acknowledge',
        'clasificar-severidad': 'classify-severity',
        'asignar-responsable': 'assign-owner',
        'investigar-incidente': 'investigate',
        'mitigar-incidente': 'mitigate',
        'verificar-salud': 'verify-health',
        'notificar-interesados': 'notify-stakeholders',
        'escribir-postmortem': 'write-postmortem',
        'crear-acciones': 'create-actions',
        'resolver-incidente': 'resolve-incident',
      },
      classes: {
        leer: 'read',
        crear: 'create',
        actualizar: 'update',
        borrar: 'delete',
        navegar: 'navigate',
        buscar: 'search',
        alternar: 'toggle',
        abrir: 'open',
        cerrar: 'close',
      },
      conditions: {
        // tiny-CMS demo predicates
        'post.existe': 'post.exists',
        'post.borrado': 'post.soft-deleted',
        'post.restaurado': 'post.restored',
        'post.purgado': 'post.purged',
        'post.actualizado': 'post.updated',
        'post.publicado': 'post.published',
        'post.archivado': 'post.archived',
        // user / role predicates
        'usuario.autenticado': 'user.authenticated',
        'usuario.rol.dueño': 'user.role.owner',
        'usuario.rol.admin': 'user.role.admin',
        // UI / system predicates
        'editor.abierto': 'editor.open',
        'feed.actualizado': 'feed.refreshed',
        'suscriptores.notificados': 'subscribers.notified',
        // incident-response predicates (matches grail-domains/incident_response condition names)
        'incidente.alerta.recibida': 'incident.alert.received',
        'incidente.reconocido': 'incident.acknowledged',
        'incidente.severidad.clasificada': 'incident.severity.classified',
        'incidente.responsable.asignado': 'incident.owner.assigned',
        'incidente.investigado': 'incident.investigated',
        'incidente.mitigado': 'incident.mitigated',
        'incidente.salud.verificada': 'incident.health.verified',
        'incidente.interesados.notificados': 'incident.stakeholders.notified',
        'incidente.postmortem.escrito': 'incident.postmortem.written',
        'incidente.acciones.creadas': 'incident.actions.created',
        'incidente.resuelto': 'incident.resolved',
      },
    },
    props: {
      valor: 'value',
    },
  },

  ja: {
    profile: 'japanese',
    name: 'Japanese',
    reviewed: true,
    fixi: {
      attrs: {
        'fx-アクション': 'fx-action',
        'fx-メソッド': 'fx-method',
        'fx-トリガー': 'fx-trigger',
        'fx-ターゲット': 'fx-target',
        // 置換 promoted over スワップ 2026-07-28 (Japanese terminology review).
        // スワップ is a real IT loanword, but in Japanese it means memory or
        // financial swapping — no Japanese source uses it for DOM content
        // replacement, and both Japanese htmx write-ups reach for 置換/挿入方式.
        // スワップ stays as a parse alias for authors coming from English fixi.
        'fx-置換': 'fx-swap',
        'fx-スワップ': 'fx-swap',
      },
      // The 'japanese' profile defines none of these as keywords, so they are
      // supplied here rather than shadowing it. The four form events predate the
      // research; the rest were published 2026-07-28 after the Japanese
      // terminology review verified them against informal Japanese usage.
      //
      // Two upstream proposals in @lokascript/semantic's aspirational
      // eventNameTranslations table were rejected there: マウス押下 (押下 is
      // genuine but SIer spec-document register — beginners look it up) is kept
      // only as a trailing parse alias, and マウス解放 is not published at all
      // (解放 is freeing a resource — memory, locks — never a mouse button; an
      // exact-phrase search finds no use of it in the event sense).
      events: {
        クリック: 'click',
        変更: 'change',
        送信: 'submit',
        入力: 'input',
        キーダウン: 'keydown',
        キーアップ: 'keyup',
        マウスダウン: 'mousedown',
        マウス押下: 'mousedown',
        マウスアップ: 'mouseup',
        マウスオーバー: 'mouseover',
        マウスアウト: 'mouseout',
        サイズ変更: 'resize',
        リサイズ: 'resize',
        読み込み: 'load',
        ロード: 'load',
      },
    },
  },

  ar: {
    profile: 'arabic',
    name: 'Arabic',
    reviewed: true,
    fixi: {
      attrs: {
        'fx-إجراء': 'fx-action',
        'fx-طريقة': 'fx-method',
        'fx-محفز': 'fx-trigger',
        'fx-هدف': 'fx-target',
        'fx-تبديل': 'fx-swap',
      },
      events: {
        نقر: 'click',
        تغيير: 'change',
        إرسال: 'submit',
        إدخال: 'input',
      },
    },
  },

  fr: {
    profile: 'french',
    name: 'French',
    reviewed: false,
    fixi: {
      attrs: {
        // fx-action is deliberately ABSENT: 'action' is a native French noun
        // spelled identically to the canonical, so identity omission
        // (convention 1) IS the decision — settled as fr:fx-action. The
        // 2026-07-30 audit's recommendation to "publish action" is the same
        // outcome; its CONTRADICTED verdict misread the convention.
        'fx-méthode': 'fx-method',
        'fx-déclencheur': 'fx-trigger',
        'fx-cible': 'fx-target',
        // 'échange' implies a bidirectional trade between co-equal entities
        // (and "FX swap" is entrenched financial French); a hypermedia swap
        // destructively replaces — French DOM writing says 'remplacement'
        // (Node.replaceChild = remplacer l'enfant). Same replace-not-exchange
        // convergence as de/ko/zh/ja/tr. Old form kept as a parse alias.
        'fx-remplacement': 'fx-swap',
        'fx-échange': 'fx-swap',
      },
      // Absent from the French profile. Upstream's 'touche bas'/'touche haut'
      // must never ship: they are the standardized French names of the Down
      // and Up ARROW KEYS, so a reader would bind the event to one specific
      // key. The state phrases 'touche enfoncée'/'touche relâchée' parallel
      // es 'tecla pulsada', de 'taste gedrückt', pt 'tecla pressionada'.
      // ASCII twins registered because accents do not fold.
      //
      // 'survol' is the universal French hover noun ('état au survol').
      // mouseout/mousedown/mouseup deliberately publish NOTHING — the audit's
      // proposed tokens (fin de survol, appui souris, relâchement souris) are
      // unattested as identifiers and French is not a coinage locale; see the
      // fr:mouseout / fr:mousedown / fr:mouseup settled records.
      events: {
        'touche enfoncée': 'keydown',
        'touche enfoncee': 'keydown',
        'touche relâchée': 'keyup',
        'touche relachee': 'keyup',
        survol: 'mouseover',
      },
    },
  },

  de: {
    profile: 'german',
    name: 'German',
    reviewed: false,
    fixi: {
      attrs: {
        'fx-aktion': 'fx-action',
        'fx-methode': 'fx-method',
        'fx-auslöser': 'fx-trigger',
        'fx-ziel': 'fx-target',
        // 'Tausch' is a reciprocal barter — both sides give something up, which
        // is not what a swap does to the DOM. The German htmx introduction
        // (INNOQ) calls hx-swap's job 'die Ersetzung' and its options
        // 'Ersetzungsstrategie'. 'fx-tausch' stays as a parse alias.
        'fx-ersetzung': 'fx-swap',
        'fx-tausch': 'fx-swap',
      },
      // The German profile defines none of these. 'runter'/'hoch' (the upstream
      // aspirational forms) are colloquial directional adverbs that no German
      // developer would write as an identifier; SelfHTML's own keyboard tutorial
      // names its handlers TasteGedrückt / TasteLosgelassen, and MediaEvent
      // describes mouseup as 'wenn der Mausbutton losgelassen wird'. Maustaste
      // rather than Maus separates the peripheral from the button being pressed.
      //
      // `load` is 'geladen', not 'laden' (which collides with der Laden, the
      // shop) and not 'Ladung' (cargo, or an electrical charge).
      //
      // mouseover/mouseout are deliberately ABSENT — see the note below the
      // events table.
      events: {
        'taste gedrückt': 'keydown',
        'taste losgelassen': 'keyup',
        'maustaste gedrückt': 'mousedown',
        'maustaste losgelassen': 'mouseup',
        geladen: 'load',
      },
      // mouseover / mouseout: no German term published, so an author writes the
      // canonical English token (identity — see convention 1 at the top of this
      // file). This is a decision, not a gap. The literal glosses 'maus über' /
      // 'maus heraus' appear only in prose explaining the English word to
      // beginners; German developers say 'hovern' and write the English
      // identifiers. Publishing a synthetic token here would be the one case
      // where localizing costs the learner more than it gives — it isolates
      // them from CSS :hover and from every tutorial they will read next.
    },
  },

  it: {
    profile: 'italian',
    name: 'Italian',
    reviewed: false,
    fixi: {
      attrs: {
        'fx-azione': 'fx-action',
        'fx-metodo': 'fx-method',
        'fx-attivatore': 'fx-trigger',
        'fx-destinazione': 'fx-target',
        'fx-scambio': 'fx-swap',
      },
    },
  },

  pt: {
    profile: 'portuguese',
    name: 'Portuguese',
    reviewed: false,
    fixi: {
      attrs: {
        'fx-ação': 'fx-action',
        'fx-método': 'fx-method',
        // 'acionador'/'disparador' are what tutorials use for the verb; 'gatilho'
        // stays primary as the established noun (SQL triggers, DOM triggers).
        'fx-gatilho': 'fx-trigger',
        'fx-acionador': 'fx-trigger',
        'fx-disparador': 'fx-trigger',
        // 'destino' is the more common word for a request target in pt prose.
        'fx-alvo': 'fx-target',
        'fx-destino': 'fx-target',
        'fx-troca': 'fx-swap',
        'fx-substituição': 'fx-swap',
      },
      // Absent from the Portuguese profile. The upstream aspirational forms
      // ('tecla baixo', 'tecla cima') were spatial calques of the English
      // down/up; Portuguese describes the state of the key. pt-PT prefers
      // 'liberada'/'libertada' over 'solta' for keys, and 'rato' for the mouse —
      // registered as aliases rather than a separate locale.
      //
      // 'carregar' is deliberately NOT published for `load`: in European
      // Portuguese 'carregar (em)' means to press a button, so a Lisbon reader
      // would parse fx-gatilho="carregar" as a click. 'carregamento' means
      // loading in both variants.
      events: {
        'tecla pressionada': 'keydown',
        'tecla solta': 'keyup',
        'tecla liberada': 'keyup',
        'tecla libertada': 'keyup',
        'mouse sobre': 'mouseover',
        'rato sobre': 'mouseover',
        'passar o mouse': 'mouseover',
        'saída do mouse': 'mouseout',
        'saída do rato': 'mouseout',
        'mouse fora': 'mouseout',
        carregamento: 'load',
      },
    },
  },

  ru: {
    profile: 'russian',
    name: 'Russian',
    reviewed: false,
    fixi: {
      attrs: {
        'fx-действие': 'fx-action',
        'fx-метод': 'fx-method',
        'fx-триггер': 'fx-trigger',
        'fx-цель': 'fx-target',
        'fx-обмен': 'fx-swap',
      },
    },
  },

  uk: {
    profile: 'ukrainian',
    name: 'Ukrainian',
    reviewed: false,
    fixi: {
      attrs: {
        'fx-дія': 'fx-action',
        'fx-метод': 'fx-method',
        'fx-тригер': 'fx-trigger',
        'fx-ціль': 'fx-target',
        'fx-обмін': 'fx-swap',
      },
    },
  },

  zh: {
    profile: 'chinese',
    name: 'Chinese',
    reviewed: false,
    fixi: {
      attrs: {
        // 动作 means a physical movement/gesture — it translates the English word
        // "action", not the concept (an endpoint URL). No Chinese source calls a
        // request target a 动作; the docs say 地址 / 请求地址 / URL. Old form kept
        // as a parse alternative.
        'fx-地址': 'fx-action',
        'fx-请求地址': 'fx-action',
        'fx-动作': 'fx-action',
        'fx-方法': 'fx-method',
        'fx-触发': 'fx-trigger',
        'fx-目标': 'fx-target',
        // 交换 is a symmetrical exchange (A and B trade places); a swap
        // unidirectionally replaces the target's subtree. Chinese DOM writing
        // says 替换. 交换 kept as a parse alias — it is what the community htmx
        // cheatsheet translation uses (交换策略), so early adopters may have
        // learned it.
        'fx-替换': 'fx-swap',
        'fx-交换': 'fx-swap',
      },
      // Absent from the Chinese profile. Each pairs a device with the mechanical
      // state, which is how MDN zh-CN phrases them ('按键按下的时候',
      // '按键被松开时触发'). 键入 was rejected upstream-side: it means "type in"
      // and implies a character was produced, but keydown fires for Shift and
      // Alt too. 松键 was a back-formation with zero attestation.
      //
      // mouseover is 移入 and NOT 进入: Chinese tutorials reserve 进入/离开 for
      // the non-bubbling mouseenter/mouseleave pair, and that contrast is how
      // bubbling gets taught. Using 进入 here would erase the distinction.
      //
      // 滑鼠-/載入 are the Taiwan/HK forms, registered as aliases rather than a
      // zh-Hant fork.
      events: {
        '按键按下': 'keydown',
        '按下': 'keydown',
        '按键松开': 'keyup',
        '按键抬起': 'keyup',
        '鼠标按下': 'mousedown',
        '滑鼠按下': 'mousedown',
        '鼠标松开': 'mouseup',
        '滑鼠放開': 'mouseup',
        '鼠标抬起': 'mouseup',
        '鼠标移入': 'mouseover',
        '滑鼠移入': 'mouseover',
        '鼠标移出': 'mouseout',
        '滑鼠移出': 'mouseout',
        // 调整大小 is imperative ("adjust the size"); the event observes a change.
        '尺寸变化': 'resize',
        '调整大小': 'resize',
        '加载': 'load',
        '載入': 'load',
      },
    },
  },

  ko: {
    profile: 'korean',
    name: 'Korean',
    reviewed: false,
    fixi: {
      attrs: {
        // 액션 in Korean is overwhelmingly the film/performance sense and has no
        // attested use for a request URL. Korean tutorials keep English `action`
        // and gloss the concept as 주소 / '전송할 위치(URL)'. Old form kept as a
        // parse alternative.
        'fx-주소': 'fx-action',
        'fx-액션': 'fx-action',
        // 메서드 is the National Institute of Korean Language transcription of
        // [meθəd] and what javascript.info ko and MDN ko use. 메소드 survives in
        // general usage mainly from 메소드 연기 (method acting) subtitles; kept as
        // a parse alias.
        'fx-메서드': 'fx-method',
        'fx-메소드': 'fx-method',
        'fx-트리거': 'fx-trigger',
        // 타깃 is the prescriptive transcription, but unlike 메서드 it never won:
        // developers type 타겟. Primary follows usage, 타깃 parses.
        'fx-타겟': 'fx-target',
        'fx-타깃': 'fx-target',
        // 스왑 in Korean is the finance sense, or the two-variable exchange
        // (교체 연산) — bidirectional either way. A hypermedia swap replaces, so
        // 교체 leads. 스왑 kept as a parse alias.
        'fx-교체': 'fx-swap',
        'fx-스왑': 'fx-swap',
      },
      // Absent from the Korean profile. All six are phonetic loanwords, and the
      // review found them well attested in Hangul on Tistory/Velog — 키다운 and
      // 키업 unusually so, because Hangul IME composition forces Korean
      // developers to reason about raw key events far more than English-speaking
      // ones do. 마우스오버/마우스아웃 are paired constantly when teaching the
      // bubbling difference against mouseenter/mouseleave.
      //
      // resize and load are NOT published: the review could not verify 리사이즈
      // or 로드 in Hangul event contexts from any accessible source and returned
      // UNSUPPORTED rather than agreeing. Publishing on intuition alone is what
      // this pipeline exists to stop.
      events: {
        '키다운': 'keydown',
        '키업': 'keyup',
        '마우스다운': 'mousedown',
        '마우스업': 'mouseup',
        '마우스오버': 'mouseover',
        '마우스아웃': 'mouseout',
      },
    },
  },

  tr: {
    profile: 'turkish',
    name: 'Turkish',
    reviewed: false,
    fixi: {
      attrs: {
        // 'eylem' translated the English word ("deed/act"), not the concept —
        // an endpoint URL. Turkish developers universally write 'istek' /
        // 'İstek Adresi' for the request target, and 'hedef' is taken by
        // fx-target. Old form kept as a parse alias.
        'fx-istek': 'fx-action',
        'fx-eylem': 'fx-action',
        // 'metot' is the entrenched loanword register (HTTP metodu); 'yöntem'
        // stays primary as the pedagogical form our audience reads.
        'fx-yöntem': 'fx-method',
        'fx-metot': 'fx-method',
        'fx-tetikleyici': 'fx-trigger',
        'fx-hedef': 'fx-target',
        // 'değişim' (-im) is the intransitive noun of systemic change and
        // collided with the `change` event's accepted alternative; 'değiştirme'
        // (-me on the causative stem) is the transitive act of replacing —
        // which is what a swap does to the DOM. Old form kept as a parse alias.
        'fx-değiştirme': 'fx-swap',
        'fx-değişim': 'fx-swap',
      },
      // Absent from the Turkish profile. The upstream aspirational forms were
      // fused compounds (tuşbasma, fareiçinde) that violate Turkish orthography
      // and are attested nowhere; the pedagogical forms are multi-word noun
      // phrases, legal in both positions because lookup collapses space/hyphen
      // runs. ASCII twins are registered because ı/ş/ü/ç do not fold — the
      // profile does the same (giris, kaydir, bulanik).
      //
      // mouseover/mouseout are the weakest pair: the gerunds are derived from
      // descriptive tutorial prose ('nesne üzerine gelme', 'dışına
      // çıktığımızda') rather than found as standalone tokens — the 2026-07-30
      // audit's own limitation note. Open to challenge next wave.
      events: {
        'tuşa basma': 'keydown',
        'tusa basma': 'keydown',
        'tuşu bırakma': 'keyup',
        'tusu birakma': 'keyup',
        'fare tuşuna basma': 'mousedown',
        'fare tusuna basma': 'mousedown',
        'fare tuşunu bırakma': 'mouseup',
        'fare tusunu birakma': 'mouseup',
        'üzerine gelme': 'mouseover',
        'uzerine gelme': 'mouseover',
        'dışına çıkma': 'mouseout',
        'disina cikma': 'mouseout',
        // The attested form carries 'yeniden' ("again") — bare 'boyutlandırma'
        // is the initial dimensioning, kept as a close-miss parse alias.
        'yeniden boyutlandırma': 'resize',
        'yeniden boyutlandirma': 'resize',
        'boyutlandırma': 'resize',
        'boyutlandirma': 'resize',
      },
    },
  },

  pl: {
    profile: 'polish',
    name: 'Polish',
    reviewed: false,
    fixi: {
      attrs: {
        'fx-akcja': 'fx-action',
        'fx-metoda': 'fx-method',
        'fx-wyzwalacz': 'fx-trigger',
        'fx-cel': 'fx-target',
        'fx-zamiana': 'fx-swap',
      },
    },
  },

  vi: {
    profile: 'vietnamese',
    name: 'Vietnamese',
    reviewed: false,
    fixi: {
      attrs: {
        'fx-hành-động': 'fx-action',
        'fx-phương-thức': 'fx-method',
        'fx-kích-hoạt': 'fx-trigger',
        'fx-mục-tiêu': 'fx-target',
        'fx-hoán-đổi': 'fx-swap',
      },
    },
  },

  he: {
    profile: 'he',
    name: 'Hebrew',
    reviewed: false,
    fixi: {
      attrs: {
        'fx-פעולה': 'fx-action',
        'fx-שיטה': 'fx-method',
        'fx-מפעיל': 'fx-trigger',
        'fx-יעד': 'fx-target',
        'fx-החלפה': 'fx-swap',
      },
    },
  },

  hi: {
    profile: 'hindi',
    name: 'Hindi',
    reviewed: false,
    fixi: {
      attrs: {
        'fx-क्रिया': 'fx-action',
        'fx-विधि': 'fx-method',
        'fx-ट्रिगर': 'fx-trigger',
        'fx-लक्ष्य': 'fx-target',
        'fx-अदला-बदली': 'fx-swap',
      },
    },
  },

  bn: {
    profile: 'bengali',
    name: 'Bengali',
    reviewed: false,
    fixi: {
      attrs: {
        'fx-ক্রিয়া': 'fx-action',
        'fx-পদ্ধতি': 'fx-method',
        'fx-ট্রিগার': 'fx-trigger',
        'fx-লক্ষ্য': 'fx-target',
        'fx-অদলবদল': 'fx-swap',
      },
    },
  },

  id: {
    profile: 'indonesian',
    name: 'Indonesian',
    reviewed: false,
    fixi: {
      attrs: {
        'fx-aksi': 'fx-action',
        'fx-metode': 'fx-method',
        'fx-pemicu': 'fx-trigger',
        'fx-tukar': 'fx-swap',
      },
    },
  },

  ms: {
    profile: 'ms',
    name: 'Malay',
    reviewed: false,
    fixi: {
      attrs: {
        'fx-tindakan': 'fx-action',
        'fx-kaedah': 'fx-method',
        'fx-pencetus': 'fx-trigger',
        'fx-sasaran': 'fx-target',
        'fx-tukar': 'fx-swap',
      },
      events: {
        klik: 'click',
        ubah: 'change',
        hantar: 'submit',
        input: 'input',
      },
    },
  },

  th: {
    profile: 'thai',
    name: 'Thai',
    reviewed: false,
    fixi: {
      attrs: {
        'fx-การกระทำ': 'fx-action',
        'fx-วิธี': 'fx-method',
        'fx-ตัวกระตุ้น': 'fx-trigger',
        'fx-เป้าหมาย': 'fx-target',
        'fx-สลับ': 'fx-swap',
      },
    },
  },

  tl: {
    profile: 'tl',
    name: 'Tagalog',
    reviewed: false,
    fixi: {
      attrs: {
        'fx-aksyon': 'fx-action',
        'fx-pamamaraan': 'fx-method',
        'fx-pampukaw': 'fx-trigger',
        'fx-palit': 'fx-swap',
      },
      events: {
        'i-click': 'click',
        baguhin: 'change',
        ipasa: 'submit',
        ilagay: 'input',
      },
    },
  },

  sw: {
    profile: 'swahili',
    name: 'Swahili',
    reviewed: false,
    fixi: {
      attrs: {
        'fx-kitendo': 'fx-action',
        'fx-mbinu': 'fx-method',
        'fx-kichocheo': 'fx-trigger',
        'fx-lengo': 'fx-target',
        'fx-badilisha': 'fx-swap',
      },
      events: {
        bofya: 'click',
        badilisha: 'change',
        wasilisha: 'submit',
        ingiza: 'input',
      },
    },
  },

  qu: {
    profile: 'quechua',
    name: 'Quechua',
    reviewed: false,
    // fixi attrs intentionally empty: no reviewed Quechua attribute-name
    // translations are available yet, so Quechua authors use the canonical
    // fx-* names. Event vocabulary IS localized (from the semantic profile).
    // Deliberate stub, not an oversight — the generator emits a banner noting
    // this so an empty attrs block isn't mistaken for a generation bug.
    fixi: { attrs: {} },
  },
};

/** Locales whose fixi vocabulary has been native-speaker reviewed. */
export const REVIEWED = new Set(
  Object.entries(LOCALES)
    .filter(([, spec]) => spec.reviewed)
    .map(([code]) => code)
);
