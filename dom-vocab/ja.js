// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/japanese.ts (events)
//         loka-js/scripts/fx-vocab.mjs (event overrides + props)
// Regenerate: cd loka-js && npm run gen
//
// DOM-keyword vocabulary for the 'ja' locale. Shared between loka-js
// (fixi fx-trigger value translation) and any other consumer that needs
// to translate event or DOM-property names (e.g., psatina-modular's
// p:on:<event> and p:set:<prop> directives).
//
// Maps are localized→canonical; an omitted canonical means identity (use the
// canonical token); the primary localized synonym is listed first per
// canonical (first-wins inversion = preferred form). See README.
//
// Provenance: event names come from the 'japanese' semantic profile,
// except entries overridden in fx-vocab.mjs, which are loka-local.
// Scope: only canonicals on the EVENT_KEYWORDS allowlist in gen-locales.mjs are
// published — see that file for what is in, what is out, and why.
export const events = {
  'クリック': 'click',
  '変更': 'change',
  '送信': 'submit',
  '入力': 'input',
  'フォーカス': 'focus',
  '集中': 'focus',
  'ぼかし': 'blur',
  'フォーカス解除': 'blur',
  'ブラー': 'blur',
  '初期化': 'init',
  'イニット': 'init',
  'スクロール': 'scroll',
};
export const props = {};
