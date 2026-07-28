// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/bengali.ts (events)
//         loka-js/scripts/fx-vocab.mjs (event overrides + props)
// Regenerate: cd loka-js && npm run gen
//
// DOM-keyword vocabulary for the 'bn' locale. Shared between loka-js
// (fixi fx-trigger value translation) and any other consumer that needs
// to translate event or DOM-property names (e.g., psatina-modular's
// p:on:<event> and p:set:<prop> directives).
//
// Maps are localized→canonical; an omitted canonical means identity (use the
// canonical token); the primary localized synonym is listed first per
// canonical (first-wins inversion = preferred form). See README.
//
// Provenance: event names come from the 'bengali' semantic profile,
// except entries overridden in fx-vocab.mjs, which are loka-local.
// ⚠ fixi attribute names for this locale are not native-speaker reviewed.
// Scope: only canonicals on the EVENT_KEYWORDS allowlist in gen-locales.mjs are
// published — see that file for what is in, what is out, and why.
export const events = {
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
};
export const props = {};
