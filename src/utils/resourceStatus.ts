/**
 * 资源状态 —— 全站唯一真源
 *
 * 三个消费方：
 *   1. 内容集合校验：src/content.config.ts 的 z.enum
 *   2. Keystatic 后台：keystatic.config.tsx 的「资源状态」下拉 + 列表 Emoji
 *   3. 工具箱：Toolbox 各工具的徽章 / 表格 / 排序权重
 *
 * ⚠️ 新增或修改状态时只改这里，其它文件一律 import，不要再写第二份映射表。
 * ⚠️ 本模块会被打进浏览器 bundle（keystatic.config.tsx 与 Toolbox 组件都引用它），
 *    禁止在此引入 node 专用依赖或裸 process.env。
 */

/**
 * 资源状态枚举（顺序与 content.config.ts 原有 z.enum 完全一致）
 * 注意：改动这里等于改动内容集合的 schema，需要清 .astro 缓存重建。
 */
export const RESOURCE_STATUSES = [
  'ok',
  'stale',
  '官网失效',
  'github已归档',
  'github仓库已失效',
  '网站失效',
  '网站超时',
] as const;

export type ResourceStatus = (typeof RESOURCE_STATUSES)[number];

/** Keystatic 后台「资源状态」下拉选项（数组顺序即后台展示顺序） */
export const RESOURCE_STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: '✅ 正常', value: 'ok' },
  { label: '⚠️ 长期未更新', value: 'stale' },
  { label: '📦 github已归档', value: 'github已归档' },
  { label: '❌ github仓库已失效', value: 'github仓库已失效' },
  { label: '❌ 网站失效', value: '网站失效' },
  { label: '⏱️ 网站超时', value: '网站超时' },
  { label: '❌ 官网失效', value: '官网失效' },
];

/**
 * 严重度：数字越大越严重。
 * 页面用它把失效资源排到列表末尾（原 resourceSort.ts 的 STATUS_ORDER）。
 */
const STATUS_SEVERITY: Record<string, number> = {
  ok: 0,
  stale: 1,
  '网站超时': 2,
  'github已归档': 3,
  '官网失效': 4,
  '网站失效': 4,
  'github仓库已失效': 4,
};

/** 状态严重度（未收录的状态按 ok 处理） */
export function getStatusSeverity(status?: string): number {
  return (status && STATUS_SEVERITY[status]) || 0;
}

/**
 * 按状态排序资源数组：ok → stale → 各类失效沉底
 * 返回新数组，不修改入参。
 */
export function sortResourcesByStatus<T extends { status?: string }>(resources: T[]): T[] {
  if (!resources || !Array.isArray(resources)) return [];

  return [...resources].sort((a, b) => getStatusSeverity(a.status) - getStatusSeverity(b.status));
}

/** 状态徽章 / 表格展示元数据 */
export interface StatusMeta {
  text: string;
  color: string;
  bg: string;
}

/**
 * 展示映射表：资源状态 + 工具箱的过程状态（解析 / 检测态）。
 * 新增键时请只加在这一处。
 */
const STATUS_META: Record<string, StatusMeta> = {
  // --- 解析状态（BatchAdder） ---
  pending: { text: '待解析', color: '#64748b', bg: '#f1f5f9' },
  parsing: { text: '解析中...', color: '#2563eb', bg: '#eff6ff' },
  ready: { text: '就绪', color: '#22c55e', bg: '#dcfce7' },
  // --- 资源状态 ---
  ok: { text: '正常', color: '#166534', bg: '#dcfce7' },
  stale: { text: '长期未更新', color: '#92400e', bg: '#fef3c7' },
  '官网失效': { text: '官网失效', color: '#991b1b', bg: '#fee2e2' },
  'github已归档': { text: 'github已归档', color: '#5b21b6', bg: '#ede9fe' },
  'github仓库已失效': { text: 'github仓库已失效', color: '#991b1b', bg: '#fee2e2' },
  '网站失效': { text: '网站失效', color: '#991b1b', bg: '#fee2e2' },
  '网站超时': { text: '网站超时', color: '#92400e', bg: '#fef3c7' },
  // --- 检测状态（LinkChecker / GithubChecker） ---
  timeout: { text: '超时', color: '#92400e', bg: '#fef3c7' },
  excluded: { text: '已排除', color: '#64748b', bg: '#f1f5f9' },
  archived: { text: '已归档', color: '#5b21b6', bg: '#ede9fe' },
  // --- 错误状态 ---
  error: { text: '解析失败', color: '#ef4444', bg: '#fee2e2' },
};

/** 状态徽章（文案 + 前景色 + 背景色，未知状态回退为原文） */
export function getStatusBadge(status: string): StatusMeta {
  return STATUS_META[status] || { text: status, color: '#64748b', bg: '#f1f5f9' };
}

/** 状态文案（未知状态回退为状态原文） */
export function getStatusLabel(status?: string): string {
  if (!status) return '';
  return STATUS_META[status]?.text ?? status;
}

/**
 * 状态 Emoji（仅用于后台列表 itemLabel 前缀）。
 * 未收录的状态返回空串 —— 这是原有行为，不要"顺手补全"。
 */
export function getStatusEmoji(status?: string): string {
  switch (status) {
    case '官网失效':
      return '❌ ';
    case '网站失效':
      return '❌ ';
    case 'stale':
      return '⚠️ ';
    default:
      return '';
  }
}

/**
 * 工具箱排序权重：数字越小越靠前（失效 / 异常优先暴露）。
 * ⚠️ 与页面用的 getStatusSeverity 方向相反，别混用。
 */
export function getStatusWeight(status: string): number {
  const weights: Record<string, number> = {
    '官网失效': 0,
    'github仓库已失效': 0,
    '网站失效': 0,
    archived: 1,
    'github已归档': 1,
    timeout: 2,
    '网站超时': 2,
    stale: 3,
    excluded: 4,
    ok: 5,
  };
  return weights[status] ?? 6;
}
