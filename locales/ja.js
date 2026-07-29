// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/japanese.ts (events)
//         loka-js/scripts/fx-vocab.mjs (fixi attrs + event overrides + per-library vocab)
// Regenerate: cd loka-js && npm run gen
// Conventions: maps are localized→canonical (parse direction). A canonical
//   token absent from a map is intentionally identical to the canonical form
//   (identity mappings are omitted — write the canonical token). Within each
//   canonical group the primary localized form is listed first, so first-wins
//   inversion yields the preferred form to teach/author. Only canonicals on the
//   EVENT_KEYWORDS allowlist in gen-locales.mjs are published — see that file
//   for what is in, what is out, and why.
window.loka.register('ja', {
  fixi: {
    attrs: {
      'fx-アクション': 'fx-action',
      'fx-メソッド': 'fx-method',
      'fx-トリガー': 'fx-trigger',
      'fx-ターゲット': 'fx-target',
      'fx-置換': 'fx-swap',
      'fx-スワップ': 'fx-swap',
    },
    events: {
      'クリック': 'click',
      '変更': 'change',
      '送信': 'submit',
      '入力': 'input',
      'フォーカス': 'focus',
      'フォーカス解除': 'blur',
      'フォーカスアウト': 'blur',
      'ブラー': 'blur',
      'ぼかし': 'blur',
      '初期化': 'init',
      'キーダウン': 'keydown',
      'キーアップ': 'keyup',
      'マウスダウン': 'mousedown',
      'マウス押下': 'mousedown',
      'マウスアップ': 'mouseup',
      'マウスオーバー': 'mouseover',
      'マウスアウト': 'mouseout',
      'スクロール': 'scroll',
      'サイズ変更': 'resize',
      'リサイズ': 'resize',
      '読み込み': 'load',
      'ロード': 'load',
    },
  },
});
