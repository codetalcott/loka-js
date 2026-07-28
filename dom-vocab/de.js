// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/german.ts (events)
//         loka-js/scripts/fx-vocab.mjs (event overrides + props)
// Regenerate: cd loka-js && npm run gen
//
// DOM-keyword vocabulary for the 'de' locale. Shared between loka-js
// (fixi fx-trigger value translation) and any other consumer that needs
// to translate event or DOM-property names (e.g., psatina-modular's
// p:on:<event> and p:set:<prop> directives).
//
// Maps are localized→canonical; an omitted canonical means identity (use the
// canonical token); the primary localized synonym is listed first per
// canonical (first-wins inversion = preferred form). See README.
//
// Provenance: event names come from the 'german' semantic profile,
// except entries overridden in fx-vocab.mjs, which are loka-local.
// ⚠ fixi attribute names for this locale are not native-speaker reviewed.
// Scope: only canonicals on the EVENT_KEYWORDS allowlist in gen-locales.mjs are
// published — see that file for what is in, what is out, and why.
export const events = {
  Klick: 'click',
  Klicken: 'click',
  'Änderung': 'change',
  'Ändern': 'change',
  Absenden: 'submit',
  Senden: 'submit',
  Eingabe: 'input',
  fokussieren: 'focus',
  defokussieren: 'blur',
  entfokussieren: 'blur',
  initialisieren: 'init',
  scrollen: 'scroll',
  'Größenänderung': 'resize',
  'größenänderung': 'resize',
  'Größe ändern': 'resize',
  'größeändern': 'resize',
};
export const props = {};
