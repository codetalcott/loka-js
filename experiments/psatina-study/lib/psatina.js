// CANONICAL psatina entry point, type-stripped from
// https://codeberg.org/dz4k/psatina/src/branch/main/lib/psatina.ts
// No semantic changes. Auto-init still scans for `template[p:data]` only.
// Locale modules that use a different entry directive (e.g., Spanish
// `p:datos`) call `psatina(template, dataExpr)` directly after their own
// scan — see `locales/es.js`.

import { ieval } from "./common.js"
import { after } from "./noderange.js"
import { morph } from "./morph.js"
import { render } from "./render.js"

export const psatina = (template, dataExpr, targetRange = after(template)) => {
  let data = ieval(dataExpr, template)
  data.idleupdate = (f) =>
    requestIdleCallback(() => data.update(f))
  ~(data.update = async (f) => {
    await f?.()
    morph(targetRange, render(template.content, data))
  })()
}

document.querySelectorAll('template[p\\:data]').forEach(n =>
  psatina(n, n.getAttribute('p:data') || '{}'))

export { templateDirectives } from "./render.js"
