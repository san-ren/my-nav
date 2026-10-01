/**
 * smart-parse 的三类站点处理器
 * （原来内联在 smart-parse.ts 中：Google Play / GitHub / 普通网页）
 */
import * as cheerio from 'cheerio';
import { CONFIG, domainIconCache } from './config';
import { safeFetch } from './fetch';
import { downloadAndOptimizeImage, scrapePageIconUrl, tryDownloadFromThirdParty } from './icons';

/** 处理 Google Play Store */
export async function handleGooglePlay(targetUrl: URL): Promise<{ title: string; desc: string; homepage: string; icon: string; isGithub: boolean } | null> {
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

/** 处理 GitHub 仓库 */
export async function handleGithub(user: string, repo: string) {
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

/** 处理普通网页 */
export async function handleWebPage(targetUrl: URL) {
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

      // 同样对基本解析执行新的高清优先规则
      const iconSelectors = [
        'link[rel="apple-touch-icon-precomposed"]',
        'link[rel="apple-touch-icon"]',
        'link[rel="icon"][sizes*="x"]',
        'meta[property="og:image"]',
        'meta[itemprop="image"]',
        'link[rel="icon"]',
        'link[rel="shortcut icon"]'
      ];

      for (const selector of iconSelectors) {
         const href = $(selector).attr('href') || $(selector).attr('content');
         if (href) {
            try {
              iconUrl = new URL(href, targetUrl).href;
              break; // 找到最高优先级的即可跳出
            } catch {}
         }
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
