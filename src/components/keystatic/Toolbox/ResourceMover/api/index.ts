// ResourceMover API 入口
import type { APIRoute } from 'astro';
import { scanAllResources, getAllResources, getTargetLocations, moveResources, getResourceList, createGroup, createCategory, createTab } from './utils';

// 强制动态模式
export const prerender = false;

// --- API 入口 ---
export const GET: APIRoute = async ({ url }) => {
  const mode = url.searchParams.get('mode');
  
  // 模式 1: 扫描所有资源结构
  if (mode === 'scan') {
    const result = scanAllResources();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // 模式 2: 获取所有资源项
  if (mode === 'resources') {
    const result = getAllResources();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // 模式 3: 获取目标位置列表
  if (mode === 'targets') {
    const result = getTargetLocations();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // 模式 4: 获取指定位置的资源列表
  if (mode === 'list') {
    const file = url.searchParams.get('file');
    const categoryName = url.searchParams.get('category');
    const tabIndexStr = url.searchParams.get('tabIndex');
    const tabIndex = tabIndexStr ? parseInt(tabIndexStr, 10) : undefined;
    
    if (!file || !categoryName) {
      return new Response(JSON.stringify({ error: '缺少参数' }), { status: 400 });
    }
    
    const result = getResourceList(file, categoryName, tabIndex);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  return new Response(JSON.stringify({ error: '未知模式' }), { status: 400 });
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
        return new Response(JSON.stringify({ success: false, message: '未知的创建类型' }), { status: 400 });
      }
      
      const status = result.success ? 200 : 400;
      return new Response(JSON.stringify(result), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const { sourceItems, target } = body as { 
      sourceItems: any[]; 
      target: any;
    };
    
    if (!sourceItems || !Array.isArray(sourceItems) || sourceItems.length === 0) {
      return new Response(JSON.stringify({ error: '缺少源资源' }), { status: 400 });
    }
    
    if (!target) {
      return new Response(JSON.stringify({ error: '缺少目标位置' }), { status: 400 });
    }
    
    const result = moveResources(sourceItems, target);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
