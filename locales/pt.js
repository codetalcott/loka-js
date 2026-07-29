// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/portuguese.ts (events)
//         loka-js/scripts/fx-vocab.mjs (fixi attrs + event overrides + per-library vocab)
// Regenerate: cd loka-js && npm run gen
// Conventions: maps are localized→canonical (parse direction). A canonical
//   token absent from a map is intentionally identical to the canonical form
//   (identity mappings are omitted — write the canonical token). Within each
//   canonical group the primary localized form is listed first, so first-wins
//   inversion yields the preferred form to teach/author. Only canonicals on the
//   EVENT_KEYWORDS allowlist in gen-locales.mjs are published — see that file
//   for what is in, what is out, and why.
// ⚠ Unreviewed: fixi attribute names for this locale have not been
//   native-speaker reviewed. Event names come from the @lokascript/semantic
//   'portuguese' profile (reviewed by that project), except any entry
//   overridden in loka-js/scripts/fx-vocab.mjs, which is loka-local. To
//   suggest corrections, edit fx-vocab.mjs (LOCALES.pt) and regenerate.
window.loka.register('pt', {
  fixi: {
    attrs: {
      'fx-ação': 'fx-action',
      'fx-método': 'fx-method',
      'fx-gatilho': 'fx-trigger',
      'fx-acionador': 'fx-trigger',
      'fx-disparador': 'fx-trigger',
      'fx-alvo': 'fx-target',
      'fx-destino': 'fx-target',
      'fx-troca': 'fx-swap',
      'fx-substituição': 'fx-swap',
    },
    events: {
      clique: 'click',
      clicar: 'click',
      'alteração': 'change',
      'mudança': 'change',
      envio: 'submit',
      submeter: 'submit',
      'submissão': 'submit',
      entrada: 'input',
      'inserção': 'input',
      foco: 'focus',
      focar: 'focus',
      'perda de foco': 'blur',
      desfocar: 'blur',
      'inicialização': 'init',
      iniciar: 'init',
      inicializar: 'init',
      'tecla pressionada': 'keydown',
      'tecla solta': 'keyup',
      'tecla liberada': 'keyup',
      'tecla libertada': 'keyup',
      'mouse pressionado': 'mousedown',
      'rato pressionado': 'mousedown',
      'mouse baixo': 'mousedown',
      mouseBaixo: 'mousedown',
      'mouse solto': 'mouseup',
      'mouse liberado': 'mouseup',
      'rato libertado': 'mouseup',
      'mouse cima': 'mouseup',
      mouseCima: 'mouseup',
      'mouse sobre': 'mouseover',
      'rato sobre': 'mouseover',
      'passar o mouse': 'mouseover',
      'saída do mouse': 'mouseout',
      'saída do rato': 'mouseout',
      'mouse fora': 'mouseout',
      rolagem: 'scroll',
      rolar: 'scroll',
      deslocamento: 'scroll',
      redimensionamento: 'resize',
      redimensionar: 'resize',
      carregamento: 'load',
    },
  },
});
