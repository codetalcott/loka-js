// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/arabic.ts (events)
//         loka-js/scripts/fx-vocab.mjs (fixi attrs + event overrides + per-library vocab)
// Regenerate: cd loka-js && npm run gen
// Conventions: maps are localized→canonical (parse direction). A canonical
//   token absent from a map is intentionally identical to the canonical form
//   (identity mappings are omitted — write the canonical token). Within each
//   canonical group the primary localized form is listed first, so first-wins
//   inversion yields the preferred form to teach/author. Only canonicals on the
//   EVENT_KEYWORDS allowlist in gen-locales.mjs are published — see that file
//   for what is in, what is out, and why.
window.loka.register('ar', {
  fixi: {
    attrs: {
      'fx-إجراء': 'fx-action',
      'fx-طريقة': 'fx-method',
      'fx-محفز': 'fx-trigger',
      'fx-هدف': 'fx-target',
      'fx-تبديل': 'fx-swap',
    },
    events: {
      'نقر': 'click',
      'تغيير': 'change',
      'إرسال': 'submit',
      'إدخال': 'input',
      'تركيز': 'focus',
      'ركز': 'focus',
      'ضبابية': 'blur',
      'شوش': 'blur',
      'تهيئة': 'init',
      'بدء': 'init',
      'مرر': 'scroll',
      'تمرير': 'scroll',
    },
  },
});
