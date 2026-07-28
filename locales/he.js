// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/he.ts (events)
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
//   'he' profile (reviewed by that project), except any entry
//   overridden in loka-js/scripts/fx-vocab.mjs, which is loka-local. To
//   suggest corrections, edit fx-vocab.mjs (LOCALES.he) and regenerate.
window.loka.register('he', {
  fixi: {
    attrs: {
      'fx-פעולה': 'fx-action',
      'fx-שיטה': 'fx-method',
      'fx-מפעיל': 'fx-trigger',
      'fx-יעד': 'fx-target',
      'fx-החלפה': 'fx-swap',
    },
    events: {
      'לחיצה': 'click',
      'קליק': 'click',
      'שינוי': 'change',
      'עדכון': 'change',
      'שליחה': 'submit',
      'הגשה': 'submit',
      'קלט': 'input',
      'הזנה': 'input',
      'מקד': 'focus',
      'התמקד': 'focus',
      'טשטש': 'blur',
      'הסר מיקוד': 'blur',
      'אתחל': 'init',
      'התחל': 'init',
      'גלול': 'scroll',
    },
  },
});
