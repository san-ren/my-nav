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
  categories: { name: string; index: number; tabs: { name: string; index: number }[] }[];
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
  targetTab?: number | 'top';
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

// 说明：原来此处的 CONFIG 与 ToolboxField/smart-parse.ts 的 CONFIG 重复且已无引用，
// 解析相关配置统一由 smart-parse.ts 自己维护；内容目录统一见 Toolbox/api-shared/content.ts。
