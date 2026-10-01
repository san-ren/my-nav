/**
 * smart-parse 的配置与进程内缓存
 * （原来全部内联在 smart-parse.ts 顶部）
 */

export const CONFIG = {
  localIconPath: 'public/images/logos',
  publicIconPrefix: '/images/logos',
  githubToken: import.meta.env.GITHUB_TOKEN || '',
  timeout: 10000,
  maxDownloadSize: 5 * 1024 * 1024,
};

// --- User-Agent 池（抓取页面时轮换，规避反爬） ---
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
];

export function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// --- 缓存 ---
/** 域名图标缓存（同一域名复用图标） */
export const domainIconCache: Map<string, string> = new Map();
/** 图标哈希缓存（相同图标复用文件） */
export const iconHashCache: Map<string, string> = new Map();
