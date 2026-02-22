// BatchAdder API 入口
import type { APIRoute } from 'astro';
import { parseUrl } from './utils';
import { getGroups, addResourceToGroup, addAsNewTab, addAsNewCategory, checkDuplicates } from './dataOperations';
import type { ParseResult, AddResult, DuplicateCheckResult, ParsedResource } from '../types';

// 强制动态模式
export const prerender = false;

// --- API 入口 ---
export const GET: APIRoute = async ({ url }) => {
  const mode = url.searchParams.get('mode');
  
  // 模式 1: 获取分组列表
  if (mode === 'groups') {
    const groups = getGroups();
    return new Response(JSON.stringify(groups), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // 模式 2: 解析单个 URL
  if (mode === 'parse') {
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return new Response(JSON.stringify({ error: '缺少 url 参数' }), { status: 400 });
    }
    
    const result = await parseUrl(targetUrl);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  return new Response(JSON.stringify({ error: '未知模式' }), { status: 400 });
};

// --- POST: 批量解析或添加 ---
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    
    // 批量解析
    if (body.urls && Array.isArray(body.urls)) {
      const results: ParseResult[] = [];
      
      for (const url of body.urls) {
        const result = await parseUrl(url);
        results.push(result);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 添加资源
    if (body.action === 'add' && body.resource && body.groupFile) {
      const result = addResourceToGroup(
        body.groupFile,
        body.resource,
        body.target || { type: 'top' }
      );
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 批量添加
    if (body.action === 'batch-add' && body.items && Array.isArray(body.items)) {
      const results: AddResult[] = [];
      
      for (const item of body.items) {
        const result = addResourceToGroup(
          item.groupFile,
          item.resource,
          item.target || { type: 'top' }
        );
        results.push(result);
      }
      
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 作为新Tab添加
    if (body.action === 'add-as-new-tab' && body.groupFile && body.tabName && body.resources) {
      const results = addAsNewTab(
        body.groupFile,
        body.categoryIndex,
        body.tabName,
        body.resources
      );
      
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 作为新分类添加
    if (body.action === 'add-as-new-category' && body.groupFile && body.categoryName && body.resources) {
      const results = addAsNewCategory(
        body.groupFile,
        body.categoryName,
        body.resources
      );
      
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 检测重复
    if (body.action === 'check-duplicates' && body.resources && Array.isArray(body.resources)) {
      const result = checkDuplicates(body.resources);
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ error: '无效的请求体' }), { status: 400 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
