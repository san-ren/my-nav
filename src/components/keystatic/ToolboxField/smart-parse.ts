// src/components/keystatic/smart-parse.ts
import type { APIRoute } from 'astro';
import * as cheerio from 'cheerio';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import crypto from 'node:crypto';

// 强制动态模式
export const prerender = false;

// --- 配置区域 ---
const CONFIG = {
  localIconPath: 'public/images/logos',
  publicIconPrefix: '/images/logos',
  githubToken: import.meta.env.GITHUB_TOKEN || '', 
  timeout: 10000,
  maxDownloadSize: 5 * 1024 * 1024,
};

// --- User-Agent 池 ---
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
];

function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// --- 缓存 ---
// 域名图标缓存（同一域名复用图标）
const domainIconCache: Map<string, string> = new Map();
// 图标哈希缓存（相同图标复用文件）
const iconHashCache: Map<string, string> = new Map();

// --- 计算图片哈希 ---
function calculateImageHash(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

// --- 增强版 Fetch ---
async function safeFetch(url: string, options: RequestInit = {}): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), CONFIG.timeout);
    
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': getRandomUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        ...options.headers,
      },
    });
    
    clearTimeout(id);
    return res;
  } catch (e) {
    return null;
  }
}

// --- 辅助：获取文件列表 ---
function getLocalIcons() {
  const dir = path.join(process.cwd(), CONFIG.localIconPath);
  if (!fs.existsSync(dir)) return [];
  try {
    return fs.readdirSync(dir)
      .filter(file => /\.(webp|png|jpg|svg)$/i.test(file))
      .map(file => `${CONFIG.publicIconPrefix}/${file}`);
  } catch (e) {
    return [];
  }
}

// --- 辅助：获取第三方图标源列表 ---
function getFallbackIconUrls(domain: string): string[] {
  return [
    `https://ico.kucat.cn/get.php?url=${domain}`,
    `https://icon.horse/icon/${domain}`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  ];
}

// --- 工具：下载并转换为 WebP（带去重）---
async function downloadAndOptimizeImage(url: string, filenamePrefix: string): Promise<string | null> {
  if (!url || url.startsWith('data:')) return null;

  console.log(`[SmartParse] 尝试下载: ${url}`);
  
  const res = await safeFetch(url, {
    headers: { 'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8' }
  });

  if (!res || !res.ok) {
    console.log(`[SmartParse] 下载失败: ${url}`);
    return null;
  }

  const contentType = res.headers.get('content-type');
  if (contentType && !contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
    console.log(`[SmartParse] 非图片类型: ${contentType}`);
    return null;
  }

  const contentLength = res.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > CONFIG.maxDownloadSize) {
    console.log(`[SmartParse] 文件过大: ${url}`);
    return null;
  }

  try {
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length < 100) return null;

    // 计算哈希，检查是否已存在相同图标
    const imageHash = calculateImageHash(buffer);
    if (iconHashCache.has(imageHash)) {
      console.log(`[SmartParse] 复用已有图标: ${imageHash.substring(0, 8)}`);
      return iconHashCache.get(imageHash)!;
    }

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

    console.log(`[SmartParse] 保存成功: ${filename}`);
    const timestamp = Date.now();
    const result = `${CONFIG.publicIconPrefix}/${filename}?t=${timestamp}`;
    
    // 缓存哈希
    iconHashCache.set(imageHash, result);
    
    return result;
  } catch (e) {
    console.error(`[SmartParse] 图片处理异常: ${url}`, e);
    return null;
  }
}

// --- 核心：尝试从 HTML 提取 Icon URL ---
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
      'meta[property="og:image"]'
    ];

    for (const selector of selectors) {
      const href = $(selector).attr('href') || $(selector).attr('content');
      if (href) {
        try {
          return new URL(href, urlStr).href;
        } catch(e) { continue; }
      }
    }
  } catch (e) {}
  return null;
}

// --- 辅助：轮询下载第三方 API ---
async function tryDownloadFromThirdParty(domain: string, filenamePrefix: string): Promise<string | null> {
  // 先检查域名缓存
  if (domainIconCache.has(domain)) {
    console.log(`[SmartParse] 复用域名图标缓存: ${domain}`);
    return domainIconCache.get(domain)!;
  }
  
  const apis = getFallbackIconUrls(domain);
  for (const apiUrl of apis) {
    const result = await downloadAndOptimizeImage(apiUrl, filenamePrefix);
    if (result) {
      domainIconCache.set(domain, result);
      return result;
    }
  }
  return null;
}

// --- 处理逻辑：Google Play Store ---
async function handleGooglePlay(targetUrl: URL): Promise<{ title: string; desc: string; homepage: string; icon: string; isGithub: boolean } | null> {
  const appId = targetUrl.searchParams.get('id');
  if (!appId) return null;
  
  console.log(`[GooglePlay] 处理应用: ${appId}`);
  
  let title = '';
  let desc = '';
  let iconUrl: string | null = null;
  
  const res = await safeFetch(targetUrl.toString());
  if (res && res.ok) {
    try {
      const html = await res.text();
      const $ = cheerio.load(html);
      
      title = $('meta[property="og:title"]').attr('content') || 
              $('h1[itemprop="name"]').text().trim() ||
              $('title').text().replace('- Apps on Google Play', '').trim();
      
      desc = $('meta[name="description"]').attr('content') || 
             $('meta[property="og:description"]').attr('content') || '';
      
      // 优先使用 og:image
      const ogImage = $('meta[property="og:image"]').attr('content');
      if (ogImage) {
        iconUrl = ogImage;
        console.log(`[GooglePlay] 找到 og:image: ${ogImage.substring(0, 60)}...`);
      }
      
      // 备选：查找其他图标
      if (!iconUrl) {
        const imgSrc = $('img[src*="googleusercontent"]').first().attr('src');
        if (imgSrc) {
          iconUrl = imgSrc.startsWith('//') ? `https:${imgSrc}` : 
                    imgSrc.startsWith('http') ? imgSrc : new URL(imgSrc, targetUrl).href;
        }
      }
    } catch (e) {
      console.log(`[GooglePlay] 解析页面失败:`, e);
    }
  }
  
  let finalLocalIcon = '';
  const safeName = `gp-${appId.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30)}`;
  
  if (iconUrl) {
    finalLocalIcon = await downloadAndOptimizeImage(iconUrl, safeName) || '';
  }
  
  if (!finalLocalIcon) {
    finalLocalIcon = await tryDownloadFromThirdParty('play.google.com', safeName) || '';
  }
  
  return {
    title: title || appId,
    desc,
    homepage: targetUrl.toString(),
    icon: finalLocalIcon,
    isGithub: false
  };
}

// --- 处理逻辑：GitHub ---
async function handleGithub(user: string, repo: string) {
  const apiUrl = `https://api.github.com/repos/${user}/${repo}`;
  const headers: any = {};
  
  if (CONFIG.githubToken) {
    headers['Authorization'] = `token ${CONFIG.githubToken}`;
  }

  const res = await safeFetch(apiUrl, { headers });
  
  if (res?.status === 404) {
    throw new Error('Github404');
  }

  if (!res || !res.ok) {
    throw new Error(`GitHub API Error: ${res?.status || 'Network'}`);
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
    } catch (e) {}
  }

  if (!finalLocalIcon && avatarUrl) {
    finalLocalIcon = await downloadAndOptimizeImage(avatarUrl, `${user}-${repo}`) || '';
  }

  return {
    title: data.name,
    desc: data.description || '',
    homepage: homepage || '',
    icon: finalLocalIcon || avatarUrl, 
    originalUrl: `https://github.com/${user}/${repo}`,
    isGithub: true
  };
}

// --- 处理逻辑：普通网页 ---
async function handleWebPage(targetUrl: URL) {
  let title = '';
  let desc = '';
  let iconUrl: string | null = null;
  const domain = targetUrl.hostname;
  const safeName = domain.replace(/^www\./, '').replace(/\./g, '-');
  
  // 检查域名缓存
  if (domainIconCache.has(domain)) {
    console.log(`[SmartParse] 复用域名图标: ${domain}`);
    const cachedIcon = domainIconCache.get(domain)!;
    
    // 仍然获取标题和描述
    const res = await safeFetch(targetUrl.toString());
    if (res && res.ok) {
      try {
        const html = await res.text();
        const $ = cheerio.load(html);
        title = $('meta[property="og:title"]').attr('content') || $('title').text().trim();
        desc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
      } catch (e) {}
    }
    
    return {
      title: title || domain,
      desc,
      homepage: targetUrl.toString(),
      icon: cachedIcon,
      isGithub: false
    };
  }

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
    } catch (e) {}
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
  
  // 缓存域名图标
  if (finalLocalIcon) {
    domainIconCache.set(domain, finalLocalIcon);
  }

  return {
    title: title || domain,
    desc,
    homepage: targetUrl.toString(),
    icon: finalLocalIcon,
    isGithub: false
  };
}

// --- API 入口 ---
export const GET: APIRoute = async ({ request, url }) => {
  try {
    let urlParam = url.searchParams.get('url');
    const mode = url.searchParams.get('mode');

    if (!urlParam && !mode) {
      const rawUrl = new URL(request.url, `http://${request.headers.get('host') || 'localhost'}`);
      urlParam = rawUrl.searchParams.get('url');
    }

    if (mode === 'list_icons') {
      return new Response(JSON.stringify(getLocalIcons()), { status: 200 });
    }

    if (!urlParam) {
      return new Response(JSON.stringify({ error: '缺少 URL 参数' }), { status: 400 });
    }

    let targetUrlStr = urlParam.trim();
    if (!/^https?:\/\//i.test(targetUrlStr)) targetUrlStr = 'https://' + targetUrlStr;

    let targetUrlObj: URL;
    try {
      targetUrlObj = new URL(targetUrlStr);
    } catch (e) {
      return new Response(JSON.stringify({ error: '无效的 URL 格式' }), { status: 400 });
    }

    const isGithub = targetUrlObj.hostname === 'github.com';
    const isGooglePlay = targetUrlObj.hostname === 'play.google.com' && targetUrlObj.pathname.includes('/store/apps/details');
    
    let result;

    if (isGithub) {
      const match = targetUrlObj.pathname.match(/^\/([^\/]+)\/([^\/]+)/);
      if (match) {
        try {
          result = await handleGithub(match[1], match[2]);
        } catch (e: any) {
          if (e.message === 'Github404') {
            return new Response(JSON.stringify({ error: 'GitHub 仓库不存在' }), { status: 404 });
          }
          console.warn(`[SmartParse] GitHub API 失败 (${e}), 降级为网页抓取`);
          result = await handleWebPage(targetUrlObj);
        }
      } else {
        result = await handleWebPage(targetUrlObj);
      }
    } else if (isGooglePlay) {
      // 处理 Google Play Store
      const gpResult = await handleGooglePlay(targetUrlObj);
      if (gpResult) {
        result = gpResult;
      } else {
        result = await handleWebPage(targetUrlObj);
      }
    } else {
      result = await handleWebPage(targetUrlObj);
    }

    return new Response(JSON.stringify(result), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error('[SmartParse] Server Error:', error);
    return new Response(JSON.stringify({ error: error.message || '内部处理错误' }), { status: 500 });
  }
};
