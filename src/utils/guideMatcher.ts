/**
 * 将字符串转为标准的 Astro Slug 格式（小写，空格换成横杠）
 */
function toSlug(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}

/**
 * 遍历资源列表（支持嵌套结构），根据资源名称自动关联教程 Slug
 * 
 * @param groups 导航分组数据数组
 * @param guides 教程集合数组（使用 entry.slug）
 * @returns 修改后的导航分组数据
 */
export function attachGuidesToResources(groups: any[], guides: any[]) {
  if (!groups || !guides) return groups;

  // 将所有教程的 slug 存入 Map 以便根据多种名称匹配
  // Key 是标准化的名称，Value 是原始的 slug
  const guideMap = new Map<string, string>();
  guides.forEach(g => {
    // 假设 g 是 getCollection('guides') 返回的项，其 slug 是正确的 URL 路径
    const slug = g.slug;
    // 1. 根据 slug 自身匹配 (例如 'claude-code' 匹配 'Claude Code')
    guideMap.set(slug.toLowerCase(), slug);
    // 2. 根据 id/文件名匹配 (不含后缀)
    guideMap.set(toSlug(g.id), slug);
  });

  /**
   * 递归处理资源项
   */
  const processResource = (res: any) => {
    // 如果已经手动设置了 guide_id，我们也要确保它被正确编码或验证（此处保持手动优先）
    if (res.guide_id) {
       // 如果手动填写了 "Claude Code"，尝试转为 slug
       const matchedSlug = guideMap.get(toSlug(res.guide_id));
       if (matchedSlug) res.guide_id = matchedSlug;
       return res;
    }

    // 自动匹配逻辑
    if (res.name) {
      const nameKey = toSlug(res.name);
      const matchedSlug = guideMap.get(nameKey);
      if (matchedSlug) {
        res.guide_id = matchedSlug;
      }
    }
    return res;
  };

  /**
   * 处理分类中的资源
   */
  const processCategory = (cat: any) => {
    if (cat.resources) {
      cat.resources = cat.resources.map(processResource);
    }
    if (cat.tabs) {
      cat.tabs = cat.tabs.map((tab: any) => {
        if (tab.list) {
          tab.list = tab.list.map(processResource);
        }
        return tab;
      });
    }
    return cat;
  };

  // 遍历所有分组
  return groups.map(group => {
    if (group.resources) {
      group.resources = group.resources.map(processResource);
    }
    if (group.categories) {
      group.categories = group.categories.map(processCategory);
    }
    return group;
  });
}
