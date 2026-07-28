// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/vietnamese.ts (events)
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
//   'vietnamese' profile (reviewed by that project), except any entry
//   overridden in loka-js/scripts/fx-vocab.mjs, which is loka-local. To
//   suggest corrections, edit fx-vocab.mjs (LOCALES.vi) and regenerate.
window.loka.register('vi', {
  fixi: {
    attrs: {
      'fx-hành-động': 'fx-action',
      'fx-phương-thức': 'fx-method',
      'fx-kích-hoạt': 'fx-trigger',
      'fx-mục-tiêu': 'fx-target',
      'fx-hoán-đổi': 'fx-swap',
    },
    events: {
      'nhấp': 'click',
      'bấm': 'click',
      'thay đổi': 'change',
      'đổi': 'change',
      'nộp': 'submit',
      'nhập': 'input',
      'nhập liệu': 'input',
      'tập trung': 'focus',
      'mất tập trung': 'blur',
      'khởi tạo': 'init',
      'cuộn': 'scroll',
    },
  },
});
