// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/korean.ts (events)
//         loka-js/scripts/fx-vocab.mjs (event overrides + props)
// Regenerate: cd loka-js && npm run gen
//
// DOM-keyword vocabulary for the 'ko' locale. Shared between loka-js
// (fixi fx-trigger value translation) and any other consumer that needs
// to translate event or DOM-property names (e.g., psatina-modular's
// p:on:<event> and p:set:<prop> directives).
//
// Maps are localized→canonical; an omitted canonical means identity (use the
// canonical token); the primary localized synonym is listed first per
// canonical (first-wins inversion = preferred form). See README.
//
// Provenance: event names come from the 'korean' semantic profile,
// except entries overridden in fx-vocab.mjs, which are loka-local.
// ⚠ fixi attribute names for this locale are not native-speaker reviewed.
// Scope: only canonicals on the EVENT_KEYWORDS allowlist in gen-locales.mjs are
// published — see that file for what is in, what is out, and why.
export const events = {
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
};
export const props = {};
