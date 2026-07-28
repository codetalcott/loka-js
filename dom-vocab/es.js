// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/spanish.ts (events)
//         loka-js/scripts/fx-vocab.mjs (event overrides + props)
// Regenerate: cd loka-js && npm run gen
//
// DOM-keyword vocabulary for the 'es' locale. Shared between loka-js
// (fixi fx-trigger value translation) and any other consumer that needs
// to translate event or DOM-property names (e.g., psatina-modular's
// p:on:<event> and p:set:<prop> directives).
//
// Maps are localized→canonical; an omitted canonical means identity (use the
// canonical token); the primary localized synonym is listed first per
// canonical (first-wins inversion = preferred form). See README.
//
// Provenance: event names come from the 'spanish' semantic profile,
// except entries overridden in fx-vocab.mjs, which are loka-local.
// Scope: only canonicals on the EVENT_KEYWORDS allowlist in gen-locales.mjs are
// published — see that file for what is in, what is out, and why.
export const events = {
  clic: 'click',
  'hacer clic': 'click',
  cambio: 'change',
  cambiar: 'change',
  'envío': 'submit',
  envio: 'submit',
  someter: 'submit',
  entrada: 'input',
  introducir: 'input',
  enfocar: 'focus',
  enfoque: 'focus',
  desenfocar: 'blur',
  desenfoque: 'blur',
  iniciar: 'init',
  inicializar: 'init',
  'tecla abajo': 'keydown',
  'tecla arriba': 'keyup',
  'ratón abajo': 'mousedown',
  'raton abajo': 'mousedown',
  'ratónabajo': 'mousedown',
  'ratón arriba': 'mouseup',
  'raton arriba': 'mouseup',
  'ratónarriba': 'mouseup',
  'ratón encima': 'mouseover',
  'raton encima': 'mouseover',
  'ratón fuera': 'mouseout',
  'raton fuera': 'mouseout',
  desplazar: 'scroll',
  desplazamiento: 'scroll',
  redimensionar: 'resize',
  carga: 'load',
  cargar: 'load',
};
export const props = {
  valor: 'value',
};
