// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/italian.ts (events)
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
//   'italian' profile (reviewed by that project), except any entry
//   overridden in loka-js/scripts/fx-vocab.mjs, which is loka-local. To
//   suggest corrections, edit fx-vocab.mjs (LOCALES.it) and regenerate.
window.loka.register('it', {
  fixi: {
    attrs: {
      'fx-azione': 'fx-action',
      'fx-metodo': 'fx-method',
      'fx-attivatore': 'fx-trigger',
      'fx-destinazione': 'fx-target',
      'fx-scambio': 'fx-swap',
    },
    events: {
      clic: 'click',
      clicca: 'click',
      cambio: 'change',
      cambiamento: 'change',
      invio: 'submit',
      sottomettere: 'submit',
      inserimento: 'input',
      focalizzare: 'focus',
      sfuocare: 'blur',
      inizializzare: 'init',
      inizia: 'init',
      scorrere: 'scroll',
      ridimensiona: 'resize',
      carica: 'load',
      caricamento: 'load',
    },
  },
});
