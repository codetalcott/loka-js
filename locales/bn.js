// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/bengali.ts (events)
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
//   'bengali' profile (reviewed by that project), except any entry
//   overridden in loka-js/scripts/fx-vocab.mjs, which is loka-local. To
//   suggest corrections, edit fx-vocab.mjs (LOCALES.bn) and regenerate.
window.loka.register('bn', {
  fixi: {
    attrs: {
      'fx-ক্রিয়া': 'fx-action',
      'fx-পদ্ধতি': 'fx-method',
      'fx-ট্রিগার': 'fx-trigger',
      'fx-লক্ষ্য': 'fx-target',
      'fx-অদলবদল': 'fx-swap',
    },
    events: {
      'ক্লিক': 'click',
      'পরিবর্তন': 'change',
      'সাবমিট': 'submit',
      'জমা': 'submit',
      'ইনপুট': 'input',
      'প্রবেশ': 'input',
      'ফোকাস': 'focus',
      'মনোযোগ': 'focus',
      'ঝাপসা': 'blur',
      'ফোকাস_সরান': 'blur',
      'শুরু': 'init',
      'স্ক্রোল': 'scroll',
    },
  },
});
