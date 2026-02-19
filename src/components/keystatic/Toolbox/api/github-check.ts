// src/api/github-check.ts
import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

// 强制动态模式
export const prerender = false;

// --- 配置 ---
const CONFIG = {
  timeout: 15000,
  contentDir: 'src/content/nav-groups',
  githubToken: import.meta.env.GITHUB_TOKEN || '',
};

// --- 类型定义 ---
interface GitHubRepoInfo {
  url: string;
  owner: string;
  repo: string;
  source: string; // 来源文件
  path: string[]; // JSON 路径
}

interface CheckResult {
  url: string;
  owner: string;
  repo: string;
  exists: boolean;
  archived: boolean;
  pushedAt: string | null;
  staleYears: number | null;
  status: 'ok' | 'stale' | 'failed';
  error?: string;
}

interface ScanResult {
  total: number;
  unique: number;
  repos: GitHubRepoInfo[];
}

// --- 辅助函数 ---
async function safeFetch(url: string, options: RequestInit = {}): Promise<Response | null> {
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

// --- 扫描所有 GitHub 链接 ---
function scanGithubRepos(): ScanResult {
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
      
      // 递归查找所有 url 字段
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

function findGithubUrls(obj: any, source: string, path: string[], repos: GitHubRepoInfo[], seen: Set<string>) {
  if (!obj || typeof obj !== 'object') return;
  
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      findGithubUrls(item, source, [...path, `[${index}]`], repos, seen);
    });
    return;
  }
  
  // 检查 url 字段
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
  
  // 递归检查其他字段
  for (const key of Object.keys(obj)) {
    if (key !== 'url' && obj[key] && typeof obj[key] === 'object') {
      findGithubUrls(obj[key], source, [...path, key], repos, seen);
    }
  }
}

// --- 检查单个仓库 ---
async function checkRepo(owner: string, repo: string, token?: string): Promise<CheckResult> {
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
  } catch (e) {
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

// --- 应用状态更新 ---
function applyStatusUpdates(updates: { source: string; path: string[]; status: string }[]): { success: number; failed: number } {
  const contentDir = path.join(process.cwd(), CONFIG.contentDir);
  const fileUpdates = new Map<string, { path: string[]; status: string }[]>();
  
  // 按文件分组
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
        // 导航到目标位置并更新 status
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
        // status 字段在 url 的同级
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

// --- API 入口 ---
export const GET: APIRoute = async ({ url }) => {
  const mode = url.searchParams.get('mode');
  const token = url.searchParams.get('token') || CONFIG.githubToken;
  
  // 模式 1: 扫描所有 GitHub 链接
  if (mode === 'scan') {
    const result = scanGithubRepos();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // 模式 2: 检查单个仓库
  if (mode === 'check') {
    const owner = url.searchParams.get('owner');
    const repo = url.searchParams.get('repo');
    
    if (!owner || !repo) {
      return new Response(JSON.stringify({ error: '缺少 owner 或 repo 参数' }), { status: 400 });
    }
    
    const result = await checkRepo(owner, repo, token || undefined);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // 模式 3: 批量检查
  if (mode === 'batch') {
    const reposParam = url.searchParams.get('repos');
    if (!reposParam) {
      return new Response(JSON.stringify({ error: '缺少 repos 参数' }), { status: 400 });
    }
    
    let repos: { owner: string; repo: string }[];
    try {
      repos = JSON.parse(reposParam);
    } catch {
      return new Response(JSON.stringify({ error: '无效的 repos JSON' }), { status: 400 });
    }
    
    const results: CheckResult[] = [];
    for (const r of repos) {
      const result = await checkRepo(r.owner, r.repo, token || undefined);
      results.push(result);
      // 避免触发速率限制
      await new Promise(resolve => setTimeout(resolve, token ? 100 : 1000));
    }
    
    return new Response(JSON.stringify(results), {
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
