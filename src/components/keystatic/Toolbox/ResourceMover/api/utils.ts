// ResourceMover API 工具函数
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG, type ResourceItem, type ResourceLocation, type TargetLocation, type ScanResult, type FileInfo, type CategoryInfo, type TabInfo } from '../types';

const sanitizeFilePart = (value: string): string => value.replace(/[\\/]/g, '-').trim();
const safeTrim = (value: string | undefined | null): string => (value ?? '').toString().trim();

// 扫描所有资源
export function scanAllResources(): ScanResult {
  const contentDir = path.join(process.cwd(), CONFIG.contentDir);
  const files: FileInfo[] = [];
  let totalResources = 0;
  
  if (!fs.existsSync(contentDir)) {
    return { files: [], totalResources: 0 };
  }
  
  const jsonFiles = fs.readdirSync(contentDir).filter(f => f.endsWith('.json'));
  
  for (const file of jsonFiles) {
    const filePath = path.join(contentDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(content);
      
      const pageName = json.pageName || 'unknown';
      const groupName = json.name || file.replace('.json', '');
      
      const categories: CategoryInfo[] = [];
      
      if (json.categories && Array.isArray(json.categories)) {
        for (const category of json.categories) {
          const catInfo: CategoryInfo = {
            name: category.name || '未命名分类',
            resourceCount: 0,
            tabs: [],
          };
          
          // 统计顶部资源
          if (category.resources && Array.isArray(category.resources)) {
            catInfo.resourceCount += category.resources.length;
            totalResources += category.resources.length;
          }
          
          // 统计tab中的资源
          if (category.tabs && Array.isArray(category.tabs)) {
            for (const tab of category.tabs) {
              const tabInfo: TabInfo = {
                name: tab.tabName || '未命名Tab',
                resourceCount: tab.list ? tab.list.length : 0,
              };
              catInfo.tabs.push(tabInfo);
              catInfo.resourceCount += tabInfo.resourceCount;
              totalResources += tabInfo.resourceCount;
            }
          }
          
          categories.push(catInfo);
        }
      }
      
      files.push({
        file,
        pageName,
        groupName,
        categories,
      });
    } catch (e) {
      console.error(`[ResourceMover] 解析文件失败: ${file}`, e);
    }
  }
  
  return { files, totalResources };
}

// 获取资源详情列表
export function getResourceList(file: string, categoryName: string, tabIndex?: number): ResourceItem[] {
  const contentDir = path.join(process.cwd(), CONFIG.contentDir);
  const filePath = path.join(contentDir, file);
  const resources: ResourceItem[] = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(content);
    
    const pageName = json.pageName || 'unknown';
    const groupName = json.name || file.replace('.json', '');
    
    if (!json.categories || !Array.isArray(json.categories)) {
      return [];
    }
    
    const categoryIndex = json.categories.findIndex((c: any) => c.name === categoryName);
    if (categoryIndex === -1) return [];
    
    const category = json.categories[categoryIndex];
    
    // 如果指定了tab索引，获取tab中的资源
    if (tabIndex !== undefined && category.tabs && category.tabs[tabIndex]) {
      const tab = category.tabs[tabIndex];
      if (tab.list && Array.isArray(tab.list)) {
        tab.list.forEach((item: any, index: number) => {
          resources.push({
            id: `${file}--${categoryName}--tab-${tabIndex}--${index}`,
            type: 'card',
            name: item.name || '未命名',
            url: item.url,
            location: {
              file,
              pageName,
              groupName,
              categoryName,
              tabIndex,
              tabName: tab.tabName,
              resourceIndex: index,
            },
            data: item,
          });
        });
      }
    } else {
      // 获取顶部资源
      if (category.resources && Array.isArray(category.resources)) {
        category.resources.forEach((item: any, index: number) => {
          resources.push({
            id: `${file}--${categoryName}--resources--${index}`,
            type: 'card',
            name: item.name || '未命名',
            url: item.url,
            location: {
              file,
              pageName,
              groupName,
              categoryName,
              resourceIndex: index,
            },
            data: item,
          });
        });
      }
    }
  } catch (e) {
    console.error(`[ResourceMover] 获取资源列表失败: ${file}`, e);
  }
  
  return resources;
}

// 获取所有资源（用于选择器）
export function getAllResources(): ResourceItem[] {
  const contentDir = path.join(process.cwd(), CONFIG.contentDir);
  const allResources: ResourceItem[] = [];
  
  if (!fs.existsSync(contentDir)) {
    return [];
  }
  
  const jsonFiles = fs.readdirSync(contentDir).filter(f => f.endsWith('.json'));
  
  for (const file of jsonFiles) {
    const filePath = path.join(contentDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(content);
      
      const pageName = json.pageName || 'unknown';
      const groupName = json.name || file.replace('.json', '');
      
      if (json.categories && Array.isArray(json.categories)) {
        json.categories.forEach((category: any, catIndex: number) => {
          const categoryName = category.name || '未命名分类';
          
          // 顶部资源
          if (category.resources && Array.isArray(category.resources)) {
            category.resources.forEach((item: any, index: number) => {
              allResources.push({
                id: `${file}--cat-${catIndex}--res-${index}`,
                type: 'card',
                name: item.name || '未命名',
                url: item.url,
                location: {
                  file,
                  pageName,
                  groupName,
                  categoryName,
                  resourceIndex: index,
                },
                data: item,
              });
            });
          }
          
          // Tab中的资源
          if (category.tabs && Array.isArray(category.tabs)) {
            category.tabs.forEach((tab: any, tabIndex: number) => {
              if (tab.list && Array.isArray(tab.list)) {
                tab.list.forEach((item: any, index: number) => {
                  allResources.push({
                    id: `${file}--cat-${catIndex}--tab-${tabIndex}--res-${index}`,
                    type: 'card',
                    name: item.name || '未命名',
                    url: item.url,
                    location: {
                      file,
                      pageName,
                      groupName,
                      categoryName,
                      tabIndex,
                      tabName: tab.tabName,
                      resourceIndex: index,
                    },
                    data: item,
                  });
                });
              }
            });
          }
        });
      }
    } catch (e) {
      console.error(`[ResourceMover] 解析文件失败: ${file}`, e);
    }
  }
  
  return allResources;
}

// 移动资源
export function moveResources(
  sourceItems: ResourceItem[],
  target: TargetLocation
): { success: boolean; message: string; movedCount: number } {
  const contentDir = path.join(process.cwd(), CONFIG.contentDir);
  
  try {
    // 按文件分组处理
    const fileGroups = new Map<string, ResourceItem[]>();
    
    // 收集要删除的资源（按文件分组）
    for (const item of sourceItems) {
      const key = item.location.file;
      if (!fileGroups.has(key)) {
        fileGroups.set(key, []);
      }
      fileGroups.get(key)!.push(item);
    }
    
    // 从源位置删除资源
    const movedData: any[] = [];
    
    for (const [file, items] of fileGroups) {
      const filePath = path.join(contentDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(content);
      
      // 按位置倒序删除（避免索引变化）
      const sortedItems = [...items].sort((a, b) => b.location.resourceIndex - a.location.resourceIndex);
      
      for (const item of sortedItems) {
        const catIndex = json.categories.findIndex((c: any) => c.name === item.location.categoryName);
        if (catIndex === -1) continue;
        
        const category = json.categories[catIndex];
        
        if (item.location.tabIndex !== undefined) {
          // 从tab中删除
          if (category.tabs && category.tabs[item.location.tabIndex] && category.tabs[item.location.tabIndex].list) {
            const removed = category.tabs[item.location.tabIndex].list.splice(item.location.resourceIndex, 1);
            movedData.push(...removed);
          }
        } else {
          // 从顶部资源中删除
          if (category.resources) {
            const removed = category.resources.splice(item.location.resourceIndex, 1);
            movedData.push(...removed);
          }
        }
      }

      // 清理空的 tab 和分类
      if (Array.isArray(json.categories)) {
        json.categories = json.categories.filter((category: any) => {
          if (Array.isArray(category.tabs)) {
            category.tabs = category.tabs.filter((tab: any) => Array.isArray(tab.list) && tab.list.length > 0);
          } else {
            category.tabs = [];
          }
          
          const resourcesCount = Array.isArray(category.resources) ? category.resources.length : 0;
          const tabsCount = Array.isArray(category.tabs) ? category.tabs.length : 0;
          
          return resourcesCount > 0 || tabsCount > 0;
        });
      }
      
      fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8');
    }
    
    // 添加到目标位置
    const targetFilePath = path.join(contentDir, target.file);
    const targetContent = fs.readFileSync(targetFilePath, 'utf-8');
    const targetJson = JSON.parse(targetContent);
    
    const targetCatIndex = targetJson.categories.findIndex((c: any) => c.name === target.categoryName);
    if (targetCatIndex === -1) {
      return { success: false, message: '目标分类不存在', movedCount: 0 };
    }
    
    const targetCategory = targetJson.categories[targetCatIndex];
    
    if (target.tabIndex !== undefined) {
      // 添加到tab
      if (!targetCategory.tabs) {
        targetCategory.tabs = [];
      }
      if (!targetCategory.tabs[target.tabIndex]) {
        targetCategory.tabs[target.tabIndex] = { tabName: target.tabName || '新Tab', list: [] };
      }
      if (!targetCategory.tabs[target.tabIndex].list) {
        targetCategory.tabs[target.tabIndex].list = [];
      }
      targetCategory.tabs[target.tabIndex].list.push(...movedData);
    } else {
      // 添加到顶部资源
      if (!targetCategory.resources) {
        targetCategory.resources = [];
      }
      targetCategory.resources.push(...movedData);
    }
    
    fs.writeFileSync(targetFilePath, JSON.stringify(targetJson, null, 2), 'utf-8');
    
    return { success: true, message: `成功移动 ${movedData.length} 个资源`, movedCount: movedData.length };
  } catch (e: any) {
    console.error('[ResourceMover] 移动资源失败', e);
    return { success: false, message: e.message, movedCount: 0 };
  }
}

// 创建新的分组（文件）
export function createGroup(params: {
  pageName: string;
  sortPrefix: string;
  groupName: string;
  categoryName: string;
  visualTag?: string;
}): { success: boolean; message: string; createdTarget?: TargetLocation } {
  const pageName = safeTrim(params.pageName);
  const sortPrefix = safeTrim(params.sortPrefix);
  const groupName = safeTrim(params.groupName);
  const categoryName = safeTrim(params.categoryName);
  const visualTag = safeTrim(params.visualTag) || ' ';
  
  if (!pageName || !sortPrefix || !groupName || !categoryName) {
    return { success: false, message: '缺少必要字段' };
  }
  
  const contentDir = path.join(process.cwd(), CONFIG.contentDir);
  const safeGroupName = sanitizeFilePart(groupName);
  const fileBase = `${pageName}-${sortPrefix}-${safeGroupName}`;
  const fileName = `${fileBase}.json`;
  const filePath = path.join(contentDir, fileName);
  
  if (fs.existsSync(filePath)) {
    return { success: false, message: '目标文件已存在，请更换分组名称或排序前缀' };
  }
  
  const payload = {
    id: fileBase,
    pageName,
    visualTag,
    name: groupName,
    pageConfig: { sortPrefix },
    resources: [],
    categories: [
      {
        name: categoryName,
        resources: [],
        tabs: [],
      },
    ],
  };
  
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  
  return {
    success: true,
    message: '创建分组成功',
    createdTarget: {
      file: fileName,
      pageName,
      groupName,
      categoryName,
      targetList: 'resources',
    },
  };
}

// 在现有文件中创建分类
export function createCategory(params: {
  file: string;
  categoryName: string;
}): { success: boolean; message: string; createdTarget?: TargetLocation } {
  const file = safeTrim(params.file);
  const categoryName = safeTrim(params.categoryName);
  
  if (!file || !categoryName) {
    return { success: false, message: '缺少必要字段' };
  }
  
  const contentDir = path.join(process.cwd(), CONFIG.contentDir);
  const filePath = path.join(contentDir, file);
  
  if (!fs.existsSync(filePath)) {
    return { success: false, message: '目标文件不存在' };
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const json = JSON.parse(content);
  
  if (!json.categories || !Array.isArray(json.categories)) {
    json.categories = [];
  }
  
  if (json.categories.some((c: any) => (c.name || '').trim() === categoryName)) {
    return { success: false, message: '分类已存在，请更换名称' };
  }
  
  json.categories.push({
    name: categoryName,
    resources: [],
    tabs: [],
  });
  
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8');
  
  const pageName = json.pageName || 'unknown';
  const groupName = json.name || file.replace('.json', '');
  
  return {
    success: true,
    message: '创建分类成功',
    createdTarget: {
      file,
      pageName,
      groupName,
      categoryName,
      targetList: 'resources',
    },
  };
}

// 在分类中创建 Tab
export function createTab(params: {
  file: string;
  categoryName: string;
  tabName: string;
}): { success: boolean; message: string; createdTarget?: TargetLocation } {
  const file = safeTrim(params.file);
  const categoryName = safeTrim(params.categoryName);
  const tabName = safeTrim(params.tabName);
  
  if (!file || !categoryName || !tabName) {
    return { success: false, message: '缺少必要字段' };
  }
  
  const contentDir = path.join(process.cwd(), CONFIG.contentDir);
  const filePath = path.join(contentDir, file);
  
  if (!fs.existsSync(filePath)) {
    return { success: false, message: '目标文件不存在' };
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const json = JSON.parse(content);
  
  if (!json.categories || !Array.isArray(json.categories)) {
    return { success: false, message: '目标分类不存在' };
  }
  
  const category = json.categories.find((c: any) => (c.name || '').trim() === categoryName);
  if (!category) {
    return { success: false, message: '目标分类不存在' };
  }
  
  if (!category.tabs || !Array.isArray(category.tabs)) {
    category.tabs = [];
  }
  
  if (category.tabs.some((t: any) => (t.tabName || '').trim() === tabName)) {
    return { success: false, message: 'Tab 已存在，请更换名称' };
  }
  
  category.tabs.push({
    tabName,
    list: [],
  });
  
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8');
  
  const tabIndex = category.tabs.length - 1;
  const pageName = json.pageName || 'unknown';
  const groupName = json.name || file.replace('.json', '');
  
  return {
    success: true,
    message: '创建 Tab 成功',
    createdTarget: {
      file,
      pageName,
      groupName,
      categoryName,
      tabIndex,
      tabName,
      targetList: 'list',
    },
  };
}

// 获取目标位置列表
export function getTargetLocations(): TargetLocation[] {
  const contentDir = path.join(process.cwd(), CONFIG.contentDir);
  const locations: TargetLocation[] = [];
  
  if (!fs.existsSync(contentDir)) {
    return [];
  }
  
  const jsonFiles = fs.readdirSync(contentDir).filter(f => f.endsWith('.json'));
  
  for (const file of jsonFiles) {
    const filePath = path.join(contentDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(content);
      
      const pageName = json.pageName || 'unknown';
      const groupName = json.name || file.replace('.json', '');
      
      if (json.categories && Array.isArray(json.categories)) {
        json.categories.forEach((category: any) => {
          const categoryName = category.name || '未命名分类';
          
          // 顶部资源位置
          locations.push({
            file,
            pageName,
            groupName,
            categoryName,
            targetList: 'resources',
          });
          
          // Tab位置
          if (category.tabs && Array.isArray(category.tabs)) {
            category.tabs.forEach((tab: any, tabIndex: number) => {
              locations.push({
                file,
                pageName,
                groupName,
                categoryName,
                tabIndex,
                tabName: tab.tabName,
                targetList: 'list',
              });
            });
          }
        });
      }
    } catch (e) {
      console.error(`[ResourceMover] 解析文件失败: ${file}`, e);
    }
  }
  
  return locations;
}
