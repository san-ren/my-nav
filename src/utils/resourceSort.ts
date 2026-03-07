// src/utils/resourceSort.ts

/**
 * 资源状态排序权重
 */
const STATUS_ORDER: Record<string, number> = {
  ok: 0,
  stale: 1,
  '网站超时': 2,
  'github已归档': 3,
  '官网失效': 4,
  '网站失效': 4,
  'github仓库已失效': 4
};

/**
 * 按状态排序资源数组
 * 排序顺序: ok -> stale -> failed
 * 
 * @param resources - 资源数组
 * @returns 排序后的新数组
 */
export function sortResourcesByStatus<T extends { status?: string }>(resources: T[]): T[] {
  if (!resources || !Array.isArray(resources)) return [];
  
  return [...resources].sort((a, b) => {
    const orderA = STATUS_ORDER[a.status] ?? 0;
    const orderB = STATUS_ORDER[b.status] ?? 0;
    return orderA - orderB;
  });
}
