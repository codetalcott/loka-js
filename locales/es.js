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
      'borrar-post': 'soft-delete-post',
      'restaurar-post': 'restore-post',
      'purgar-post': 'purge-post',
      'crear-post': 'create-post',
      'editar-post': 'edit-post',
      'publicar-post': 'publish-post',
      'enviar-comentario': 'submit-comment',
      'abrir-editor': 'open-editor',
      'cerrar-editor': 'close-editor',
      'navegar-inicio': 'navigate-home',
      'alternar-archivo': 'toggle-archive',
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
    conditions: {
      'post.existe': 'post.exists',
      'post.borrado': 'post.soft-deleted',
      'post.restaurado': 'post.restored',
      'post.purgado': 'post.purged',
      'post.actualizado': 'post.updated',
      'post.publicado': 'post.published',
      'post.archivado': 'post.archived',
      'usuario.autenticado': 'user.authenticated',
      'usuario.rol.dueño': 'user.role.owner',
      'usuario.rol.admin': 'user.role.admin',
      'editor.abierto': 'editor.open',
      'feed.actualizado': 'feed.refreshed',
      'suscriptores.notificados': 'subscribers.notified',
    },
  },
  globalsOptIn: true,
});
