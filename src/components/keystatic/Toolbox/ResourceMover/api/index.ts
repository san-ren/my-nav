// ResourceMover API 入口
import type { APIRoute } from 'astro';
import { scanAllResources, getAllResources, getTargetLocations, moveResources, getResourceList, createGroup, createCategory, createTab } from './utils';
import { jsonResponse, errorResponse } from '../../api-shared/response';

// 强制动态模式
export const prerender = false;

// --- API 入口 ---
export const GET: APIRoute = async ({ url }) => {
  const mode = url.searchParams.get('mode');
  
  // 模式 1: 扫描所有资源结构
  if (mode === 'scan') {
    return jsonResponse(scanAllResources());
  }
  
  // 模式 2: 获取所有资源项
  if (mode === 'resources') {
    return jsonResponse(getAllResources());
  }
  
  // 模式 3: 获取目标位置列表
  if (mode === 'targets') {
    return jsonResponse(getTargetLocations());
  }
  
  // 模式 4: 获取指定位置的资源列表
  if (mode === 'list') {
    const file = url.searchParams.get('file');
    const categoryName = url.searchParams.get('category');
    const tabIndexStr = url.searchParams.get('tabIndex');
    const tabIndex = tabIndexStr ? parseInt(tabIndexStr, 10) : undefined;
    
    if (!file || !categoryName) {
      return errorResponse('缺少参数');
    }
    
    return jsonResponse(getResourceList(file, categoryName, tabIndex));
  }
  
  return errorResponse('未知模式');
};

// --- POST: 移动资源 ---
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { action } = body as { action?: string };
    
    if (action === 'createTarget') {
      const { type, group, category, tab } = body as { 
        type: 'group' | 'category' | 'tab';
        group?: any;
        category?: any;
        tab?: any;
      };
      
      let result;
      if (type === 'group') {
        result = createGroup(group || {});
      } else if (type === 'category') {
        result = createCategory(category || {});
      } else if (type === 'tab') {
        result = createTab(tab || {});
      } else {
        return jsonResponse({ success: false, message: '未知的创建类型' }, 400);
      }
      
      // 创建失败（重名 / 缺字段 / 文件不存在）沿用 400
      return jsonResponse(result, result.success ? 200 : 400);
    }
    
    const { sourceItems, target } = body as { 
      sourceItems: any[]; 
      target: any;
    };
    
    if (!sourceItems || !Array.isArray(sourceItems) || sourceItems.length === 0) {
      return errorResponse('缺少源资源');
    }
    
    if (!target) {
      return errorResponse('缺少目标位置');
    }
    
    return jsonResponse(moveResources(sourceItems, target));
  } catch (e: any) {
    return errorResponse(e.message, 500);
  }
};
