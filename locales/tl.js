// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/tl.ts (events)
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
//   'tl' profile (reviewed by that project), except any entry
//   overridden in loka-js/scripts/fx-vocab.mjs, which is loka-local. To
//   suggest corrections, edit fx-vocab.mjs (LOCALES.tl) and regenerate.
window.loka.register('tl', {
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
      ituon: 'focus',
      alisin_tuon: 'blur',
      simulan: 'init',
      magsimula: 'init',
      iscroll: 'scroll',
      mag_scroll: 'scroll',
    },
  },
});
