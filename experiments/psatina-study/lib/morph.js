// CANONICAL psatina source, type-stripped from
// https://codeberg.org/dz4k/psatina/src/branch/main/lib/morph.ts
// No semantic changes.

import { COMMENT_NODE, ELEMENT_NODE, TEXT_NODE } from "./common.js"
import { children, done, first, insertBehind, next } from "./noderange.js"

/* terminology: we mutate the _destination tree_ (`dst`)
 * to become like the _source tree_ (`src`)
 * preconditions: both trees must have elements as roots.
 * the destination tree must be connected to the document
 * or a shadow root.
 * both trees should have unique ids, both within themselves
 * and within the rest of the document/shadow root.
 * (the same id can occur within both trees, though.)
 * warning: this will remove the source node from the document
 * and mutate it in unspecified ways
 */

export const morph = (dst, src) => {
  let focused = document.activeElement

  let stash = Object.assign(
    document.createElement('div'),
    { hidden: true, className: 'murph-stash' }
  )
  ~(dst.root.body ?? dst.root).append(stash)

  morphNodes(stash, dst, src)

  focused?.focus?.()
  stash.remove()
}

const morphNode = (stash, dst, src) => {
  if (dst.nodeType !== src.nodeType) {
    const real = realize(stash, src)
    dst.parentNode.replaceChild(real, dst)
    return real
  } else if (src.nodeType === 1) {
    return morphElement(stash, dst, src)
  } else if (src.nodeType === 3 || src.nodeType === 8) {
    if (dst.nodeValue !== src.nodeValue) dst.nodeValue = src.nodeValue
    return dst
  }
  throw "unreachable"
}

const morphElement = (stash, dst, src) => {
  morphNodes(stash, children(dst), src.childNodes)
  if (dst.tagName === src.tagName && dst.id === (src.attributes.id ?? "")) {
    morphAttributesAndProperties(dst, src)
    return dst
  } else {
    let real = realize(stash, src)
    real.replaceChildren(...dst.children)
    dst.replaceWith(real)
    return real
  }
}

const morphAttributesAndProperties = (dst, src) => {
  for (const [name, value] of Object.entries(src.attributes))
    if (dst.getAttribute(name) !== value) dst.setAttribute(name, value)
  for (const { name } of [...dst.attributes])
    if (!(name in src.attributes)) dst.removeAttribute(name)
  for (const prop in src.properties) {
    // event handler properties for custom events
    if (prop.startsWith('on') && !(prop in dst))
      dst.addEventListener(prop.slice(2), (e) => dst[prop]?.(e))
    if (dst[prop] !== src.properties[prop]) dst[prop] = src.properties[prop]
  }
}

const morphNodes = (stash, dst, src) => {
  let d = first(dst)
  for (let s of src) {
    let match = null
    let id = s.attributes?.id
    if (id) match = dst.root.getElementById(id)
    // [TODO] Possible to avoid making "find best dst node" O(n)?
    // This makes the overall match operation O(n^2).
    // Nanomorph seems not to worry about it.
    else for (let m = d; !done(dst, m) && !match; m = next(dst, m))
      if (decentMatch(m, s)) match = m
    if (match) d = next(dst, morphNode(stash, insertBehind(dst, d, match), s))
    else d = next(dst, insertBehind(dst, d, realize(stash, s)))
  }
  while (!done(dst, d)) { let v = d; d = next(dst, d); stash.append(v) }
}

const decentMatch = (a, b) =>
  a.nodeType === b.nodeType && (
    b.nodeType !== 1 || (
      a.tagName === b.tagName &&
      a.id === ""
    )
  )

const realize = (stash, src) => {
  if (src.nodeType === ELEMENT_NODE) {
    const el = document.createElement(src.tagName)
    morphAttributesAndProperties(el, src)
    morphNodes(stash, children(el), src.childNodes)
    src.inits.forEach(init => init(el))
    return el
  }
  if (src.nodeType === TEXT_NODE) return document.createTextNode(src.nodeValue)
  if (src.nodeType === COMMENT_NODE) return document.createComment(src.nodeValue)
  throw "unreachable"
}
