// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/korean.ts (events)
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
//   'korean' profile (reviewed by that project), except any entry
//   overridden in loka-js/scripts/fx-vocab.mjs, which is loka-local. To
//   suggest corrections, edit fx-vocab.mjs (LOCALES.ko) and regenerate.
window.loka.register('ko', {
  fixi: {
    attrs: {
      'fx-주소': 'fx-action',
      'fx-액션': 'fx-action',
      'fx-메서드': 'fx-method',
      'fx-메소드': 'fx-method',
      'fx-트리거': 'fx-trigger',
      'fx-타겟': 'fx-target',
      'fx-타깃': 'fx-target',
      'fx-교체': 'fx-swap',
      'fx-스왑': 'fx-swap',
    },
    events: {
      '클릭': 'click',
      '변경': 'change',
      '제출': 'submit',
      '입력': 'input',
      '포커스': 'focus',
      '포커스아웃': 'blur',
      '블러': 'blur',
      '초기화': 'init',
      '키다운': 'keydown',
      '키업': 'keyup',
      '마우스다운': 'mousedown',
      '마우스업': 'mouseup',
      '마우스오버': 'mouseover',
      '마우스아웃': 'mouseout',
      '스크롤': 'scroll',
    },
  },
});
