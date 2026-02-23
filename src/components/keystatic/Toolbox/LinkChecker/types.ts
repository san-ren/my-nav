// LinkChecker 类型定义

export const CONFIG = {
  timeout: 10000,
  contentDir: 'src/content/nav-groups',
  defaultExcludedDomains: [
    'github.com',
    'play.google.com',
    'marketplace.visualstudio.com',
    'apps.apple.com',
    'chrome.google.com',
    'addons.mozilla.org',
  ],
};

export interface LinkInfo {
  url: string;
  domain: string;
  source: string;
  path: string[];
  resourceName?: string;
  resourceStatus?: string; // 后台资源状态字段
}

export interface CheckResult {
  url: string;
  domain: string;
  status: 'ok' | 'failed' | 'timeout' | 'excluded';
  httpCode?: number;
  error?: string;
  resourceName?: string;
  resourceStatus?: string; // 后台资源状态字段
  excludedReason?: string; // 排除原因（域名）
}

export interface ScanResult {
  total: number;
  unique: number;
  links: LinkInfo[];
}

export interface StatusUpdate {
  source: string;
  path: string[];
  status: string;
}
