// LinkChecker 工具函数
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG, type LinkInfo, type CheckResult, type StatusUpdate } from '../types';

// 安全请求
export async function safeFetch(url: string, timeout: number = CONFIG.timeout): Promise<{ ok: boolean; status: number } | null> {
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

// 递归查找 URL
function findUrls(obj: any, source: string, path: string[], links: LinkInfo[], seen: Set<string>) {
  if (!obj || typeof obj !== 'object') return;
  
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      findUrls(item, source, [...path, `[${index}]`], links, seen);
    });
    return;
  }
  
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
        resourceStatus: obj.status, // 读取后台资源状态
      });
      
      seen.add(obj.url);
    } catch {}
  }
  
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
        resourceStatus: obj.status, // 读取后台资源状态
      });
      
      seen.add(obj.official_site);
    } catch {}
  }
  
  for (const key of Object.keys(obj)) {
    if (!['url', 'official_site', 'status', 'name'].includes(key) && obj[key] && typeof obj[key] === 'object') {
      findUrls(obj[key], source, [...path, key], links, seen);
    }
  }
}

// 扫描所有链接
export function scanAllLinks() {
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

// 检查单个链接
export async function checkLink(url: string, excludedDomains: string[]): Promise<CheckResult> {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    // 检查是否在排除域名列表中
    const excludedDomain = excludedDomains.find(d => domain === d || domain.endsWith('.' + d));
    if (excludedDomain) {
      return { 
        url, 
        domain, 
        status: 'excluded',
        excludedReason: excludedDomain, // 记录具体排除的域名
      };
    }
    
    const result = await safeFetch(url);
    
    if (!result) {
      return { url, domain, status: 'timeout', error: '请求超时' };
    }
    
    if (result.ok) {
      return { url, domain, status: 'ok', httpCode: result.status };
    }
    
    if (result.status >= 400 && result.status < 500) {
      if (result.status === 403) {
        const getResult = await safeFetch(url);
        if (getResult && getResult.ok) {
          return { url, domain, status: 'ok', httpCode: getResult.status };
        }
      }
    }
    
    return { url, domain, status: 'failed', httpCode: result.status, error: `HTTP ${result.status}` };
  } catch (e: any) {
    return { url, domain: '', status: 'failed', error: e.message };
  }
}

// 应用状态更新
export function applyStatusUpdates(updates: StatusUpdate[]): { success: number; failed: number } {
  const contentDir = path.join(process.cwd(), CONFIG.contentDir);
  const fileUpdates = new Map<string, StatusUpdate[]>();
  
  for (const update of updates) {
    if (!fileUpdates.has(update.source)) {
      fileUpdates.set(update.source, []);
    }
    fileUpdates.get(update.source)!.push(update);
  }
  
  let success = 0;
  let failed = 0;
  
  for (const [file, fileUpdateList] of fileUpdates) {
    const filePath = path.join(contentDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(content);
      
      for (const update of fileUpdateList) {
        let target: any = json;
        for (let i = 0; i < update.path.length - 1; i++) {
          const key = update.path[i];
          if (key.startsWith('[') && key.endsWith(']')) {
            target = target[parseInt(key.slice(1, -1))];
          } else {
            target = target[key];
          }
        }
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
