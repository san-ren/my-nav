// LinkChecker 工具函数
import { CONFIG, type LinkInfo, type CheckResult } from '../types';
import { safeFetch } from '../../api-shared/fetch';
import { readContentFiles } from '../../api-shared/content';
import { applyStatusUpdates as applyStatusUpdatesShared, type StatusUpdate } from '../../api-shared/updates';

// 探活请求头：多数站点会拒绝非浏览器 UA，所以这里不用公共默认 UA
const PROBE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

// 探活单个 URL（HEAD 请求；超时/失败返回 null）
async function probe(url: string): Promise<{ ok: boolean; status: number } | null> {
  const res = await safeFetch(url, {
    method: 'HEAD',
    timeout: CONFIG.timeout,
    headers: PROBE_HEADERS,
  });

  return res ? { ok: res.ok, status: res.status } : null;
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
  const links: LinkInfo[] = [];
  const seen = new Set<string>();

  for (const { file, data } of readContentFiles('[LinkCheck]')) {
    findUrls(data, file, [], links, seen);
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
    
    const result = await probe(url);
    
    if (!result) {
      return { url, domain, status: '网站超时', error: '请求超时' };
    }
    
    if (result.ok) {
      return { url, domain, status: 'ok', httpCode: result.status };
    }
    
    if (result.status >= 400 && result.status < 500) {
      if (result.status === 403) {
        const getResult = await probe(url);
        if (getResult && getResult.ok) {
          return { url, domain, status: 'ok', httpCode: getResult.status };
        }
      }
    }
    
    return { url, domain, status: '网站失效', httpCode: result.status, error: `HTTP ${result.status}` };
  } catch (e: any) {
    return { url, domain: '', status: '网站失效', error: e.message };
  }
}

// 应用状态更新（公共实现，保留 [LinkCheck] 日志前缀）
export function applyStatusUpdates(updates: StatusUpdate[]) {
  return applyStatusUpdatesShared(updates, '[LinkCheck]');
}
