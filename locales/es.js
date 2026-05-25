// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/spanish.ts (events)
//         loka-js/scripts/fx-vocab.mjs (fixi attrs + event overrides + per-library vocab)
// Regenerate: cd loka-js && npm run gen
window.loka.register('es', {
  fixi: {
    attrs: {
      'fx-acción': 'fx-action',
      'fx-método': 'fx-method',
      'fx-disparador': 'fx-trigger',
      'fx-objetivo': 'fx-target',
      'fx-intercambio': 'fx-swap',
    },
    events: {
      clic: 'click',
      'hacer clic': 'click',
      cambio: 'change',
      cambiar: 'change',
      'envío': 'submit',
      envio: 'submit',
      someter: 'submit',
      entrada: 'input',
      introducir: 'input',
      enfocar: 'focus',
      enfoque: 'focus',
      desenfocar: 'blur',
      desenfoque: 'blur',
      iniciar: 'init',
      inicializar: 'init',
      pulsacion: 'keydown',
    },
  },
  paxi: {
    swaps: {
      morfar: 'morph',
    },
    globals: {
      morfar: 'morph',
    },
  },
  rexi: {
    globals: {
      obtener: 'get',
      publicar: 'post',
      poner: 'put',
      parchear: 'patch',
      cabecera: 'head',
      eliminar: 'del',
    },
  },
  ssexi: {
    events: {
      abrir: 'open',
      mensaje: 'message',
      intercambiado: 'swapped',
      cerrar: 'close',
    },
  },
  moxi: {
    attrs: {
      vivo: 'live',
      'al-': 'on-',
      'mx-ignorar': 'mx-ignore',
    },
    modifiers: {
      prevenir: 'prevent',
      detener: 'stop',
      parar: 'halt',
      unavez: 'once',
      mismo: 'self',
      fuera: 'outside',
      captura: 'capture',
      pasivo: 'passive',
    },
    globals: {
      consulta: 'q',
      esperar: 'wait',
      transicion: 'transition',
    },
  },
  affordances: {
    intents: {
      'borrar-post': 'delete-post',
      'crear-post': 'create-post',
      'editar-post': 'edit-post',
      'enviar-comentario': 'submit-comment',
      'abrir-editor': 'open-editor',
      'cerrar-editor': 'close-editor',
      'navegar-inicio': 'navigate-home',
      buscar: 'search',
    },
    classes: {
      leer: 'read',
      crear: 'create',
      actualizar: 'update',
      borrar: 'delete',
      navegar: 'navigate',
      buscar: 'search',
      alternar: 'toggle',
      abrir: 'open',
      cerrar: 'close',
    },
    confirms: {
      ninguno: 'none',
      suave: 'soft',
      'aprobación-humana': 'human-approval',
      reautenticar: 'reauth',
    },
    reversibilities: {
      suave: 'soft',
      duro: 'hard',
      'ventana-temporal': 'time-window',
    },
    authorities: {
      'anónimo': 'anonymous',
      autenticado: 'authenticated',
      'dueño': 'owner',
    },
    effects: {
      ninguno: 'none',
      'estado-cliente': 'client-state',
      'estado-servidor': 'server-state',
      externo: 'external',
    },
  },
  globalsOptIn: true,
});
