// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/hindi.ts (events)
//         loka-js/scripts/fx-vocab.mjs (fixi attrs + event overrides + per-library vocab)
// Regenerate: cd loka-js && npm run gen
// Conventions: maps are localized→canonical (parse direction). A canonical
//   token absent from a map is intentionally identical to the canonical form
//   (identity mappings are omitted — write the canonical token). Within each
//   canonical group the primary localized form is listed first, so first-wins
//   inversion yields the preferred form to teach/author.
// ⚠ Unreviewed: fixi attribute names for this locale have not been
//   native-speaker reviewed. Event-name vocabulary IS reviewed (from
//   @lokascript/semantic profile). To suggest corrections, edit
//   loka-js/scripts/fx-vocab.mjs (LOCALES.hi) and regenerate.
window.loka.register('hi', {
  fixi: {
    attrs: {
      'fx-क्रिया': 'fx-action',
      'fx-विधि': 'fx-method',
      'fx-ट्रिगर': 'fx-trigger',
      'fx-लक्ष्य': 'fx-target',
      'fx-अदला-बदली': 'fx-swap',
    },
    events: {
      'क्लिक': 'click',
      'बदलाव': 'change',
      'परिवर्तन': 'change',
      'सबमिट': 'submit',
      'जमा': 'submit',
      'इनपुट': 'input',
      'फोकस': 'focus',
      'केंद्रित': 'focus',
      'धुंधला': 'blur',
      'फोकस_हटाएं': 'blur',
      'प्रारंभ': 'init',
    },
  },
});
