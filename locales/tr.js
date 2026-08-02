// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/turkish.ts (events)
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
//   'turkish' profile (reviewed by that project), except any entry
//   overridden in loka-js/scripts/fx-vocab.mjs, which is loka-local. To
//   suggest corrections, edit fx-vocab.mjs (LOCALES.tr) and regenerate.
window.loka.register('tr', {
  fixi: {
    attrs: {
      'fx-istek': 'fx-action',
      'fx-eylem': 'fx-action',
      'fx-yöntem': 'fx-method',
      'fx-metot': 'fx-method',
      'fx-tetikleyici': 'fx-trigger',
      'fx-hedef': 'fx-target',
      'fx-değiştirme': 'fx-swap',
      'fx-değişim': 'fx-swap',
    },
    events: {
      'tıklama': 'click',
      'tıkla': 'click',
      tiklama: 'click',
      'tık': 'click',
      tik: 'click',
      'değişiklik': 'change',
      'değişim': 'change',
      degisim: 'change',
      'gönderme': 'submit',
      girdi: 'input',
      'giriş': 'input',
      giris: 'input',
      odaklanma: 'focus',
      odak: 'focus',
      'odak kaybı': 'blur',
      'odak kaybi': 'blur',
      'bulanık': 'blur',
      'bulanıklık': 'blur',
      bulanik: 'blur',
      'başlat': 'init',
      'tuşa basma': 'keydown',
      'tusa basma': 'keydown',
      'tuşu bırakma': 'keyup',
      'tusu birakma': 'keyup',
      'fare tuşuna basma': 'mousedown',
      'fare tusuna basma': 'mousedown',
      'fare tuşunu bırakma': 'mouseup',
      'fare tusunu birakma': 'mouseup',
      'üzerine gelme': 'mouseover',
      'uzerine gelme': 'mouseover',
      'dışına çıkma': 'mouseout',
      'disina cikma': 'mouseout',
      'kaydırma': 'scroll',
      kaydirma: 'scroll',
      'kaydır': 'scroll',
      kaydir: 'scroll',
      'yeniden boyutlandırma': 'resize',
      'yeniden boyutlandirma': 'resize',
      'boyutlandırma': 'resize',
      boyutlandirma: 'resize',
      'yükle': 'load',
    },
  },
});
