// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/hindi.ts (events)
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
//   'hindi' profile (reviewed by that project), except any entry
//   overridden in loka-js/scripts/fx-vocab.mjs, which is loka-local. To
//   suggest corrections, edit fx-vocab.mjs (LOCALES.hi) and regenerate.
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
      'स्क्रॉल': 'scroll',
    },
  },
});
