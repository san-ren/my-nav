// src/api/link-check.ts
import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

// 强制动态模式
export const prerender = false;

// --- 配置 ---
const CONFIG = {
  timeout: 10000,
  contentDir: 'src/content/nav-groups',
  defaultExcludedDomains: [
    'github.com',
    'play.google.com',
    'marketplace.visualstudio.com',
    'apps.apple.com',
    'chrome.google.com',
    'addons.mozilla.org',
  ],
};

// --- 类型定义 ---
interface LinkInfo {
  url: string;
  domain: string;
  source: string;
  path: string[];
  resourceName?: string;
}

interface CheckResult {
  url: string;
  domain: string;
  status: 'ok' | 'failed' | 'timeout' | 'excluded';
  httpCode?: number;
  error?: string;
  resourceName?: string;
}

interface ScanResult {
  total: number;
  unique: number;
  links: LinkInfo[];
}

// --- 辅助函数 ---
async function safeFetch(url: string, timeout: number = CONFIG.timeout): Promise<{ ok: boolean; status: number } | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });
    
    clearTimeout(id);
    return { ok: res.ok, status: res.status };
  } catch {
    return null;
  }
}

// --- 扫描所有链接 ---
function scanAllLinks(): ScanResult {
  const contentDir = path.join(process.cwd(), CONFIG.contentDir);
  const links: LinkInfo[] = [];
  const seen = new Set<string>();
  
  if (!fs.existsSync(contentDir)) {
    return { total: 0, unique: 0, links: [] };
  }
  
  const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    const filePath = path.join(contentDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(content);
      
      findUrls(json, file, [], links, seen);
    } catch (e) {
      console.error(`[LinkCheck] 解析文件失败: ${file}`, e);
    }
  }
  
  return {
    total: links.length,
    unique: seen.size,
    links,
  };
}

function findUrls(obj: any, source: string, path: string[], links: LinkInfo[], seen: Set<string>) {
  if (!obj || typeof obj !== 'object') return;
  
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      findUrls(item, source, [...path, `[${index}]`], links, seen);
    });
    return;
  }
  
  // 检查 url 字段
  if (obj.url && typeof obj.url === 'string' && obj.url.startsWith('http')) {
    try {
      const urlObj = new URL(obj.url);
      const domain = urlObj.hostname;
      
      links.push({
        url: obj.url,
        domain,
        source,
        path: [...path, 'url'],
        resourceName: obj.name,
      });
      
      seen.add(obj.url);
    } catch {}
  }
  
  // 检查 official_site 字段
  if (obj.official_site && typeof obj.official_site === 'string' && obj.official_site.startsWith('http')) {
    try {
      const urlObj = new URL(obj.official_site);
      const domain = urlObj.hostname;
      
      links.push({
        url: obj.official_site,
        domain,
        source,
        path: [...path, 'official_site'],
        resourceName: obj.name ? `${obj.name} (官网)` : undefined,
      });
      
      seen.add(obj.official_site);
    } catch {}
  }
  
  // 递归检查其他字段
  for (const key of Object.keys(obj)) {
    if (!['url', 'official_site'].includes(key) && obj[key] && typeof obj[key] === 'object') {
      findUrls(obj[key], source, [...path, key], links, seen);
    }
  }
}

// --- 检查单个链接 ---
async function checkLink(url: string, excludedDomains: string[]): Promise<CheckResult> {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    // 检查是否在排除列表中
    if (excludedDomains.some(d => domain === d || domain.endsWith('.' + d))) {
      return {
        url,
        domain,
        status: 'excluded',
      };
    }
    
    const result = await safeFetch(url);
    
    if (!result) {
      return {
        url,
        domain,
        status: 'timeout',
        error: '请求超时',
      };
    }
    
    if (result.ok) {
      return {
        url,
        domain,
        status: 'ok',
        httpCode: result.status,
      };
    }
    
    // 对于某些错误状态码，尝试 GET 请求
    if (result.status >= 400 && result.status < 500) {
      // 403 可能是因为 HEAD 请求被拒绝
      if (result.status === 403) {
        const getResult = await safeFetch(url);
        if (getResult && getResult.ok) {
          return {
            url,
            domain,
            status: 'ok',
            httpCode: getResult.status,
          };
        }
      }
    }
    
    return {
      url,
      domain,
      status: 'failed',
      httpCode: result.status,
      error: `HTTP ${result.status}`,
    };
  } catch (e: any) {
    return {
      url,
      domain: '',
      status: 'failed',
      error: e.message,
    };
  }
}

// --- 应用状态更新 ---
function applyStatusUpdates(updates: { source: string; path: string[]; status: string }[]): { success: number; failed: number } {
  const contentDir = path.join(process.cwd(), CONFIG.contentDir);
  const fileUpdates = new Map<string, { path: string[]; status: string }[]>();
  
  for (const update of updates) {
    if (!fileUpdates.has(update.source)) {
      fileUpdates.set(update.source, []);
    }
    fileUpdates.get(update.source)!.push({ path: update.path, status: update.status });
  }
  
  let success = 0;
  let failed = 0;
  
  for (const [file, updates] of fileUpdates) {
    const filePath = path.join(contentDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(content);
      
      for (const update of updates) {
        let target: any = json;
        for (let i = 0; i < update.path.length - 1; i++) {
          const key = update.path[i];
          if (key.startsWith('[') && key.endsWith(']')) {
            target = target[parseInt(key.slice(1, -1))];
          } else {
            target = target[key];
          }
        }
        const lastKey = update.path[update.path.length - 1];
        if (target && typeof target === 'object') {
          target.status = update.status;
          success++;
        }
      }
      
      fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8');
    } catch (e) {
      console.error(`[LinkCheck] 更新文件失败: ${file}`, e);
      failed++;
    }
  }
  
  return { success, failed };
}

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
