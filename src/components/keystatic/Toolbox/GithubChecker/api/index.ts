// GithubChecker API 入口
import type { APIRoute } from 'astro';
import { CONFIG, type CheckResult } from '../types';
import { scanGithubRepos, checkRepo, applyStatusUpdates } from './utils';


// 强制动态模式
export const prerender = false;

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
