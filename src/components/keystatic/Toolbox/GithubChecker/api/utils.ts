// GithubChecker 工具函数
import { CONFIG, type GitHubRepoInfo, type CheckResult } from '../types';
import { safeFetch } from '../../api-shared/fetch';
import { readContentFiles } from '../../api-shared/content';
import { applyStatusUpdates as applyStatusUpdatesShared, type StatusUpdate } from '../../api-shared/updates';

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
  const repos: GitHubRepoInfo[] = [];
  const seen = new Set<string>();

  for (const { file, data } of readContentFiles('[GithubCheck]')) {
    findGithubUrls(data, file, [], repos, seen);
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
  
  const res = await safeFetch(apiUrl, { timeout: CONFIG.timeout, headers });
  
  if (!res) {
    return {
      url: `https://github.com/${owner}/${repo}`,
      owner,
      repo,
      exists: false,
      archived: false,
      pushedAt: null,
      staleYears: null,
      status: 'github仓库已失效',
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
      status: 'github仓库已失效',
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
      status: 'github仓库已失效',
      error: `HTTP ${res.status}`,
    };
  }
  
  try {
    const data = await res.json();
    const pushedAt = data.pushed_at;
    const archived = data.archived === true;
    
    let staleYears: number | null = null;
    let status: 'ok' | 'stale' | 'github已归档' | 'github仓库已失效' = 'ok';
    
    if (pushedAt) {
      const pushDate = new Date(pushedAt);
      const now = new Date();
      staleYears = Math.floor((now.getTime() - pushDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    }
    
    if (archived) {
      status = 'github已归档';
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

// 应用状态更新（公共实现，保留 [GithubCheck] 日志前缀）
export function applyStatusUpdates(updates: StatusUpdate[]) {
  return applyStatusUpdatesShared(updates, '[GithubCheck]');
}
