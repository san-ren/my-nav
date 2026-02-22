// BatchAdder 数据操作函数
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG, type ParsedResource, type GroupInfo, type AddResult, type DuplicateInfo, type DuplicateCheckResult } from '../types';

// 获取分组列表
export function getGroups(): GroupInfo[] {
  const contentDir = path.join(process.cwd(), CONFIG.contentDir);
  const groups: GroupInfo[] = [];
  
  if (!fs.existsSync(contentDir)) return groups;
  
  const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    try {
      const filePath = path.join(contentDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(content);
      
      const categories = (json.categories || []).map((cat: any, index: number) => ({
        name: cat.name,
        index,
      }));
      
      groups.push({
        id: json.id || file.replace('.json', ''),
        name: json.name,
        pageName: json.pageName,
        file,
        categories,
      });
    } catch {}
  }
  
  return groups;
}

// 创建新资源对象
function createNewResource(resource: ParsedResource) {
  return {
    toolbox: null,
    name: resource.title,
    url: resource.url,
    official_site: resource.homepage || '',
    desc: resource.desc,
    icon: resource.icon,
    hide_badges: [],
    status: 'ok',
  };
}

// 添加资源到分组
export function addResourceToGroup(
  groupFile: string,
  resource: ParsedResource,
  target: { type: 'top' | 'category'; categoryIndex?: number }
): AddResult {
  const contentDir = path.join(process.cwd(), CONFIG.contentDir);
  const filePath = path.join(contentDir, groupFile);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(content);
    
    const newResource = createNewResource(resource);
    
    if (target.type === 'top') {
      if (!json.resources) json.resources = [];
      json.resources.push(newResource);
    } else if (target.type === 'category' && target.categoryIndex !== undefined) {
      if (!json.categories) json.categories = [];
      if (!json.categories[target.categoryIndex]) {
        return { success: false, message: '分类不存在' };
      }
      if (!json.categories[target.categoryIndex].resources) {
        json.categories[target.categoryIndex].resources = [];
      }
      json.categories[target.categoryIndex].resources.push(newResource);
    }
    
        fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8');
    
    const categoryName = target.type === 'category' && target.categoryIndex !== undefined 
      ? json.categories[target.categoryIndex]?.name 
      : undefined;
    
    return {
      success: true,
      message: '添加成功',
      addedTo: `${json.name}${categoryName ? ' / ' + categoryName : ''}`,
    };

  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

// 作为新Tab添加资源
export function addAsNewTab(
  groupFile: string,
  categoryIndex: number | undefined,
  tabName: string,
  resources: ParsedResource[]
): AddResult[] {
  const contentDir = path.join(process.cwd(), CONFIG.contentDir);
  const filePath = path.join(contentDir, groupFile);
  const results: AddResult[] = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(content);
    
    // 创建新Tab
    const newTab = {
      tabName: tabName,
      list: resources.map(r => createNewResource(r))
    };
    
    if (categoryIndex !== undefined) {
      // 添加到指定分类
      if (!json.categories) json.categories = [];
      if (!json.categories[categoryIndex]) {
        return resources.map(() => ({ success: false, message: '分类不存在' }));
      }
      if (!json.categories[categoryIndex].tabs) {
        json.categories[categoryIndex].tabs = [];
      }
      json.categories[categoryIndex].tabs.push(newTab);
      results.push({
        success: true,
        message: `成功创建Tab「${tabName}」并添加 ${resources.length} 个资源`,
        addedTo: `${json.name} / ${json.categories[categoryIndex].name} / ${tabName}`,
      });
    } else {
      // 添加到分组直属（创建一个新分类来包含这个Tab）
      if (!json.categories) json.categories = [];
      
      const newCategory = {
        name: tabName,
        resources: [],
        tabs: [newTab]
      };
      json.categories.push(newCategory);
      
      results.push({
        success: true,
        message: `成功创建分类「${tabName}」并添加Tab，共 ${resources.length} 个资源`,
        addedTo: `${json.name} / ${tabName}`,
      });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8');
    return results;
  } catch (e: any) {
    return resources.map(() => ({ success: false, message: e.message }));
  }
}

// 作为新分类添加资源
export function addAsNewCategory(
  groupFile: string,
  categoryName: string,
  resources: ParsedResource[]
): AddResult[] {
  const contentDir = path.join(process.cwd(), CONFIG.contentDir);
  const filePath = path.join(contentDir, groupFile);
  const results: AddResult[] = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(content);
    
    // 创建新分类
    const newCategory = {
      name: categoryName,
      resources: resources.map(r => createNewResource(r)),
      tabs: []
    };
    
    if (!json.categories) json.categories = [];
    json.categories.push(newCategory);
    
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8');
    
    results.push({
      success: true,
      message: `成功创建分类「${categoryName}」并添加 ${resources.length} 个资源`,
      addedTo: `${json.name} / ${categoryName}`,
    });
    
    return results;
  } catch (e: any) {
    return resources.map(() => ({ success: false, message: e.message }));
  }
}

// 检测重复资源
export function checkDuplicates(resources: ParsedResource[]): DuplicateCheckResult {
  const contentDir = path.join(process.cwd(), CONFIG.contentDir);
  const duplicates: DuplicateInfo[] = [];
  const uniqueResources: ParsedResource[] = [];
  
  if (!fs.existsSync(contentDir)) {
    return { isDuplicate: false, duplicates: [], uniqueResources: resources };
  }
  
  const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.json'));
  
  for (const resource of resources) {
    let found = false;
    const resourceUrl = resource.url.toLowerCase();
    const resourceHomepage = resource.homepage?.toLowerCase() || '';
    
    for (const file of files) {
      try {
        const filePath = path.join(contentDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);
        const groupName = json.name || file;
        
        // 检查分组直属资源
        if (json.resources && Array.isArray(json.resources)) {
          for (const r of json.resources) {
            const existingUrl = (r.url || '').toLowerCase();
            const existingHomepage = (r.official_site || '').toLowerCase();
            
            if (existingUrl === resourceUrl || 
                (resourceHomepage && existingUrl === resourceHomepage) ||
                (existingHomepage && resourceUrl === existingHomepage)) {
              duplicates.push({
                url: resource.url,
                title: r.name || resource.title,
                location: `${groupName} (分组直属)`,
                groupFile: file,
              });
              found = true;
              break;
            }
          }
        }
        
        if (found) break;
        
        // 检查分类下的资源
        if (json.categories && Array.isArray(json.categories)) {
          for (let catIdx = 0; catIdx < json.categories.length; catIdx++) {
            const cat = json.categories[catIdx];
            const catName = cat.name || `分类${catIdx + 1}`;
            
            // 检查分类直属资源
            if (cat.resources && Array.isArray(cat.resources)) {
              for (const r of cat.resources) {
                const existingUrl = (r.url || '').toLowerCase();
                const existingHomepage = (r.official_site || '').toLowerCase();
                
                if (existingUrl === resourceUrl || 
                    (resourceHomepage && existingUrl === resourceHomepage) ||
                    (existingHomepage && resourceUrl === existingHomepage)) {
                  duplicates.push({
                    url: resource.url,
                    title: r.name || resource.title,
                    location: `${groupName} / ${catName}`,
                    groupFile: file,
                  });
                  found = true;
                  break;
                }
              }
            }
            
            if (found) break;
            
            // 检查Tab中的资源
            if (cat.tabs && Array.isArray(cat.tabs)) {
              for (let tabIdx = 0; tabIdx < cat.tabs.length; tabIdx++) {
                const tab = cat.tabs[tabIdx];
                const tabName = tab.tabName || `Tab${tabIdx + 1}`;
                
                if (tab.list && Array.isArray(tab.list)) {
                  for (const r of tab.list) {
                    const existingUrl = (r.url || '').toLowerCase();
                    const existingHomepage = (r.official_site || '').toLowerCase();
                    
                    if (existingUrl === resourceUrl || 
                        (resourceHomepage && existingUrl === resourceHomepage) ||
                        (existingHomepage && resourceUrl === existingHomepage)) {
                      duplicates.push({
                        url: resource.url,
                        title: r.name || resource.title,
                        location: `${groupName} / ${catName} / ${tabName}`,
                        groupFile: file,
                      });
                      found = true;
                      break;
                    }
                  }
                }
                
                if (found) break;
              }
            }
            
            if (found) break;
          }
        }
        
        if (found) break;
      } catch {}
    }
    
    if (!found) {
      uniqueResources.push(resource);
    }
  }
  
  return {
    isDuplicate: duplicates.length > 0,
    duplicates,
    uniqueResources,
  };
}
