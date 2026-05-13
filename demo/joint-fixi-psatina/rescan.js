// Joint-demo rescan helper. Ported from lac/lib/rescan.js, adapted for
// Spanish-localized psatina-study: looks for `template[p:datos]` (the
// Spanish entry directive) instead of the canonical `template[p:data]`.
//
// Bridges fixi swaps and psatina's auto-init: when fixi swaps in new
// HTML that contains psatina templates, this listener re-initializes
// them. Marker attribute (data-rescan) keeps it idempotent.
//
// Load order: this script (type=module) must come AFTER psatina-study's
// es.js module in document order, so its initial "mark already-initialized
// templates" pass runs after es.js's auto-init.

import { psatina } from '../../experiments/psatina-study/lib/psatina.js';

const SEL = 'template[p\\:datos]';

document.querySelectorAll(SEL).forEach((t) =>
  t.setAttribute('data-rescan', '')
);

addEventListener('fx:swapped', (e) => {
  const t = e.detail?.cfg?.target;
  const root = t && document.contains(t) ? t : document;
  root.querySelectorAll(`${SEL}:not([data-rescan])`).forEach((tmpl) => {
    tmpl.setAttribute('data-rescan', '');
    psatina(tmpl, tmpl.getAttribute('p:datos') || '{}');
  });
});
