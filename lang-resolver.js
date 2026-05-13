// Per-element language resolution for the loka family of libraries.
//
// This is an ES module so it can be imported from other libraries that
// adopt the registry-based localization pattern (e.g., psatina-modular).
// The orchestrator.js bundled with loka-js inlines an equivalent function
// (it's a non-module script for fixi-family load-order parity) — keep the
// two in sync; they're only ~10 lines each.
//
// Resolution order (first match wins):
//   1. data-loka-lang attribute on the element itself
//   2. data-loka-lang on any ancestor (closest)
//   3. lang attribute on any ancestor (closest) — HTML standard
//   4. "en" fallback
//
// All results are normalized to the part before the first `-` (`es-MX` -> `es`)
// and lowercased, so callers can index locale registries by 2-letter code.

export const normLang = (s) =>
  s ? s.split('-')[0].toLowerCase() : 'en';

export const langOf = (elt) => {
  const v = elt.getAttribute?.('data-loka-lang');
  if (v) return normLang(v);
  const dx = elt.closest?.('[data-loka-lang]');
  if (dx) return normLang(dx.getAttribute('data-loka-lang'));
  const la = elt.closest?.('[lang]');
  if (la) return normLang(la.getAttribute('lang'));
  return 'en';
};
