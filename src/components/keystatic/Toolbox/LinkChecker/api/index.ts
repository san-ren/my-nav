// LinkChecker API 入口
import type { APIRoute } from 'astro';
import { CONFIG, type CheckResult } from '../types';
import { jsonResponse, errorResponse } from '../../api-shared/response';
import { scanAllLinks, checkLink, applyStatusUpdates } from './utils';


// 强制动态模式
export const prerender = false;

// --- API 入口 ---
export const GET: APIRoute = async ({ url }) => {
  const mode = url.searchParams.get('mode');
  const excludedParam = url.searchParams.get('excluded');
  
  const excludedDomains = excludedParam
    ? [...CONFIG.defaultExcludedDomains, ...excludedParam.split(',').map(d => d.trim())]
    : CONFIG.defaultExcludedDomains;
  
  // 模式 1: 扫描所有链接
  if (mode === 'scan') {
    return jsonResponse(scanAllLinks());
  }
  
  // 模式 2: 检查单个链接
  if (mode === 'check') {
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return errorResponse('缺少 url 参数');
    }
    
    return jsonResponse(await checkLink(targetUrl, excludedDomains));
  }
  
  // 模式 3: 批量检查
  if (mode === 'batch') {
    const urlsParam = url.searchParams.get('urls');
    if (!urlsParam) {
      return errorResponse('缺少 urls 参数');
    }
    
    let urls: string[];
    try {
      urls = JSON.parse(urlsParam);
    } catch {
      return errorResponse('无效的 urls JSON');
    }
    
    const results: CheckResult[] = [];
    const concurrency = 5;
    
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(u => checkLink(u, excludedDomains))
      );
      results.push(...batchResults);
    }
    
    return jsonResponse(results);
  }
  
  // 模式 4: 获取默认排除域名
  if (mode === 'excluded') {
    return jsonResponse(CONFIG.defaultExcludedDomains);
  }
  
  return errorResponse('未知模式');
};

// --- POST: 应用更新 ---
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { updates } = body as { updates: { source: string; path: string[]; status: string }[] };
    
    if (!updates || !Array.isArray(updates)) {
      return errorResponse('缺少 updates 参数');
    }
    
    return jsonResponse(applyStatusUpdates(updates));
  } catch (e: any) {
    return errorResponse(e.message, 500);
  }
};
