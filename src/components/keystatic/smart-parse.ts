// src/components/keystatic/smart-parse.ts
import type { APIRoute } from 'astro';
import * as cheerio from 'cheerio';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// 强制动态模式
export const prerender = false;

// --- 配置区域 ---
const CONFIG = {
  localIconPath: 'public/images/logos',
  publicIconPrefix: '/images/logos',
  // 建议在 .env 文件中配置 GITHUB_TOKEN，避免速率限制
  githubToken: import.meta.env.GITHUB_TOKEN || '', 
  timeout: 8000, // 全局请求超时
  maxDownloadSize: 5 * 1024 * 1024, // 限制最大下载 5MB，防止内存溢出
};

// --- User-Agent 池 (轮询使用，降低被拦截概率) ---
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
];

function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// --- 增强版 Fetch (带超时和基础错误处理) ---
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
    // 忽略超时或网络错误，返回 null 让上层逻辑处理降级
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
    `https://ico.kucat.cn/get.php?url=${domain}`, // 比较稳定
    `https://icon.horse/icon/${domain}`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  ];
}

// --- 工具：下载并转换为 WebP ---
async function downloadAndOptimizeImage(url: string, filenamePrefix: string): Promise<string | null> {
  if (!url || url.startsWith('data:')) return null;

  console.log(`[SmartParse] 尝试下载: ${url}`);
  
  const res = await safeFetch(url, {
     headers: { 'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8' }
  });

  if (!res || !res.ok) {
    console.log(`[SmartParse] 下载失败或网络错误: ${url}`);
    return null;
  }

  // 1. 检查内容类型 (防止下载 HTML 当作图片)
  const contentType = res.headers.get('content-type');
  if (contentType && !contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
      console.log(`[SmartParse] 非图片类型: ${contentType}`);
      return null;
  }

  // 2. 检查文件大小 (防止过大文件)
  const contentLength = res.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > CONFIG.maxDownloadSize) {
      console.log(`[SmartParse] 文件过大，跳过: ${url}`);
      return null;
  }

  try {
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length < 100) return null; // 忽略过小的文件

    // 确保目录存在
    const saveDir = path.join(process.cwd(), CONFIG.localIconPath);
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    // 3. 文件名清洗 (更严格，防止特殊字符)
    const safeName = filenamePrefix.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 50);
    const filename = `${safeName}.webp`;
    const filePath = path.join(saveDir, filename);

    // 4. Sharp 优化 (针对 SVG 优化密度)
    // 如果是 SVG，sharp 需要较高的 density 参数才能生成清晰的位图
    const isSvg = contentType?.includes('svg') || url.endsWith('.svg');
    const sharpInstance = sharp(buffer, isSvg ? { density: 300 } : {});

    await sharpInstance
      .resize(128, 128, { 
        fit: 'contain', 
        background: { r: 0, g: 0, b: 0, alpha: 0 } 
      })
      .webp({ quality: 80, effort: 4 }) // effort: 压缩效率换空间
      .toFile(filePath);

    console.log(`[SmartParse] 保存成功: ${filename}`);
    return `${CONFIG.publicIconPrefix}/${filename}`;
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
    
    // 优先级排序：Apple Icon -> Shortcut Icon -> Icon -> Og:Image (作为保底)
    const selectors = [
      'link[rel="apple-touch-icon"]',
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'meta[property="og:image"]' // 有时候 og:image 也是很好的 logo 来源
    ];

    for (const selector of selectors) {
      const href = $(selector).attr('href') || $(selector).attr('content');
      if (href) {
        // 尝试解析相对路径
        try {
           return new URL(href, urlStr).href;
        } catch(e) { continue; }
      }
    }
  } catch (e) {
    // 解析错误忽略
  }
  return null;
}

// --- 辅助：轮询下载第三方 API ---
async function tryDownloadFromThirdParty(domain: string, filenamePrefix: string): Promise<string | null> {
    const apis = getFallbackIconUrls(domain);
    // 串行尝试，保证顺序（前面的质量通常更好）
    for (const apiUrl of apis) {
        const result = await downloadAndOptimizeImage(apiUrl, filenamePrefix);
        if (result) return result; 
    }
    return null;
}

// --- 处理逻辑：GitHub ---
async function handleGithub(user: string, repo: string) {
  const apiUrl = `https://api.github.com/repos/${user}/${repo}`;
  const headers: any = {};
  
  // 注入 Token 以提高限额
  if (CONFIG.githubToken) {
    headers['Authorization'] = `token ${CONFIG.githubToken}`;
  }

  const res = await safeFetch(apiUrl, { headers });
  
  // 如果 API 失败（如 403 限流，404 不存在），抛出错误让上层降级为普通网页处理
  if (!res || !res.ok) {
     throw new Error(`GitHub API Error: ${res?.status || 'Network'}`);
  }

  const data = await res.json();
  const avatarUrl = data.owner?.avatar_url;
  const homepage = data.homepage;
  
  let finalLocalIcon = '';
  
  // 策略：如果官网存在，优先抓官网图标（因为 GitHub 头像通常是个人头像，不一定是项目 Logo）
  if (homepage && !homepage.includes('github.com')) { // 排除官网填的是 GitHub 自己的情况
      try {
          const homepageUrl = new URL(homepage);
          const domain = homepageUrl.hostname;
          
          // 1. 抓取 HTML
          const webIconUrl = await scrapePageIconUrl(homepage);
          if (webIconUrl) {
              finalLocalIcon = await downloadAndOptimizeImage(webIconUrl, `${user}-${repo}`) || '';
          }

          // 2. 第三方 API
          if (!finalLocalIcon) {
              finalLocalIcon = await tryDownloadFromThirdParty(domain, `${user}-${repo}`) || '';
          }
      } catch (e) {
          console.warn("官网解析异常，回退到 GitHub 头像");
      }
  }

  // 兜底：使用 GitHub 头像
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
  // 清洗域名作为文件名（去除 www.）
  const safeName = domain.replace(/^www\./, '').replace(/\./g, '-');

  const res = await safeFetch(targetUrl.toString());
  
  if (res && res.ok) {
      try {
          const html = await res.text();
          const $ = cheerio.load(html);

          title = $('meta[property="og:title"]').attr('content') || $('title').text().trim();
          desc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
          
          // 复用 scrapePageIconUrl 的逻辑
          // 这里我们简单提取，因为上面已经获取了 $
          const iconLink = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href');
          if (iconLink) {
             try { iconUrl = new URL(iconLink, targetUrl).href; } catch {}
          }
      } catch (e) {}
  }

  let finalLocalIcon = '';

  // 1. 下载抓取到的图标
  if (iconUrl) {
      finalLocalIcon = await downloadAndOptimizeImage(iconUrl, safeName) || '';
  }

  // 2. 根目录 favicon.ico
  if (!finalLocalIcon) {
      const rootFavicon = new URL('/favicon.ico', targetUrl).href;
      finalLocalIcon = await downloadAndOptimizeImage(rootFavicon, safeName) || '';
  }

  // 3. 第三方 API
  if (!finalLocalIcon) {
      finalLocalIcon = await tryDownloadFromThirdParty(domain, safeName) || '';
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
    // 兼容性获取 URL 参数
    let urlParam = url.searchParams.get('url');
    const mode = url.searchParams.get('mode');

    // 双重保险：如果 Astro 上下文没拿到，手动解析 request.url
    if (!urlParam && !mode) {
        const rawUrl = new URL(request.url, `http://${request.headers.get('host') || 'localhost'}`);
        urlParam = rawUrl.searchParams.get('url');
        // 如果这里也没拿到 mode，就无法处理了
    }

    if (mode === 'list_icons') {
        return new Response(JSON.stringify(getLocalIcons()), { status: 200 });
    }

    if (!urlParam) {
        return new Response(JSON.stringify({ error: '缺少 URL 参数' }), { status: 400 });
    }

    let targetUrlStr = urlParam.trim();
    if (!/^https?:\/\//i.test(targetUrlStr)) targetUrlStr = 'https://' + targetUrlStr;

    // 解析目标 URL
    let targetUrlObj: URL;
    try {
        targetUrlObj = new URL(targetUrlStr);
    } catch (e) {
        return new Response(JSON.stringify({ error: '无效的 URL 格式' }), { status: 400 });
    }

    const isGithub = targetUrlObj.hostname === 'github.com';
    let result;

    if (isGithub) {
      const match = targetUrlObj.pathname.match(/^\/([^\/]+)\/([^\/]+)/);
      if (match) {
          try {
            result = await handleGithub(match[1], match[2]);
          } catch (e) {
            console.warn(`[SmartParse] GitHub API 失败 (${e}), 降级为网页抓取`);
            result = await handleWebPage(targetUrlObj);
          }
      } else {
          // 只是 github.com 主页或者个人主页，按普通网页处理
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