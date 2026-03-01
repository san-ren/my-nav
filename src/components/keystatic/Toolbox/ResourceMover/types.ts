// ResourceMover 类型定义

export const CONFIG = {
  contentDir: 'src/content/nav-groups',
};

// 资源类型
export type ResourceType = 'card' | 'tab' | 'list';

// 资源位置信息
export interface ResourceLocation {
  file: string;           // 所属文件
  pageName: string;       // 页面名称
  groupName: string;      // 分组名称
  categoryName: string;   // 分类名称
  tabIndex?: number;      // tab索引（如果在tab中）
  tabName?: string;       // tab名称
  resourceIndex: number;  // 资源索引
}

// 资源项
export interface ResourceItem {
  id: string;             // 唯一标识
  type: ResourceType;     // 资源类型
  name: string;           // 资源名称
  url?: string;           // 资源链接
  location: ResourceLocation; // 位置信息
  data: any;              // 原始数据
}

// 目标位置
export interface TargetLocation {
  file: string;
  pageName: string;
  groupName: string;
  categoryName: string;
  tabIndex?: number;
  tabName?: string;
  targetList: 'resources' | 'list'; // 目标列表类型
}

// 移动操作
export interface MoveOperation {
  source: ResourceLocation;
  target: TargetLocation;
  items: ResourceItem[];
}

// 扫描结果
export interface ScanResult {
  files: FileInfo[];
  totalResources: number;
}

// 文件信息
export interface FileInfo {
  file: string;
  pageName: string;
  groupName: string;
  categories: CategoryInfo[];
}

// 分类信息
export interface CategoryInfo {
  name: string;
  resourceCount: number;
  tabs: TabInfo[];
}

// Tab信息
export interface TabInfo {
  name: string;
  resourceCount: number;
}
