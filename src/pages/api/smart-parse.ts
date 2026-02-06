// src/pages/api/smart-parse.ts
import type { APIRoute } from 'astro';
import * as cheerio from 'cheerio';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export const prerender = false;

// --- 配置区域 ---
const CONFIG = {
  localIconPath: 'public/images/logos',
  publicIconPrefix: '/images/logos',
  // githubToken: 'YOUR_GITHUB_TOKEN', 
};

// --- 辅助：获取文件列表 (用于前端下拉选择) ---
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

// --- 工具：下载并转换为 WebP ---
async function downloadAndOptimizeImage(url: string, filenamePrefix: string): Promise<string | null> {
  try {
    // 设置超时，防止卡死
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); 
    
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 确保目录存在
    const saveDir = path.join(process.cwd(), CONFIG.localIconPath);
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    const safeName = filenamePrefix.replace(/[^a-zA-Z0-9-_]/g, '').substring(0, 50);
    const filename = `${safeName}.webp`;
    const filePath = path.join(saveDir, filename);

    // Sharp 优化
    await sharp(buffer)
      .resize(128, 128, { 
        fit: 'contain', 
        background: { r: 0, g: 0, b: 0, alpha: 0 } 
      })
      .webp({ quality: 80 })
      .toFile(filePath);

    return `${CONFIG.publicIconPrefix}/${filename}`;
  } catch (e) {
    console.error(`[SmartParse] 图片下载失败: ${url}`, e);
    return null;
  }
}

// --- 工具：第三方图标源策略 ---
// 优先级: DuckDuckGo (较准) > Google (全但默认图多) > 其他
function getFallbackIconUrls(domain: string): string[] {
  return [
    `https://icons.duckduckgo.com/ip3/${domain}.ico`, // 👈 新增 DuckDuckGo
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://icon.horse/icon/${domain}`,
    `https://ico.kucat.cn/get.php?url=${domain}`,
  ];
}

// --- 核心：仅尝试提取网页的 Icon URL (不下载) ---
async function scrapePageIconUrl(urlStr: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 4000); // 4秒超时

    const response = await fetch(urlStr, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SmartParse/1.0)' }
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const iconRel = $('link[rel="icon"]').attr('href') || 
                    $('link[rel="shortcut icon"]').attr('href') ||
                    $('link[rel="apple-touch-icon"]').attr('href');
                    
    if (iconRel) {
      return new URL(iconRel, urlStr).href;
    }
  } catch (e) {
    // 忽略抓取错误
  }
  return null;
}

// --- 处理逻辑：GitHub ---
async function handleGithub(user: string, repo: string) {
  const apiUrl = `https://api.github.com/repos/${user}/${repo}`;
  const headers: any = { 'User-Agent': 'Astro-Smart-Parse' };
  // if (CONFIG.githubToken) headers['Authorization'] = `token ${CONFIG.githubToken}`;

  const res = await fetch(apiUrl, { headers });
  if (!res.ok) throw new Error(`GitHub API Error: ${res.status}`);
  const data = await res.json();
  
  const avatarUrl = data.owner?.avatar_url;
  const homepage = data.homepage;
  
  let targetIconUrl = avatarUrl; // 默认使用头像 (最稳)
  let iconSource = 'github-avatar';

  // 策略：如果 GitHub 有官网，尝试去官网找“明确定义”的图标
  if (homepage) {
    const webIcon = await scrapePageIconUrl(homepage);
    if (webIcon) {
      targetIconUrl = webIcon;
      iconSource = 'homepage-scrape';
    } 
    // 注意：如果官网没找到图标，我们直接维持 targetIconUrl = avatarUrl
    // 绝不使用 getFallbackIconUrls (Google/DDG)，因为那些容易返回地球图标
  }

  // 下载最终决定的图标
  let localIcon = '';
  if (targetIconUrl) {
    // 如果是官网图，用 repo 名做文件名；如果是头像，也用 repo 名
    localIcon = await downloadAndOptimizeImage(targetIconUrl, `${user}-${repo}`) || '';
  }

  // 如果下载失败且还没试过头像 (例如官网图挂了)，再试一次头像
  if (!localIcon && iconSource === 'homepage-scrape' && avatarUrl) {
      localIcon = await downloadAndOptimizeImage(avatarUrl, `${user}-${repo}`) || '';
  }

  return {
    title: data.name,
    desc: data.description || '',
    homepage: homepage || '',
    icon: localIcon || avatarUrl, // 优先返回本地路径
    originalUrl: `https://github.com/${user}/${repo}`,
    isGithub: true
  };
}

// --- 处理逻辑：普通网页 ---
async function handleWebPage(targetUrl: URL) {
  // 1. 先抓取元数据
  let title = '';
  let desc = '';
  let iconUrl: string | null = null;

  try {
      const response = await fetch(targetUrl.toString(), {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const html = await response.text();
      const $ = cheerio.load(html);

      title = $('meta[property="og:title"]').attr('content') || $('title').text().trim();
      desc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
      
      // 尝试获取图标链接
      const iconRel = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href');
      if (iconRel) {
        iconUrl = new URL(iconRel, targetUrl.origin).href;
      }
  } catch (e) {
      console.log('网页抓取部分失败，尝试仅获取图标');
  }

  // 2. 如果没抓到图标，使用第三方服务轮询
  if (!iconUrl) {
     const fallbacks = getFallbackIconUrls(targetUrl.hostname);
     // 这里简化逻辑，让 downloadAndOptimizeImage 去尝试下载，或者前端直接填入 URL
     // 为了保证本地化，我们选第一个
     iconUrl = fallbacks[0]; 
  }

  // 3. 下载保存
  let localIcon = '';
  if (iconUrl) {
    const safeName = targetUrl.hostname.replace(/\./g, '-');
    // 尝试下载，如果通过 API 链接下载成功则保存
    localIcon = await downloadAndOptimizeImage(iconUrl, safeName) || '';
  }

  // 如果本地化失败，且是第三方链接，则直接返回链接让前端显示（虽然不推荐，但作为兜底）
  
  return {
    title: title || targetUrl.hostname,
    desc,
    homepage: targetUrl.toString(),
    icon: localIcon || iconUrl,
    isGithub: false
  };
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const reqUrl = new URL(request.url, `http://${request.headers.get('host') || 'localhost'}`);
    
    // 🔥 新增：支持获取图标列表模式
    const mode = reqUrl.searchParams.get('mode');
    if (mode === 'list_icons') {
        const icons = getLocalIcons();
        return new Response(JSON.stringify(icons), { status: 200 });
    }

    //原有逻辑
    const urlParam = reqUrl.searchParams.get('url');
    if (!urlParam) return new Response(JSON.stringify({ error: '缺少 URL 参数' }), { status: 400 });

    let targetUrlStr = urlParam.trim();
    if (!/^https?:\/\//i.test(targetUrlStr)) targetUrlStr = 'https://' + targetUrlStr;

    const githubMatch = targetUrlStr.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    
    let result;
    if (githubMatch) {
      try {
        result = await handleGithub(githubMatch[1], githubMatch[2]);
      } catch (e) {
        console.error('GitHub处理失败，转为普通网页', e);
        result = await handleWebPage(new URL(targetUrlStr));
      }
    } else {
      result = await handleWebPage(new URL(targetUrlStr));
    }

    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[SmartParse] Server Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};