// LinkChecker API 入口
import type { APIRoute } from 'astro';
import { CONFIG, type CheckResult } from '../types';
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
    const result = scanAllLinks();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // 模式 2: 检查单个链接
  if (mode === 'check') {
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return new Response(JSON.stringify({ error: '缺少 url 参数' }), { status: 400 });
    }
    
    const result = await checkLink(targetUrl, excludedDomains);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // 模式 3: 批量检查
  if (mode === 'batch') {
    const urlsParam = url.searchParams.get('urls');
    if (!urlsParam) {
      return new Response(JSON.stringify({ error: '缺少 urls 参数' }), { status: 400 });
    }
    
    let urls: string[];
    try {
      urls = JSON.parse(urlsParam);
    } catch {
      return new Response(JSON.stringify({ error: '无效的 urls JSON' }), { status: 400 });
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
    
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // 模式 4: 获取默认排除域名
  if (mode === 'excluded') {
    return new Response(JSON.stringify(CONFIG.defaultExcludedDomains), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  return new Response(JSON.stringify({ error: '未知模式' }), { status: 400 });
};

// --- POST: 应用更新 ---
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { updates } = body as { updates: { source: string; path: string[]; status: string }[] };
    
    if (!updates || !Array.isArray(updates)) {
      return new Response(JSON.stringify({ error: '缺少 updates 参数' }), { status: 400 });
    }
    
    const result = applyStatusUpdates(updates);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
