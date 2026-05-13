// CANONICAL psatina source, type-stripped from
// https://codeberg.org/dz4k/psatina/src/branch/main/lib/noderange.ts
// No semantic changes.

export const getRoot = (node) => {
  let result = node.getRootNode()
  if (result instanceof Element) return document
  return result
}

export const children = (parent) => ({ parent, start: null, end: null, root: getRoot(parent) })

export const after = (start) => ({ parent: start.parentNode, start, end: start.nextSibling, root: getRoot(start.parentNode) })

export const first = ({ start, parent }) => start ? start.nextSibling : parent.firstChild

export const next = (_, current) => current?.nextSibling ?? null

export const done = ({ end }, current) => current === end || !current

const tryMoveBefore = (parent, newChild, refChild) => {
  try { parent.moveBefore(newChild, refChild) }
  catch (e) { parent.insertBefore(newChild, refChild) }
}

export const insertBehind = ({ parent, end }, current, newChild) => {
  if (current === newChild) return newChild
  if (current === null) tryMoveBefore(parent, newChild, end)
  else tryMoveBefore(parent, newChild, current)
  return newChild
}
