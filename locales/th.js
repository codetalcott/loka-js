// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/thai.ts (events)
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
//   'thai' profile (reviewed by that project), except any entry
//   overridden in loka-js/scripts/fx-vocab.mjs, which is loka-local. To
//   suggest corrections, edit fx-vocab.mjs (LOCALES.th) and regenerate.
window.loka.register('th', {
  fixi: {
    attrs: {
      'fx-การกระทำ': 'fx-action',
      'fx-วิธี': 'fx-method',
      'fx-ตัวกระตุ้น': 'fx-trigger',
      'fx-เป้าหมาย': 'fx-target',
      'fx-สลับ': 'fx-swap',
    },
    events: {
      'คลิก': 'click',
      'เปลี่ยน': 'change',
      'เปลี่ยนแปลง': 'change',
      'ยื่น': 'submit',
      'ส่งข้อมูล': 'submit',
      'ป้อน': 'input',
      'กรอก': 'input',
      'โฟกัส': 'focus',
      'เบลอ': 'blur',
      'เริ่มต้น': 'init',
      'เลื่อน': 'scroll',
    },
  },
});
