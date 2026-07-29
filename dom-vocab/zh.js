// AUTO-GENERATED — do not edit by hand.
// Source: hyperfixi/packages/semantic/src/generators/profiles/chinese.ts (events)
//         loka-js/scripts/fx-vocab.mjs (event overrides + props)
// Regenerate: cd loka-js && npm run gen
//
// DOM-keyword vocabulary for the 'zh' locale. Shared between loka-js
// (fixi fx-trigger value translation) and any other consumer that needs
// to translate event or DOM-property names (e.g., psatina-modular's
// p:on:<event> and p:set:<prop> directives).
//
// Maps are localized→canonical; an omitted canonical means identity (use the
// canonical token); the primary localized synonym is listed first per
// canonical (first-wins inversion = preferred form). See README.
//
// Provenance: event names come from the 'chinese' semantic profile,
// except entries overridden in fx-vocab.mjs, which are loka-local.
// ⚠ fixi attribute names for this locale are not native-speaker reviewed.
// Scope: only canonicals on the EVENT_KEYWORDS allowlist in gen-locales.mjs are
// published — see that file for what is in, what is out, and why.
export const events = {
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
};
export const props = {};
