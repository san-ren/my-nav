/**
 * smart-parse 的图标抓取与本地化
 * （原来内联在 smart-parse.ts 中，含下载 / 去重 / WebP 转换 / 第三方源兜底）
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import crypto from 'node:crypto';
import * as cheerio from 'cheerio';
import { CONFIG, domainIconCache, iconHashCache } from './config';
import { safeFetch } from './fetch';

/** 计算图片哈希 */
export function calculateImageHash(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/** 获取本地已有图标列表 */
export function getLocalIcons() {
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

/** 第三方图标源列表 */
function getFallbackIconUrls(domain: string): string[] {
  return [
    `https://ico.kucat.cn/get.php?url=${domain}`,
    `https://icon.horse/icon/${domain}`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  ];
}

/** 下载并转换为 WebP（带去重） */
export async function downloadAndOptimizeImage(url: string, filenamePrefix: string): Promise<string | null> {
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

/** 从 HTML 中提取图标 URL（多层级选择器，按画幅与成功率排序） */
export async function scrapePageIconUrl(urlStr: string): Promise<string | null> {
  const res = await safeFetch(urlStr);
  if (!res || !res.ok) return null;

  try {
    const html = await res.text();
    const $ = cheerio.load(html);

    const selectors = [
      'link[rel="apple-touch-icon-precomposed"]', // 苹果高清免修剪
      'link[rel="apple-touch-icon"]',             // 苹果标准高清
      'link[rel="icon"][sizes="192x192"]',        // 安卓高分 PWA
      'link[rel="icon"][sizes="144x144"]',
      'link[rel="icon"][sizes="128x128"]',
      'link[rel="icon"][sizes*="x"]',             // 其它附带尺寸声明的
      'meta[property="og:image"]',                // 社交分享大图
      'meta[itemprop="image"]',                   // 微数据大图
      'link[rel="icon"]',                         // 常规普通Icon
      'link[rel="shortcut icon"]'
    ];

    for (const selector of selectors) {
      const href = $(selector).attr('href') || $(selector).attr('content');
      if (href) {
        try {
          return new URL(href, urlStr).href;
        } catch (e) { continue; }
      }
    }
  } catch (e) {}
  return null;
}

/** 轮询第三方图标源下载 */
export async function tryDownloadFromThirdParty(domain: string, filenamePrefix: string): Promise<string | null> {
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
