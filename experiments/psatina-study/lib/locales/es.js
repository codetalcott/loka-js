// Spanish locale for psatina-study.
//
// Adds Spanish-named directives (si, para, datos, en, fijar, iniciar) to
// the canonical templateDirectives Map. Does not remove or replace
// canonical's English directives — both coexist, so a single page can
// use whichever feels natural. After registration, scans for
// `<template p:datos>` (the Spanish entry directive) and inits each one.
//
// This module imports canonical psatina source as-is: there is no fork.
// The same effect could be achieved against the codeberg source if it
// shipped a proper ESM bundle that re-exports templateDirectives (the
// current published bundle drops the export during minification).

import { psatina, templateDirectives } from '../psatina.js'
import { withFunc, ieval, flatMap } from '../common.js'

// Shared DOM-keyword vocabulary, auto-generated from
// @lokascript/semantic profiles + loka-js fx-vocab. Imported here so
// loka-js (fixi) and psatina-study (psatina) share one source of truth
// for clic→click, valor→value, etc.
import { events, props } from '../../../../dom-vocab/es.js'

templateDirectives.set('para', ({ render, data, value, modifiers: [vvar, kvar] }) => {
  let iterable = ieval(value, data)
  return Symbol.iterator in iterable
    ? flatMap(iterable, (v, k) => render({ __proto__: data, [vvar]: v, [kvar]: k }))
    : Object.entries(iterable).flatMap(([k, v]) => render({ __proto__: data, [vvar]: v, [kvar]: k }))
})

templateDirectives.set('si', ({ render, data, value }) =>
  ieval(value, data) ? render(data) : [])

templateDirectives.set('en', ({ render, data, value, modifiers: [eventType] }) =>
  render(data).map(vn => {
    const canonical = events[eventType] || eventType
    vn.properties['on' + canonical] = withFunc(value, 'event').bind(data)
    return vn
  }))

templateDirectives.set('fijar', ({ render, data, value, modifiers: [prop] }) =>
  render(data).map(vn => {
    vn.properties[props[prop] || prop] = ieval(value, data)
    return vn
  }))

templateDirectives.set('iniciar', ({ render, data, value }) =>
  render(data).map(vn => (vn.inits.push(withFunc(value, 'element').bind(data)), vn)))

// 'ref' is already registered by canonical psatina with the same behavior;
// re-registering would just overwrite with an identical implementation. Skip.

templateDirectives.set('datos', ({ render, data, value }) =>
  render(Object.assign(Object.create(data), ieval(value || '{}', data))))

// Canonical psatina only auto-inits `template[p:data]`. Spanish authors
// use `template[p:datos]`, so we scan and init those ourselves.
document.querySelectorAll('template[p\\:datos]').forEach(t =>
  psatina(t, t.getAttribute('p:datos') || '{}'))
