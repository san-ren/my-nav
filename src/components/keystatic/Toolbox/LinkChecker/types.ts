// LinkChecker 类型定义

export const CONFIG = {
  timeout: 15000,
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
  resourceStatus?: string;
}

export interface CheckResult {
  url: string;
  domain: string;
  status: 'ok' | '网站失效' | '网站超时' | 'excluded' | 'stale';
  httpCode?: number;
  error?: string;
  excludedReason?: string;
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
