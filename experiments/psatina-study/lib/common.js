// CANONICAL psatina source, type-stripped from
// https://codeberg.org/dz4k/psatina/src/branch/main/lib/common.ts
// No semantic changes. See ../README.md for why this is vendored.

export const { TEXT_NODE, COMMENT_NODE, ELEMENT_NODE, DOCUMENT_FRAGMENT_NODE } = Node

export const withFunc = (body, ...args) =>
  new Function(...args, `with(this)return(${body})`)

export const ieval = (expr, data) =>
  withFunc(expr).call(data)

export const flatMap = (xs, f) => {
  let rv = [], i = 0
  for (let x of xs) for (let o of f(x, i++)) rv.push(o)
  return rv
}
