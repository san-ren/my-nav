// src/api/batch-add.ts
import type { APIRoute } from 'astro';
import * as cheerio from 'cheerio';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// 强制动态模式
export const prerender = false;

// --- 配置 ---
const CONFIG = {
  localIconPath: 'public/images/logos',
  publicIconPrefix: '/images/logos',
  githubToken: import.meta.env.GITHUB_TOKEN || '',
  timeout: 10000,
  maxDownloadSize: 5 * 1024 * 1024,
  contentDir: 'src/content/nav-groups',
};

// --- 类型定义 ---
interface ParsedResource {
  url: string;
  title: string;
  desc: string;
  icon: string;
  homepage?: string;
  isGithub: boolean;
  originalUrl: string;
}

interface ParseResult {
  success: boolean;
  data?: ParsedResource;
  error?: string;
}

interface GroupInfo {
  id: string;
  name: string;
  pageName: string;
  file: string;
  categories: { name: string; index: number }[];
}

interface AddResult {
  success: boolean;
  message: string;
  addedTo?: string;
}

// --- User-Agent 池 ---
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
];

function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
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
        'User-Agent': getRandomUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        ...options.headers,
      },
    });
    
    clearTimeout(id);
    return res;
  } catch {
    return null;
  }
}

// --- 图标下载和优化 ---
async function downloadAndOptimizeImage(url: string, filenamePrefix: string): Promise<string | null> {
  if (!url || url.startsWith('data:')) return null;
  
  const res = await safeFetch(url, {
    headers: { 'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8' }
  });
  
  if (!res || !res.ok) return null;
  
  const contentType = res.headers.get('content-type');
  if (contentType && !contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
    return null;
  }
  
  const contentLength = res.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > CONFIG.maxDownloadSize) {
    return null;
  }
  
  try {
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    if (buffer.length < 100) return null;
    
    const saveDir = path.join(process.cwd(), CONFIG.localIconPath);
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }
    
    const safeName = filenamePrefix.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 50);
    const filename = `${safeName}.webp`;
    const filePath = path.join(saveDir, filename);
    
    const isSvg = contentType?.includes('svg') || url.endsWith('.svg');
    const sharpInstance = sharp(buffer, isSvg ? { density: 300 } : {});
    
    await sharpInstance
      .resize(128, 128, { 
        fit: 'contain', 
        background: { r: 0, g: 0, b: 0, alpha: 0 } 
      })
      .webp({ quality: 80, effort: 4 })
      .toFile(filePath);
    
    return `${CONFIG.publicIconPrefix}/${filename}`;
  } catch {
    return null;
  }
}

// --- 获取第三方图标 ---
function getFallbackIconUrls(domain: string): string[] {
  return [
    `https://ico.kucat.cn/get.php?url=${domain}`,
    `https://icon.horse/icon/${domain}`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  ];
}

async function tryDownloadFromThirdParty(domain: string, filenamePrefix: string): Promise<string | null> {
  const apis = getFallbackIconUrls(domain);
  for (const apiUrl of apis) {
    const result = await downloadAndOptimizeImage(apiUrl, filenamePrefix);
    if (result) return result;
  }
  return null;
}

// --- 抓取页面图标 URL ---
async function scrapePageIconUrl(urlStr: string): Promise<string | null> {
  const res = await safeFetch(urlStr);
  if (!res || !res.ok) return null;
  
  try {
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const selectors = [
      'link[rel="apple-touch-icon"]',
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'meta[property="og:image"]',
    ];
    
    for (const selector of selectors) {
      const href = $(selector).attr('href') || $(selector).attr('content');
      if (href) {
        try {
          return new URL(href, urlStr).href;
        } catch { continue; }
      }
    }
  } catch {}
  
  return null;
}

// --- 处理 GitHub ---
async function handleGithub(user: string, repo: string): Promise<ParsedResource> {
  const apiUrl = `https://api.github.com/repos/${user}/${repo}`;
  const headers: Record<string, string> = {};
  
  if (CONFIG.githubToken) {
    headers['Authorization'] = `token ${CONFIG.githubToken}`;
  }
  
  const res = await safeFetch(apiUrl, { headers });
  
  if (res?.status === 404) {
    throw new Error('GitHub 仓库不存在');
  }
  
  if (!res || !res.ok) {
    throw new Error(`GitHub API 错误: ${res?.status || '网络错误'}`);
  }
  
  const data = await res.json();
  const avatarUrl = data.owner?.avatar_url;
  const homepage = data.homepage;
  
  let finalLocalIcon = '';
  
  if (homepage && !homepage.includes('github.com')) {
    try {
      const homepageUrl = new URL(homepage);
      const webIconUrl = await scrapePageIconUrl(homepage);
      if (webIconUrl) {
        finalLocalIcon = await downloadAndOptimizeImage(webIconUrl, `${user}-${repo}`) || '';
      }
      if (!finalLocalIcon) {
        finalLocalIcon = await tryDownloadFromThirdParty(homepageUrl.hostname, `${user}-${repo}`) || '';
      }
    } catch {}
  }
  
  if (!finalLocalIcon && avatarUrl) {
    finalLocalIcon = await downloadAndOptimizeImage(avatarUrl, `${user}-${repo}`) || '';
  }
  
  return {
    title: data.name,
    desc: data.description || '',
    homepage: homepage || '',
    icon: finalLocalIcon || avatarUrl || '',
    originalUrl: `https://github.com/${user}/${repo}`,
    isGithub: true,
    url: `https://github.com/${user}/${repo}`,
  };
}

// --- 处理普通网页 ---
async function handleWebPage(targetUrl: URL): Promise<ParsedResource> {
  let title = '';
  let desc = '';
  let iconUrl: string | null = null;
  const domain = targetUrl.hostname;
  const safeName = domain.replace(/^www\./, '').replace(/\./g, '-');
  
  const res = await safeFetch(targetUrl.toString());
  
  if (res && res.ok) {
    try {
      const html = await res.text();
      const $ = cheerio.load(html);
      
      title = $('meta[property="og:title"]').attr('content') || $('title').text().trim();
      desc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
      
      const iconLink = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href');
      if (iconLink) {
        try { iconUrl = new URL(iconLink, targetUrl).href; } catch {}
      }
    } catch {}
  }
  
  let finalLocalIcon = '';
  
  if (iconUrl) {
    finalLocalIcon = await downloadAndOptimizeImage(iconUrl, safeName) || '';
  }
  
  if (!finalLocalIcon) {
    const rootFavicon = new URL('/favicon.ico', targetUrl).href;
    finalLocalIcon = await downloadAndOptimizeImage(rootFavicon, safeName) || '';
  }
  
  if (!finalLocalIcon) {
    finalLocalIcon = await tryDownloadFromThirdParty(domain, safeName) || '';
  }
  
  return {
    title: title || domain,
    desc,
    homepage: targetUrl.toString(),
    icon: finalLocalIcon,
    isGithub: false,
    originalUrl: targetUrl.toString(),
    url: targetUrl.toString(),
  };
}

// --- 解析单个 URL ---
async function parseUrl(urlStr: string): Promise<ParseResult> {
  try {
    let targetUrlStr = urlStr.trim();
    if (!/^https?:\/\//i.test(targetUrlStr)) {
      targetUrlStr = 'https://' + targetUrlStr;
    }
    
    const targetUrl = new URL(targetUrlStr);
    const isGithub = targetUrl.hostname === 'github.com';
    
    let result: ParsedResource;
    
    if (isGithub) {
      const match = targetUrl.pathname.match(/^\/([^\/]+)\/([^\/]+)/);
      if (match) {
        result = await handleGithub(match[1], match[2]);
      } else {
        result = await handleWebPage(targetUrl);
      }
    } else {
      result = await handleWebPage(targetUrl);
    }
    
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, error: e.message || '解析失败' };
  }
}

// --- 获取分组列表 ---
function getGroups(): GroupInfo[] {
  const contentDir = path.join(process.cwd(), CONFIG.contentDir);
  const groups: GroupInfo[] = [];
  
  if (!fs.existsSync(contentDir)) return groups;
  
  const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    try {
      const filePath = path.join(contentDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(content);
      
      const categories = (json.categories || []).map((cat: any, index: number) => ({
        name: cat.name,
        index,
      }));
      
      groups.push({
        id: json.id || file.replace('.json', ''),
        name: json.name,
        pageName: json.pageName,
        file,
        categories,
      });
    } catch {}
  }
  
  return groups;
}

// --- 添加资源到分组 ---
function addResourceToGroup(
  groupFile: string,
  resource: ParsedResource,
  target: { type: 'top' | 'category'; categoryIndex?: number }
): AddResult {
  const contentDir = path.join(process.cwd(), CONFIG.contentDir);
  const filePath = path.join(contentDir, groupFile);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(content);
    
    const newResource = {
      toolbox: null,
      name: resource.title,
      url: resource.url,
      official_site: resource.homepage || '',
      desc: resource.desc,
      icon: resource.icon,
      hide_badges: [],
      status: 'ok',
    };
    
    if (target.type === 'top') {
      if (!json.resources) json.resources = [];
      json.resources.push(newResource);
    } else if (target.type === 'category' && target.categoryIndex !== undefined) {
      if (!json.categories) json.categories = [];
      if (!json.categories[target.categoryIndex]) {
        return { success: false, message: '分类不存在' };
      }
      if (!json.categories[target.categoryIndex].resources) {
        json.categories[target.categoryIndex].resources = [];
      }
      json.categories[target.categoryIndex].resources.push(newResource);
    }
    
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8');
    
    return {
      success: true,
      message: '添加成功',
      addedTo: `${json.name}${target.type === 'category' ? ' / ' + json.categories[target.categoryIndex].name : ''}`,
    };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

// --- API 入口 ---
export const GET: APIRoute = async ({ url }) => {
  const mode = url.searchParams.get('mode');
  
  // 模式 1: 获取分组列表
  if (mode === 'groups') {
    const groups = getGroups();
    return new Response(JSON.stringify(groups), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // 模式 2: 解析单个 URL
  if (mode === 'parse') {
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return new Response(JSON.stringify({ error: '缺少 url 参数' }), { status: 400 });
    }
    
    const result = await parseUrl(targetUrl);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  return new Response(JSON.stringify({ error: '未知模式' }), { status: 400 });
};

// --- POST: 批量解析或添加 ---
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    
    // 批量解析
    if (body.urls && Array.isArray(body.urls)) {
      const results: ParseResult[] = [];
      
      for (const url of body.urls) {
        const result = await parseUrl(url);
        results.push(result);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 添加资源
    if (body.action === 'add' && body.resource && body.groupFile) {
      const result = addResourceToGroup(
        body.groupFile,
        body.resource,
        body.target || { type: 'top' }
      );
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
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
      
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ error: '无效的请求体' }), { status: 400 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
