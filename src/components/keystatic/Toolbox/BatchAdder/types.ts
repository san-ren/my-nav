// BatchAdder 类型定义

// 解析后的资源数据
export interface ParsedResource {
  url: string;
  title: string;
  desc: string;
  icon: string;
  homepage?: string;
  isGithub: boolean;
  originalUrl: string;
}

// 解析结果
export interface ParseResult {
  success: boolean;
  data?: ParsedResource;
  error?: string;
}

// 分组信息
export interface GroupInfo {
  id: string;
  name: string;
  pageName: string;
  file: string;
  categories: { name: string; index: number }[];
}

// 添加结果
export interface AddResult {
  success: boolean;
  message: string;
  addedTo?: string;
}

// 待处理项
export interface PendingItem {
  id: string;
  url: string;
  status: 'pending' | 'parsing' | 'ready' | 'error';
  data?: ParsedResource;
  error?: string;
  targetGroup?: string;
  targetCategory?: number | 'top';
}

// 批量添加模式类型
export type BatchAddMode = 'individual' | 'newTab' | 'newCategory';

// 重复检测结果
export interface DuplicateInfo {
  url: string;
  title: string;
  location: string;
  groupFile: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicates: DuplicateInfo[];
  uniqueResources: ParsedResource[];
}

// API 配置
export const CONFIG = {
  localIconPath: 'public/images/logos',
  publicIconPrefix: '/images/logos',
  githubToken: typeof import.meta !== 'undefined' ? (import.meta.env.GITHUB_TOKEN || '') : '',
  timeout: 10000,
  maxDownloadSize: 5 * 1024 * 1024,
  contentDir: 'src/content/nav-groups',
};
