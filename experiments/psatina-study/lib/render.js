// CANONICAL psatina source, type-stripped from
// https://codeberg.org/dz4k/psatina/src/branch/main/lib/render.ts
// No semantic changes. The built-in directives (for, if, on, set, init,
// ref, data) are registered exactly as upstream does. Locale modules add
// additional directives to the same Map after this file loads.

import { COMMENT_NODE, DOCUMENT_FRAGMENT_NODE, ELEMENT_NODE, flatMap, ieval, TEXT_NODE, withFunc } from "./common.js"

const interpolate = (str, data) =>
  str.replace(/\[\|(.*)\|\]/g, (_, expr) => ieval(expr, data))

export const templateDirectives = new Map()

export const render = (template, data, donelist = []) => {
  let { nodeType, nodeValue } = template
  if (nodeType === TEXT_NODE || nodeType === COMMENT_NODE)
    return [{ nodeType, nodeValue: interpolate(nodeValue, data) }]

  if (nodeType === DOCUMENT_FRAGMENT_NODE)
    return flatMap(template.childNodes, n => render(n, data))

  if (nodeType === ELEMENT_NODE) {
    let element = template
    let { tagName } = element
    let attributes = {}
    let properties = {}

    for (let attr of element.attributes) {
      let { name, value } = attr
      if (name.startsWith('p:')) {
        if (donelist.includes(attr)) continue
        let donelist_ = donelist.concat(attr)
        let [, directive, ...modifiers] = name.split(':')
        let dir = templateDirectives.get(directive)
        if (dir) return dir({
          modifiers,
          value,
          element,
          data,
          render: element instanceof HTMLTemplateElement
            ? (data => flatMap(
                element.content.childNodes,
                element => render(element, data, [])
              ))
            : (data => render(element, data, donelist_)),
        })
      }
      else attributes[name] = interpolate(value, data)
    }

    let childNodes = flatMap(element.childNodes, n => render(n, data))

    return [{ nodeType, tagName, attributes, properties, childNodes, inits: [] }]
  }

  throw new Error(`Unsupported node type: ${nodeType}`)
}

templateDirectives.set('for', ({
  render, data, value,
  modifiers: [vvar, kvar]
}) => {
  let iterable = ieval(value, data)
  return Symbol.iterator in iterable
    ? flatMap(iterable, (v, k) =>
        render({ __proto__: data, [vvar]: v, [kvar]: k }))
    : Object.entries(iterable).flatMap(([k, v]) =>
        render({ __proto__: data, [vvar]: v, [kvar]: k }))
})

templateDirectives.set('if', ({ render, data, value }) =>
  ieval(value, data) ? render(data) : [])

templateDirectives.set('on', ({ render, data, value, modifiers: [eventType] }) =>
  render(data).map(vn => {
    vn.properties['on' + eventType] = withFunc(value, 'event').bind(data)
    return vn
  }))

templateDirectives.set('set', ({ render, data, value, modifiers: [prop] }) =>
  render(data).map(vn => {
    vn.properties[prop] = ieval(value, data)
    return vn
  }))

templateDirectives.set('init', ({ render, data, value }) =>
  render(data)
    .map(vn => (vn.inits.push(withFunc(value, 'element').bind(data)), vn)))

templateDirectives.set('ref', ({ render, data, value }) =>
  render(data)
    .map(vn => (vn.inits.push(
      el => data[value] = el
    ), vn)))

templateDirectives.set('data', ({ render, data, value }) =>
  render(Object.assign(Object.create(data), ieval(value || '{}', data))))
