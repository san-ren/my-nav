// BatchAdder API 入口
// 职责：批量操作入口，调用 smart-parse API 实现基础解析
import type { APIRoute } from 'astro';
import { parseUrl, parseUrls } from './utils';
import { getGroups, addResourceToGroup, addAsNewTab, addAsNewCategory, checkDuplicates } from './dataOperations';
import { jsonResponse, errorResponse } from '../../api-shared/response';
import type { AddResult } from '../types';

// 强制动态模式
export const prerender = false;

// --- API 入口 ---
export const GET: APIRoute = async ({ url }) => {
  const mode = url.searchParams.get('mode');
  
  // 模式 1: 获取分组列表
  if (mode === 'groups') {
    return jsonResponse(getGroups());
  }
  
  // 模式 2: 解析单个 URL（转发到 smart-parse）
  if (mode === 'parse') {
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return errorResponse('缺少 url 参数');
    }
    
    return jsonResponse(await parseUrl(targetUrl));
  }
  
  return errorResponse('未知模式');
};

// --- POST: 批量解析或添加 ---
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    
    // 批量解析（并行调用 smart-parse API）
    if (body.urls && Array.isArray(body.urls)) {
      const concurrency = body.concurrency || 10;
      return jsonResponse(await parseUrls(body.urls, concurrency));
    }
    
    // 添加资源
    if (body.action === 'add' && body.resource && body.groupFile) {
      return jsonResponse(
        addResourceToGroup(
          body.groupFile,
          body.resource,
          body.target || { type: 'top' }
        )
      );
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
      
      return jsonResponse(results);
    }
    
    // 作为新Tab添加
    if (body.action === 'add-as-new-tab' && body.groupFile && body.tabName && body.resources) {
      return jsonResponse(
        addAsNewTab(
          body.groupFile,
          body.categoryIndex,
          body.tabName,
          body.resources
        )
      );
    }
    
    // 作为新分类添加
    if (body.action === 'add-as-new-category' && body.groupFile && body.categoryName && body.resources) {
      return jsonResponse(
        addAsNewCategory(
          body.groupFile,
          body.categoryName,
          body.resources
        )
      );
    }
    
    // 检测重复
    if (body.action === 'check-duplicates' && body.resources && Array.isArray(body.resources)) {
      return jsonResponse(checkDuplicates(body.resources));
    }
    
    return errorResponse('无效的请求体');
  } catch (e: any) {
    return errorResponse(e.message, 500);
  }
};
