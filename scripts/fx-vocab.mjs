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
// Fields:
//   profile        basename of the semantic profile file (without .ts)
//   name           display name for the language
//   reviewed       true if a native speaker has reviewed fixi vocabulary
//   globalsOptIn   if true, emit window.loka.alias calls for {moxi,paxi,rexi}.globals
//                  so localized JS function names land on globalThis. Off by
//                  default to avoid namespace pollution for locales that only
//                  want localized attributes.
//   fixi.attrs     localized HTML attribute name -> canonical English name
//   fixi.events    event-name translations not present in the semantic profile
//                  (some profiles only define focus/blur/init; this fills gaps,
//                  and lets non-fixi consumers like psatina-modular extend the
//                  DOM event vocabulary, e.g., `pulsacion: 'keydown'`)
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
      events: {
        pulsacion: 'keydown',
      },
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
        transicion: 'transition',
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
        'fx-スワップ': 'fx-swap',
      },
      events: {
        クリック: 'click',
        変更: 'change',
        送信: 'submit',
        入力: 'input',
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
        'fx-méthode': 'fx-method',
        'fx-déclencheur': 'fx-trigger',
        'fx-cible': 'fx-target',
        'fx-échange': 'fx-swap',
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
        'fx-tausch': 'fx-swap',
      },
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
        'fx-gatilho': 'fx-trigger',
        'fx-alvo': 'fx-target',
        'fx-troca': 'fx-swap',
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
        'fx-动作': 'fx-action',
        'fx-方法': 'fx-method',
        'fx-触发': 'fx-trigger',
        'fx-目标': 'fx-target',
        'fx-交换': 'fx-swap',
      },
    },
  },

  ko: {
    profile: 'korean',
    name: 'Korean',
    reviewed: false,
    fixi: {
      attrs: {
        'fx-액션': 'fx-action',
        'fx-메소드': 'fx-method',
        'fx-트리거': 'fx-trigger',
        'fx-타겟': 'fx-target',
        'fx-스왑': 'fx-swap',
      },
    },
  },

  tr: {
    profile: 'turkish',
    name: 'Turkish',
    reviewed: false,
    fixi: {
      attrs: {
        'fx-eylem': 'fx-action',
        'fx-yöntem': 'fx-method',
        'fx-tetikleyici': 'fx-trigger',
        'fx-hedef': 'fx-target',
        'fx-değişim': 'fx-swap',
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
    profile: 'hebrew',
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
    fixi: { attrs: {} },
  },
};

/** Locales whose fixi vocabulary has been native-speaker reviewed. */
export const REVIEWED = new Set(
  Object.entries(LOCALES)
    .filter(([, spec]) => spec.reviewed)
    .map(([code]) => code)
);
