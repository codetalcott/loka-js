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
  enfoque: 'focus',
  enfocar: 'focus',
  'pérdida de foco': 'blur',
  'perdida de foco': 'blur',
  desenfoque: 'blur',
  desenfocar: 'blur',
  inicio: 'init',
  'inicialización': 'init',
  iniciar: 'init',
  inicializar: 'init',
  'tecla pulsada': 'keydown',
  'tecla presionada': 'keydown',
  'tecla abajo': 'keydown',
  'tecla soltada': 'keyup',
  'tecla liberada': 'keyup',
  'tecla arriba': 'keyup',
  'ratón pulsado': 'mousedown',
  'raton pulsado': 'mousedown',
  'mouse presionado': 'mousedown',
  'ratón abajo': 'mousedown',
  'raton abajo': 'mousedown',
  'ratónabajo': 'mousedown',
  'ratón soltado': 'mouseup',
  'raton soltado': 'mouseup',
  'mouse soltado': 'mouseup',
  'ratón arriba': 'mouseup',
  'raton arriba': 'mouseup',
  'ratónarriba': 'mouseup',
  'ratón encima': 'mouseover',
  'raton encima': 'mouseover',
  'mouse encima': 'mouseover',
  'ratón fuera': 'mouseout',
  'raton fuera': 'mouseout',
  'mouse fuera': 'mouseout',
  desplazamiento: 'scroll',
  desplazar: 'scroll',
  'cambio de tamaño': 'resize',
  'cambio de tamano': 'resize',
  redimensionar: 'resize',
  carga: 'load',
  cargar: 'load',
};
export const props = {
  valor: 'value',
};
