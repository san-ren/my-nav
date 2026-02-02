/**
 * 提取 URL 的域名
 */
export const getDomain = (targetUrl) => {
  try {
    if (!targetUrl) return null;
    return new URL(targetUrl).hostname;
  } catch (e) {
    return null;
  }
};

/**
 * 生成图标源对象
 */
export const getIconSources = ({ icon, url, official_site, base }) => {
  const domain = getDomain(official_site) || getDomain(url);
  const localFallback = `${base}/favicon.svg`;

  return {
    sources: {
      custom: icon,
      level1: domain ? `https://ico.kucat.cn/get.php?url=${domain}` : '',
      level2: domain ? `https://${domain}/favicon.ico` : '',
      level3: domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : '',
      fallback: localFallback
    },
    domain,
    localFallback
  };
};

/**
 * 生成徽章列表数据
 */
export const getBadges = (url, badge_list) => {
  let badges = [];
  if (!url || !badge_list || badge_list.length === 0) return badges;

  try {
    // GitHub Badges
    if (url.includes("github.com")) {
      const pathParts = new URL(url).pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2) {
        const owner = pathParts[0];
        const repo = pathParts[1];
        const styleParam = "?style=flat&color=blue";
        const badgeConfigs = {
          stars: { src: `https://img.shields.io/github/stars/${owner}/${repo}${styleParam}&label=Stars`, alt: "Stars" },
          version: { src: `https://img.shields.io/github/v/release/${owner}/${repo}${styleParam}&color=orange&label=Release`, alt: "Version" },
          license: { src: `https://img.shields.io/github/license/${owner}/${repo}${styleParam}&color=green&label=License`, alt: "License" },
          last_commit: { src: `https://img.shields.io/github/last-commit/${owner}/${repo}${styleParam}&color=slate&label=Last%20Commit`, alt: "Last Commit" }
        };
        badge_list.forEach(key => { if (badgeConfigs[key]) badges.push(badgeConfigs[key]); });
      }
    }
    // VS Code Marketplace Badges
    else if (url.includes("marketplace.visualstudio.com")) {
      const urlObj = new URL(url);
      const itemId = urlObj.searchParams.get('itemName');
      if (itemId) {
        const styleParam = "?style=flat";
        const vsBadges = [
          { src: `https://img.shields.io/visual-studio-marketplace/i/${itemId}${styleParam}&color=blue&label=Installs`, alt: "Installs" },
          { src: `https://img.shields.io/visual-studio-marketplace/v/${itemId}${styleParam}&color=orange&label=Version`, alt: "Version" },
          { src: `https://img.shields.io/visual-studio-marketplace/last-updated/${itemId}${styleParam}&color=slate&label=Updated`, alt: "Last Updated" }
        ];
        // 这里简化逻辑：如果是 VS Code 链接，默认显示这些徽章，或者你可以根据 badge_list 过滤
        vsBadges.forEach(b => badges.push(b));
      }
    }
  } catch (e) {
    console.error("Badge error", e);
  }
  return badges;
};