/**
 * 工具箱样式拼装
 *
 * 每个工具原先都在组件顶部手写一遍
 * 「...LAYOUT + card(header/body/…) + input + button + badge + progress + table + treeNode」，
 * 现统一由 baseToolboxStyles() 提供，各工具只补充自己的特有样式。
 */
import { LAYOUT, CARD, BUTTON, INPUT, TABLE, TREE, PROGRESS, BADGE } from '../toolbox-shared';

/** 各工具共用的基础样式集合 */
export function baseToolboxStyles() {
  return {
    ...LAYOUT,
    card: {
      base: CARD.base,
      header: CARD.header,
      headerIcon: CARD.headerIcon,
      headerTitle: CARD.headerTitle,
      headerExtra: CARD.headerExtra,
      headerCount: CARD.headerCount,
      body: CARD.body,
    },
    header: CARD.header,
    body: CARD.body,
    input: INPUT.base,
    button: BUTTON,
    badge: BADGE,
    progress: PROGRESS,
    table: TABLE.base,
    th: TABLE.th,
    thSortable: TABLE.thSortable,
    td: TABLE.td,
    treeNode: TREE.node,
  };
}

/** 基础样式 + 组件特有样式（特有键同名时以后者为准） */
export function buildToolboxStyles<T extends Record<string, any>>(extras: T) {
  return { ...baseToolboxStyles(), ...extras };
}
