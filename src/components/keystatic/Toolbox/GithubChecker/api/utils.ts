// GithubChecker 工具函数
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG, type GitHubRepoInfo, type CheckResult, type StatusUpdate } from '../types';

// 安全请求
export async function safeFetch(url: string, options: RequestInit = {}): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), CONFIG.timeout);
    
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'MyNav-Bot/1.0',
        ...options.headers,
      },
    });
    
    clearTimeout(id);
    return res;
  } catch {
    return null;
  }
}

// 递归查找 GitHub URL
function findGithubUrls(obj: any, source: string, path: string[], repos: GitHubRepoInfo[], seen: Set<string>) {
  if (!obj || typeof obj !== 'object') return;
  
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      findGithubUrls(item, source, [...path, `[${index}]`], repos, seen);
    });
    return;
  }
  
  if (obj.url && typeof obj.url === 'string') {
    const match = obj.url.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/\?#]+)/);
    if (match) {
      const [, owner, repo] = match;
      const key = `${owner}/${repo}`;
      
      repos.push({
        url: obj.url,
        owner,
        repo,
        source,
        path: [...path, 'url'],
      });
      
      seen.add(key);
    }
  }
  
  for (const key of Object.keys(obj)) {
    if (key !== 'url' && obj[key] && typeof obj[key] === 'object') {
      findGithubUrls(obj[key], source, [...path, key], repos, seen);
    }
  }
}

// 扫描所有 GitHub 链接
export function scanGithubRepos() {
  const contentDir = path.join(process.cwd(), CONFIG.contentDir);
  const repos: GitHubRepoInfo[] = [];
  const seen = new Set<string>();
  
  if (!fs.existsSync(contentDir)) {
    return { total: 0, unique: 0, repos: [] };
  }
  
  const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    const filePath = path.join(contentDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(content);
      findGithubUrls(json, file, [], repos, seen);
    } catch (e) {
      console.error(`[GithubCheck] 解析文件失败: ${file}`, e);
    }
  }
  
  return {
    total: repos.length,
    unique: seen.size,
    repos,
  };
}

// 检查单个仓库
export async function checkRepo(owner: string, repo: string, token?: string): Promise<CheckResult> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'MyNav-Bot/1.0',
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  
  const res = await safeFetch(apiUrl, { headers });
  
  if (!res) {
    return {
      url: `https://github.com/${owner}/${repo}`,
      owner,
      repo,
      exists: false,
      archived: false,
      pushedAt: null,
      staleYears: null,
      status: 'failed',
      error: '网络请求失败',
    };
  }
  
  if (res.status === 404) {
    return {
      url: `https://github.com/${owner}/${repo}`,
      owner,
      repo,
      exists: false,
      archived: false,
      pushedAt: null,
      staleYears: null,
      status: 'failed',
      error: '仓库不存在',
    };
  }
  
  if (res.status === 403) {
    return {
      url: `https://github.com/${owner}/${repo}`,
      owner,
      repo,
      exists: true,
      archived: false,
      pushedAt: null,
      staleYears: null,
      status: 'ok',
      error: 'API 限流，跳过检测',
    };
  }
  
  if (!res.ok) {
    return {
      url: `https://github.com/${owner}/${repo}`,
      owner,
      repo,
      exists: false,
      archived: false,
      pushedAt: null,
      staleYears: null,
      status: 'failed',
      error: `HTTP ${res.status}`,
    };
  }
  
  try {
    const data = await res.json();
    const pushedAt = data.pushed_at;
    const archived = data.archived === true;
    
    let staleYears: number | null = null;
    let status: 'ok' | 'stale' | 'failed' = 'ok';
    
    if (pushedAt) {
      const pushDate = new Date(pushedAt);
      const now = new Date();
      staleYears = Math.floor((now.getTime() - pushDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    }
    
    if (archived) {
      status = 'failed';
    } else if (staleYears !== null && staleYears >= 3) {
      status = 'stale';
    }
    
    return {
      url: `https://github.com/${owner}/${repo}`,
      owner,
      repo,
      exists: true,
      archived,
      pushedAt,
      staleYears,
      status,
    };
  } catch {
    return {
      url: `https://github.com/${owner}/${repo}`,
      owner,
      repo,
      exists: true,
      archived: false,
      pushedAt: null,
      staleYears: null,
      status: 'ok',
      error: '解析响应失败',
    };
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
      console.error(`[GithubCheck] 更新文件失败: ${file}`, e);
      failed++;
    }
  }
  
  return { success, failed };
}
