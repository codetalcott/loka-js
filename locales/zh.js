// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/chinese.ts (events)
//         loka-js/scripts/fx-vocab.mjs (fixi attrs + event overrides + per-library vocab)
// Regenerate: cd loka-js && npm run gen
// Conventions: maps are localized→canonical (parse direction). A canonical
//   token absent from a map is intentionally identical to the canonical form
//   (identity mappings are omitted — write the canonical token). Within each
//   canonical group the primary localized form is listed first, so first-wins
//   inversion yields the preferred form to teach/author. Only canonicals on the
//   EVENT_KEYWORDS allowlist in gen-locales.mjs are published — see that file
//   for what is in, what is out, and why.
// ⚠ Unreviewed: fixi attribute names for this locale have not been
//   native-speaker reviewed. Event names come from the @lokascript/semantic
//   'chinese' profile (reviewed by that project), except any entry
//   overridden in loka-js/scripts/fx-vocab.mjs, which is loka-local. To
//   suggest corrections, edit fx-vocab.mjs (LOCALES.zh) and regenerate.
window.loka.register('zh', {
  fixi: {
    attrs: {
      'fx-动作': 'fx-action',
      'fx-方法': 'fx-method',
      'fx-触发': 'fx-trigger',
      'fx-目标': 'fx-target',
      'fx-交换': 'fx-swap',
    },
    events: {
      '点击': 'click',
      '改变': 'change',
      '变化': 'change',
      '提交': 'submit',
      '输入': 'input',
      '聚焦': 'focus',
      '失焦': 'blur',
      '初始化': 'init',
      '滚动': 'scroll',
    },
  },
});
