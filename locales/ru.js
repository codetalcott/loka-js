// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/russian.ts (events)
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
//   'russian' profile (reviewed by that project), except any entry
//   overridden in loka-js/scripts/fx-vocab.mjs, which is loka-local. To
//   suggest corrections, edit fx-vocab.mjs (LOCALES.ru) and regenerate.
window.loka.register('ru', {
  fixi: {
    attrs: {
      'fx-действие': 'fx-action',
      'fx-метод': 'fx-method',
      'fx-триггер': 'fx-trigger',
      'fx-цель': 'fx-target',
      'fx-обмен': 'fx-swap',
    },
    events: {
      'клик': 'click',
      'клике': 'click',
      'нажатии': 'click',
      'изменении': 'change',
      'изменение': 'change',
      'отправке': 'submit',
      'отправка': 'submit',
      'вводе': 'input',
      'ввод': 'input',
      'сфокусировать': 'focus',
      'сфокусируй': 'focus',
      'фокус': 'focus',
      'размыть': 'blur',
      'размой': 'blur',
      'инициализировать': 'init',
      'инициализируй': 'init',
      'прокрутить': 'scroll',
      'прокрути': 'scroll',
      'загрузка': 'load',
      'загрузке': 'load',
    },
  },
});
