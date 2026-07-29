// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/chinese.ts (events)
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
//   'chinese' profile (reviewed by that project), except any entry
//   overridden in loka-js/scripts/fx-vocab.mjs, which is loka-local. To
//   suggest corrections, edit fx-vocab.mjs (LOCALES.zh) and regenerate.
window.loka.register('zh', {
  fixi: {
    attrs: {
      'fx-地址': 'fx-action',
      'fx-请求地址': 'fx-action',
      'fx-动作': 'fx-action',
      'fx-方法': 'fx-method',
      'fx-触发': 'fx-trigger',
      'fx-目标': 'fx-target',
      'fx-替换': 'fx-swap',
      'fx-交换': 'fx-swap',
    },
    events: {
      '点击': 'click',
      '变化': 'change',
      '改变': 'change',
      '提交': 'submit',
      '送出': 'submit',
      '输入': 'input',
      '聚焦': 'focus',
      '取得焦點': 'focus',
      '失焦': 'blur',
      '失去焦點': 'blur',
      '初始化': 'init',
      '按键按下': 'keydown',
      '按下': 'keydown',
      '按键松开': 'keyup',
      '按键抬起': 'keyup',
      '鼠标按下': 'mousedown',
      '滑鼠按下': 'mousedown',
      '鼠标松开': 'mouseup',
      '滑鼠放開': 'mouseup',
      '鼠标抬起': 'mouseup',
      '鼠标移入': 'mouseover',
      '滑鼠移入': 'mouseover',
      '鼠标移出': 'mouseout',
      '滑鼠移出': 'mouseout',
      '滚动': 'scroll',
      '捲動': 'scroll',
      '尺寸变化': 'resize',
      '调整大小': 'resize',
      '加载': 'load',
      '載入': 'load',
    },
  },
});
