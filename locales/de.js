// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/german.ts (events)
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
//   'german' profile (reviewed by that project), except any entry
//   overridden in loka-js/scripts/fx-vocab.mjs, which is loka-local. To
//   suggest corrections, edit fx-vocab.mjs (LOCALES.de) and regenerate.
window.loka.register('de', {
  fixi: {
    attrs: {
      'fx-aktion': 'fx-action',
      'fx-methode': 'fx-method',
      'fx-auslöser': 'fx-trigger',
      'fx-ziel': 'fx-target',
      'fx-ersetzung': 'fx-swap',
      'fx-tausch': 'fx-swap',
    },
    events: {
      Klick: 'click',
      Klicken: 'click',
      'Änderung': 'change',
      'Ändern': 'change',
      Absenden: 'submit',
      Senden: 'submit',
      Eingabe: 'input',
      Fokus: 'focus',
      Fokuserhalt: 'focus',
      fokussieren: 'focus',
      Fokusverlust: 'blur',
      verlassen: 'blur',
      defokussieren: 'blur',
      entfokussieren: 'blur',
      Initialisierung: 'init',
      initialisieren: 'init',
      'taste gedrückt': 'keydown',
      'taste losgelassen': 'keyup',
      'maustaste gedrückt': 'mousedown',
      'maustaste losgelassen': 'mouseup',
      scrollen: 'scroll',
      'Größenänderung': 'resize',
      'größenänderung': 'resize',
      'grössenänderung': 'resize',
      'Größe ändern': 'resize',
      'größeändern': 'resize',
      geladen: 'load',
    },
  },
});
