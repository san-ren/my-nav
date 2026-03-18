// LinkChecker 主组件 - 整合GitHub检测和网站链接检测功能
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Link, 
  Github,
  Shield,
  Search,
  XCircle,
  CheckCircle,
  Clock,
  Play,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Filter,
  Download,
  Plus,
  X,
  Globe,
  RotateCcw,
  Trash2,
  Layers,
  Folder,
  FolderOpen,
  FileText,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  AlertTriangle,
  Archive,
  Save,
  Eye,
  EyeOff,
  Check
} from 'lucide-react';
import { GithubChecker } from '../GithubChecker';
import {
  LAYOUT,
  TABS,
  CARD,
  BUTTON,
  INPUT,
  TABLE,
  TREE,
  PROGRESS,
  BADGE,
  PAGE_TITLE,
  MODAL,
  getStatusBadge,
} from '../toolbox-shared';

// --- 类型定义 ---
type SubTabId = 'github' | 'link';

interface SubTab {
  id: SubTabId;
  label: string;
  icon: React.ReactNode;
  description: string;
}

// --- 样式常量 ---
// 合并共享样式与组件特有样式
const STYLES = {
  // 从共享样式导入
  ...LAYOUT,
  card: {
    base: CARD.base,
    header: CARD.header,
    headerIcon: CARD.headerIcon,
    headerTitle: CARD.headerTitle,
    headerExtra: CARD.headerExtra,
    headerCount: CARD.headerCount,
    body: CARD.body,
  },
  header: CARD.header,
  body: CARD.body,
  input: INPUT.base,
  button: BUTTON,
  badge: BADGE,
  progress: PROGRESS,
  table: TABLE.base,
  th: TABLE.th,
  thSortable: TABLE.thSortable,
  td: TABLE.td,
  treeNode: TREE.node,
  
  // 组件特有样式
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    background: '#f1f5f9',
    color: '#475569',
    marginRight: '6px',
    marginBottom: '6px',
    border: '1px solid #e2e8f0',
  },
  tagDefault: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    background: '#eff6ff',
    color: '#1d4ed8',
    marginRight: '6px',
    marginBottom: '6px',
    border: '1px solid #bfdbfe',
  },
  suggestedTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    background: 'white',
    color: '#64748b',
    marginRight: '6px',
    marginBottom: '6px',
    border: '1px dashed #cbd5e1',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  excludedGroup: {
    marginBottom: '12px',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  excludedGroupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    fontWeight: 500,
    color: '#334155',
    fontSize: '13px',
  },
  excludedGroupCount: {
    background: '#e2e8f0',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#64748b',
  },
};

// --- 子标签配置 ---
const SUB_TABS: SubTab[] = [
  {
    id: 'github',
    label: 'GitHub 检测',
    icon: <Github size={16} />,
    description: '检测GitHub仓库状态',
  },
  {
    id: 'link',
    label: '网站链接检测',
    icon: <Link size={16} />,
    description: '检测网站链接有效性',
  },
];

// ==================== 网站链接检测相关类型和函数 ====================

interface LinkInfo {
  url: string;
  domain: string;
  source: string;
  path: string[];
  resourceName?: string;
  resourceStatus?: string;
}

interface LinkCheckResult {
  url: string;
  domain: string;
  status: 'ok' | '网站失效' | '网站超时' | 'excluded' | 'stale';
  httpCode?: number;
  error?: string;
  resourceName?: string;
  resourceStatus?: string;
  excludedReason?: string;
}

interface LinkScanResult {
  total: number;
  unique: number;
  links: LinkInfo[];
}

interface LinkTreeNode {
  id: string;
  type: 'page' | 'group' | 'category' | 'resource';
  name: string;
  checked: boolean;
  indeterminate: boolean;
  expanded: boolean;
  children?: LinkTreeNode[];
  link?: LinkInfo;
}

type LinkFilterType = 'ok' | '网站失效' | '网站超时' | 'excluded';
type LinkSortField = 'status' | 'httpCode' | 'domain' | 'resourceStatus' | null;
type LinkSortDirection = 'asc' | 'desc';

// 默认排除域名列表
const DEFAULT_EXCLUDED_DOMAINS = [
  'github.com',
  'play.google.com',
  'marketplace.visualstudio.com',
  'apps.apple.com',
  'chrome.google.com',
  'addons.mozilla.org',
];

// 常用可添加的域名建议
const SUGGESTED_DOMAINS = [
  { domain: 'npmjs.com', label: 'NPM' },
  { domain: 'pypi.org', label: 'PyPI' },
  { domain: 'crates.io', label: 'Crates.io' },
  { domain: 'nuget.org', label: 'NuGet' },
  { domain: 'maven.org', label: 'Maven' },
  { domain: 'packagist.org', label: 'Packagist' },
  { domain: 'rubygems.org', label: 'RubyGems' },
  { domain: 'go.dev', label: 'Go.dev' },
  { domain: 'docker.com', label: 'Docker' },
  { domain: 'readthedocs.io', label: 'ReadTheDocs' },
];

// --- 辅助函数 ---
const getLinkStatusIcon = (status: string) => {
  switch (status) {
    case 'ok': return <CheckCircle size={16} style={{ color: '#22c55e' }} />;
    case '网站失效': return <XCircle size={16} style={{ color: '#ef4444' }} />;
    case '网站超时': return <Clock size={16} style={{ color: '#f59e0b' }} />;
    case 'excluded': return <Shield size={16} style={{ color: '#64748b' }} />;
    case 'stale': return <AlertTriangle size={16} style={{ color: '#f59e0b' }} />;
    default: return null;
  }
};

const getLinkStatusLabel = (status: string): string => {
  switch (status) {
    case 'ok': return '正常';
    case '网站失效': return '网站失效';
    case '网站超时': return '网站超时';
    case 'excluded': return '已排除';
    case 'stale': return '长期未更新';
    default: return status || '-';
  }
};

// 状态排序权重
const getLinkStatusWeight = (status: string): number => {
  switch (status) {
    case '网站失效': return 0;
    case '网站超时': return 1;
    case 'excluded': return 2;
    case 'ok': return 3;
    default: return 4;
  }
};

// 资源状态排序权重
const getResourceStatusWeight = (status: string | undefined): number => {
  if (!status) return 3;
  switch (status) {
    case 'failed': return 0;
    case 'stale': return 1;
    case 'ok': return 2;
    default: return 3;
  }
};

const truncateUrl = (url: string, maxLength: number = 50): string => {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
};

const isDefaultDomain = (domain: string) => DEFAULT_EXCLUDED_DOMAINS.includes(domain);

const getLinkNodeIcon = (node: LinkTreeNode) => {
  switch (node.type) {
    case 'page': return <Layers size={16} style={{ color: '#8b5cf6' }} />;
    case 'group': return node.expanded ? <FolderOpen size={16} style={{ color: '#3b82f6' }} /> : <Folder size={16} style={{ color: '#3b82f6' }} />;
    case 'category': return <FileText size={16} style={{ color: '#10b981' }} />;
    case 'resource': return <Globe size={14} style={{ color: '#64748b' }} />;
    default: return null;
  }
};

// ==================== 主组件 ====================

interface LinkCheckerProps {
  onDataStatusChange?: (hasData: boolean) => void;
  onTaskStart?: (id: string, name: string) => void;
  onTaskProgress?: (id: string, progress: number) => void;
  onTaskEnd?: (id: string, message?: string) => void;
}

export function LinkChecker({ onDataStatusChange, onTaskStart, onTaskProgress, onTaskEnd }: LinkCheckerProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('github');
  const [hasUnsavedData, setHasUnsavedData] = useState(false);
  const [pendingSubTab, setPendingSubTab] = useState<SubTabId | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);


  // 通知父组件数据状态变化
  const onDataStatusChangeRef = useRef(onDataStatusChange);
  useEffect(() => {
    onDataStatusChangeRef.current = onDataStatusChange;
  }, [onDataStatusChange]);

  useEffect(() => {
    onDataStatusChangeRef.current?.(hasUnsavedData);
  }, [hasUnsavedData]);

  // 子组件数据状态处理
  const handleDataStatusChange = useCallback((hasData: boolean) => {
    setHasUnsavedData(hasData);
  }, []);

  const requestSubTabChange = (targetTab: SubTabId) => {
    if (hasUnsavedData && targetTab !== activeSubTab) {
      setPendingSubTab(targetTab);
      setShowConfirmModal(true);
    } else {
      setActiveSubTab(targetTab);
    }
  };

  const confirmSwitch = () => {
    if (pendingSubTab) {
      setActiveSubTab(pendingSubTab);
      setHasUnsavedData(false);
    }
    setShowConfirmModal(false);
    setPendingSubTab(null);
  };

  const cancelSwitch = () => {
    setShowConfirmModal(false);
    setPendingSubTab(null);
  };

  return (
    <div>
      {/* 子标签切换 */}
      <div style={TABS.sub}>
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            className="toolbox-sub-tab"
            onClick={() => requestSubTabChange(tab.id)}
            style={TABS.subTab(activeSubTab === tab.id)}
            title={tab.description}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 - 居中显示，独立卡片，使用 CSS 隐藏代替卸载 */}
      <div style={LAYOUT.container} className="tab-content">
        <div style={{ display: activeSubTab === 'github' ? 'block' : 'none' }}>
          <GithubChecker 
            onDataStatusChange={handleDataStatusChange}
            onTaskStart={onTaskStart}
            onTaskProgress={onTaskProgress}
            onTaskEnd={onTaskEnd}
          />
        </div>
        <div style={{ display: activeSubTab === 'link' ? 'block' : 'none' }}>
          <WebsiteLinkChecker 
            onDataStatusChange={handleDataStatusChange}
            onTaskStart={onTaskStart}
            onTaskProgress={onTaskProgress}
            onTaskEnd={onTaskEnd}
          />
        </div>
      </div>
      {/* 确认切换弹窗 */}
      {showConfirmModal && (
        <div style={MODAL.overlay} onClick={cancelSwitch}>
          <div style={MODAL.content} onClick={e => e.stopPropagation()}>
            <div style={MODAL.title}>
              <AlertTriangle size={24} style={{ color: '#f59e0b' }} />
              确认切换？
            </div>
            
            <p style={MODAL.text}>
              当前页面有未处理的数据，请注意提示。
              <br /><br />
              确定要切换吗？
            </p>
            
            <div style={MODAL.buttons}>
              <button onClick={cancelSwitch} style={BUTTON.secondary}>
                取消
              </button>
              <button onClick={confirmSwitch} style={BUTTON.primary}>
                确认切换
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 网站链接检测子组件 ====================

interface WebsiteLinkCheckerProps {
  onDataStatusChange?: (hasData: boolean) => void;
  onTaskStart?: (id: string, name: string) => void;
  onTaskProgress?: (id: string, progress: number) => void;
  onTaskEnd?: (id: string, message?: string) => void;
}

function WebsiteLinkChecker({ onDataStatusChange, onTaskStart, onTaskProgress, onTaskEnd }: WebsiteLinkCheckerProps) {
  const [excludedDomains, setExcludedDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [scanResult, setScanResult] = useState<LinkScanResult | null>(null);
  const [treeData, setTreeData] = useState<LinkTreeNode[]>([]);
  const [checkResults, setCheckResults] = useState<LinkCheckResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filter, setFilter] = useState<LinkFilterType[]>(['ok', '网站失效', '网站超时', 'excluded']);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasSavedData, setHasSavedData] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('my_nav_link_results');
      if (saved) {
        setHasSavedData(true);
      }
    }
  }, []);

  const handleSaveResults = () => {
    if (!scanResult) return;
    try {
      const data = { scanResult, checkResults };
      localStorage.setItem('my_nav_link_results', JSON.stringify(data));
      setHasSavedData(true);
      setMessage({ type: 'success', text: '检测结果已保存到本地' });
    } catch (e) {
      setMessage({ type: 'error', text: '保存结果失败' });
    }
  };

  const handleLoadResults = () => {
    try {
      const saved = localStorage.getItem('my_nav_link_results');
      if (saved) {
        const data = JSON.parse(saved);
        setScanResult(data.scanResult);
        setCheckResults(data.checkResults || []);
        const tree = buildTree(data.scanResult.links);
        setTreeData(tree);
        setSelectedItems(new Set());
        setSortField('status');
        setSortDirection('asc');
        setMessage({ type: 'success', text: '已读取上次保存的检测结果' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: '读取保存的结果失败' });
    }
  };

  // 筛选下拉框外部点击引用
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  // 排序状态 - 默认按状态排序
  const [sortField, setSortField] = useState<LinkSortField>('status');
  const [sortDirection, setSortDirection] = useState<LinkSortDirection>('asc');

  // 通知父组件数据状态变化
  const onDataStatusChangeRef = useRef(onDataStatusChange);
  useEffect(() => {
    onDataStatusChangeRef.current = onDataStatusChange;
  }, [onDataStatusChange]);

  useEffect(() => {
    onDataStatusChangeRef.current?.(scanResult !== null || checkResults.length > 0);
  }, [scanResult, checkResults]);

  // 加载默认排除域名
  useEffect(() => {
    fetch('/api/link-check?mode=excluded')
      .then(res => res.json())
      .then((domains: string[]) => {
        setExcludedDomains(domains);
      })
      .catch(console.error);
  }, []);

  const customDomains = excludedDomains.filter(d => !isDefaultDomain(d));

  // 排序函数
  const handleSort = (field: LinkSortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // 渲染排序图标
  const renderSortIcon = (field: LinkSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} style={{ color: '#94a3b8', marginLeft: '4px' }} />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp size={14} style={{ color: '#2563eb', marginLeft: '4px' }} />;
    }
    return <ArrowDown size={14} style={{ color: '#2563eb', marginLeft: '4px' }} />;
  };

  // 筛选和排序后的结果
  const sortedAndFilteredResults = React.useMemo(() => {
    let results = checkResults.filter(r => {
      if (filter.length === 0) return true;
      return filter.includes(r.status as LinkFilterType);
    });

    if (sortField) {
      results = [...results].sort((a, b) => {
        let comparison = 0;
        
        switch (sortField) {
          case 'status':
            comparison = getLinkStatusWeight(a.status) - getLinkStatusWeight(b.status);
            break;
          case 'httpCode':
            comparison = (a.httpCode || 0) - (b.httpCode || 0);
            break;
          case 'domain':
            comparison = a.domain.localeCompare(b.domain);
            break;
          case 'resourceStatus':
            comparison = getResourceStatusWeight(a.resourceStatus) - getResourceStatusWeight(b.resourceStatus);
            break;
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return results;
  }, [checkResults, filter, sortField, sortDirection]);

  // 按域名分组的排除结果
  const excludedByDomain = React.useMemo(() => {
    const excluded = checkResults.filter(r => r.status === 'excluded');
    const grouped = new Map<string, LinkCheckResult[]>();
    
    excluded.forEach(result => {
      const domain = result.excludedReason || result.domain;
      if (!grouped.has(domain)) {
        grouped.set(domain, []);
      }
      grouped.get(domain)!.push(result);
    });
    
    return grouped;
  }, [checkResults]);

  // 将扫描结果转换为树形结构
  const buildTree = (links: LinkInfo[]): LinkTreeNode[] => {
    const pageMap = new Map<string, Map<string, Map<string, LinkInfo[]>>>();
    
    links.forEach(link => {
      const parts = link.source.replace('.json', '').split('--');
      const pageName = parts[0] || 'unknown';
      const groupName = parts[1] || '未分类';
      
      if (!pageMap.has(pageName)) {
        pageMap.set(pageName, new Map());
      }
      const groupMap = pageMap.get(pageName)!;
      
      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, new Map());
      }
      const categoryMap = groupMap.get(groupName)!;
      
      const categoryIndex = link.path.findIndex(p => p === 'categories');
      let categoryName = '顶部资源';
      if (categoryIndex !== -1 && link.path[categoryIndex + 2]) {
        categoryName = `分类: ${link.path[categoryIndex + 2]}`;
      }
      
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, []);
      }
      categoryMap.get(categoryName)!.push(link);
    });
    
    const tree: LinkTreeNode[] = [];
    
    pageMap.forEach((groupMap, pageName) => {
      const pageNode: LinkTreeNode = {
        id: `page-${pageName}`,
        type: 'page',
        name: `页面: ${pageName}`,
        checked: false,
        indeterminate: false,
        expanded: true,
        children: [],
      };
      
      groupMap.forEach((categoryMap, groupName) => {
        const groupNode: LinkTreeNode = {
          id: `group-${pageName}-${groupName}`,
          type: 'group',
          name: groupName,
          checked: false,
          indeterminate: false,
          expanded: true,
          children: [],
        };
        
        categoryMap.forEach((links, categoryName) => {
          const categoryNode: LinkTreeNode = {
            id: `category-${pageName}-${groupName}-${categoryName}`,
            type: 'category',
            name: categoryName,
            checked: false,
            indeterminate: false,
            expanded: false,
            children: links.map(link => ({
              id: `link-${link.url}`,
              type: 'resource' as const,
              name: link.resourceName || link.domain,
              checked: false,
              indeterminate: false,
              expanded: false,
              link: link,
            })),
          };
          groupNode.children!.push(categoryNode);
        });
        
        pageNode.children!.push(groupNode);
      });
      
      tree.push(pageNode);
    });
    
    return tree;
  };

  // 更新节点状态
  const updateNodeStatus = (node: LinkTreeNode): LinkTreeNode => {
    if (!node.children || node.children.length === 0) {
      return { ...node, indeterminate: false };
    }
    
    const updatedChildren = node.children.map(updateNodeStatus);
    const checkedCount = updatedChildren.filter(c => c.checked).length;
    const indeterminateCount = updatedChildren.filter(c => c.indeterminate).length;
    
    return {
      ...node,
      children: updatedChildren,
      checked: checkedCount === updatedChildren.length && checkedCount > 0,
      indeterminate: indeterminateCount > 0 || (checkedCount > 0 && checkedCount < updatedChildren.length),
    };
  };

  // 递归设置所有子节点的 checked 状态
  const setAllChildrenChecked = (node: LinkTreeNode, checked: boolean): LinkTreeNode => {
    if (!node.children || node.children.length === 0) {
      return { ...node, checked, indeterminate: false };
    }
    
    return {
      ...node,
      checked,
      indeterminate: false,
      children: node.children.map(child => setAllChildrenChecked(child, checked)),
    };
  };

  // 切换节点选中状态
  const toggleNodeChecked = (nodes: LinkTreeNode[], nodeId: string): LinkTreeNode[] => {
    return nodes.map(node => {
      if (node.id === nodeId) {
        const newNode = setAllChildrenChecked(node, !node.checked);
        return newNode;
      }
      
      if (node.children) {
        return {
          ...node,
          children: toggleNodeChecked(node.children, nodeId),
        };
      }
      
      return node;
    }).map(updateNodeStatus);
  };

  // 切换节点展开状态
  const toggleNodeExpanded = (nodes: LinkTreeNode[], nodeId: string): LinkTreeNode[] => {
    return nodes.map(node => {
      if (node.id === nodeId) {
        return { ...node, expanded: !node.expanded };
      }
      
      if (node.children) {
        return {
          ...node,
          children: toggleNodeExpanded(node.children, nodeId),
        };
      }
      
      return node;
    });
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    const allChecked = treeData.every(node => node.checked);
    setTreeData(treeData.map(node => setAllChildrenChecked(node, !allChecked)).map(updateNodeStatus));
  };

  // 获取所有选中的链接
  const getSelectedLinks = (nodes: LinkTreeNode[]): LinkInfo[] => {
    const links: LinkInfo[] = [];
    
    const traverse = (node: LinkTreeNode) => {
      if (node.type === 'resource' && node.checked && node.link) {
        links.push(node.link);
      }
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    
    nodes.forEach(traverse);
    return links;
  };

  // 统计选中数量
  const getSelectedCount = (nodes: LinkTreeNode[]): number => {
    return getSelectedLinks(nodes).length;
  };

  // 添加排除域名
  const handleAddDomain = () => {
    const domain = newDomain.trim().toLowerCase();
    if (domain && !excludedDomains.includes(domain)) {
      setExcludedDomains([...excludedDomains, domain]);
      setNewDomain('');
    }
  };

  // 快速添加建议域名
  const handleAddSuggested = (domain: string) => {
    if (!excludedDomains.includes(domain)) {
      setExcludedDomains([...excludedDomains, domain]);
    }
  };

  // 移除排除域名
  const handleRemoveDomain = (domain: string) => {
    setExcludedDomains(excludedDomains.filter(d => d !== domain));
  };

  // 恢复默认域名
  const handleRestoreDefaults = () => {
    const customOnly = excludedDomains.filter(d => !isDefaultDomain(d));
    setExcludedDomains([...DEFAULT_EXCLUDED_DOMAINS, ...customOnly]);
  };

  // 清空所有自定义域名
  const handleClearCustom = () => {
    setExcludedDomains(excludedDomains.filter(d => isDefaultDomain(d)));
  };

  // 扫描链接
  const handleScan = async () => {
    setIsScanning(true);
    setMessage(null);
    try {
      const res = await fetch('/api/link-check?mode=scan');
      if (!res.ok) throw new Error('扫描失败');
      const data: LinkScanResult = await res.json();
      setScanResult(data);
      const tree = buildTree(data.links);
      setTreeData(tree);
      setCheckResults([]);
      setSelectedItems(new Set());
      setSortField('status');
      setSortDirection('asc');
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setIsScanning(false);
    }
  };

  // 检测链接 - 并行检测或者对已选结果进行重新检测
  const handleCheck = async () => {
    const isRetry = checkResults.length > 0;
    let linksToCheck: LinkInfo[] = [];

    if (isRetry) {
      linksToCheck = scanResult?.links.filter(l => selectedItems.has(l.url)) || [];
      if (linksToCheck.length === 0) {
        setMessage({ type: 'error', text: '请在下方的列表中勾选要重新检测的链接' });
        return;
      }
    } else {
      linksToCheck = getSelectedLinks(treeData);
      if (linksToCheck.length === 0) {
        setMessage({ type: 'error', text: '请先选择要检测的链接' });
        return;
      }
    }
    
    setIsChecking(true);
    setProgress(0);
    if (!isRetry) setCheckResults([]);
    onTaskStart?.('weblink', isRetry ? '重新检测选中链接' : '网站链接检测');
    
    const urls = linksToCheck.map(l => l.url);
    const concurrency = 20;
    const results: LinkCheckResult[] = [];
    let completed = 0;
    
    const checkSingleLink = async (url: string): Promise<LinkCheckResult> => {
      const res = await fetch(`/api/link-check?mode=check&url=${encodeURIComponent(url)}&excluded=${encodeURIComponent(excludedDomains.join(','))}`);
      if (res.ok) {
        return await res.json();
      }
      return {
        url,
        domain: new URL(url).hostname,
        status: '网站失效',
        error: '请求失败',
      };
    };

    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(checkSingleLink));
      results.push(...batchResults);
      
      completed += batch.length;
      const currentProgress = Math.min(100, Math.round((completed / urls.length) * 100));
      setProgress(currentProgress);
      onTaskProgress?.('weblink', currentProgress);
    }
    
    const finalResults = results.map((result, index) => ({
      ...result,
      resourceName: linksToCheck[index]?.resourceName,
      resourceStatus: linksToCheck[index]?.resourceStatus,
    }));
    
    if (isRetry) {
      const merged = [...checkResults];
      finalResults.forEach(nr => {
         const idx = merged.findIndex(r => r.url === nr.url);
         if (idx !== -1) merged[idx] = nr;
         else merged.push(nr);
      });
      setCheckResults(merged);
    } else {
      setCheckResults(finalResults);
    }
    setIsChecking(false);
    setProgress(100);
    onTaskEnd?.('weblink', isRetry ? '重新检测完成' : '网站链接检测完成');
  };

  // 应用状态更新
  const handleApply = async () => {
    if (selectedItems.size === 0) return;
    
    setIsApplying(true);
    try {
      const updates: { source: string; path: string[]; status: string }[] = [];
      
      checkResults.forEach((result) => {
        if (selectedItems.has(result.url) && (result.status === '网站失效' || result.status === '网站超时')) {
          const link = getSelectedLinks(treeData).find(l => l.url === result.url);
          if (link) {
            updates.push({
              source: link.source,
              path: link.path.slice(0, -1),
              status: result.status,
            });
          }
        }
      });
      
      const res = await fetch('/api/link-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      
      if (!res.ok) throw new Error('更新失败');
      
      const data = await res.json();
      setMessage({ type: 'success', text: `成功更新 ${data.success} 个资源状态` });
      setSelectedItems(new Set());
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setIsApplying(false);
    }
  };

  // 统计
  const stats = {
    total: checkResults.length,
    ok: checkResults.filter(r => r.status === 'ok').length,
    '网站失效': checkResults.filter(r => r.status === '网站失效').length,
    '网站超时': checkResults.filter(r => r.status === '网站超时').length,
    excluded: checkResults.filter(r => r.status === 'excluded').length,
    allFailed: checkResults.filter(r => 
      r.status === '网站失效' || r.status === '网站超时' || 
      r.resourceStatus === '官网失效' || r.resourceStatus === 'stale'
    ).length,
  };

  // 渲染树节点
  const renderTreeNode = (node: LinkTreeNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const indent = depth * 24;
    
    return (
      <div key={node.id}>
        <div 
          style={{ 
            ...STYLES.treeNode, 
            paddingLeft: `${12 + indent}px`,
            background: node.type === 'resource' ? 'transparent' : '#fafafa',
          }}
        >
          {hasChildren ? (
            <button
              onClick={() => setTreeData(toggleNodeExpanded(treeData, node.id))}
              style={STYLES.button.icon}
            >
              {node.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span style={{ width: '16px' }} />
          )}
          
          
          <input
            type="checkbox"
            checked={node.checked}
            ref={el => {
              if (el) el.indeterminate = node.indeterminate;
            }}
            onChange={() => setTreeData(toggleNodeChecked(treeData, node.id))}
            style={{ cursor: 'pointer' }}
          />
          
          {getLinkNodeIcon(node)}
          
          
          <span style={{ 
            flex: 1, 
            fontSize: node.type === 'resource' ? '13px' : '14px',
            fontWeight: node.type === 'resource' ? 400 : 500,
            color: node.type === 'resource' ? '#475569' : '#1e293b',
          }}>
            {node.name}
          </span>
          
          {hasChildren && (
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              {node.children!.filter(c => c.checked).length}/{node.children!.length}
            </span>
          )}
        </div>
        
        {hasChildren && node.expanded && (
          <div>
            {node.children!.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* 排除域名配置 */}
      <div style={STYLES.card.base}>
        <div style={STYLES.card.header}>
          <Shield size={20} style={STYLES.card.headerIcon} />
          <span style={STYLES.card.headerTitle}>排除域名配置</span>
          <span style={STYLES.card.headerCount}>
            ({excludedDomains.length} 个域名)
          </span>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            style={{ ...STYLES.button.secondary, ...STYLES.card.headerExtra }}
          >
            {showSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showSettings ? '收起' : '展开'}
          </button>
        </div>
        {showSettings && (
          <div style={STYLES.card.body}>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
              以下域名的链接将被跳过检测。蓝色标签为系统默认，灰色标签为自定义添加。
            </p>
            
            {/* 已添加的域名 */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>当前排除列表：</span>
                <button 
                  onClick={handleRestoreDefaults}
                  style={{ ...STYLES.button.small, display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="恢复默认域名"
                >
                  <RotateCcw size={12} />
                  恢复默认
                </button>
                {customDomains.length > 0 && (
                  <button 
                    onClick={handleClearCustom}
                    style={{ ...STYLES.button.small, display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}
                    title="清空自定义域名"
                  >
                    <Trash2 size={12} />
                    清空自定义 ({customDomains.length})
                  </button>
                )}
              </div>
              
              
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {excludedDomains.map(domain => (
                  <span key={domain} style={isDefaultDomain(domain) ? STYLES.tagDefault : STYLES.tag}>
                    <Globe size={12} />
                    {domain}
                    {isDefaultDomain(domain) && <span style={{ fontSize: '10px', opacity: 0.7 }}>(默认)</span>}
                    <button
                      onClick={() => handleRemoveDomain(domain)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer', 
                        padding: 0, 
                        marginLeft: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: 0.6,
                      }}
                      title="移除此域名"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            
            {/* 快捷添加建议域名 */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>快捷添加：</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {SUGGESTED_DOMAINS.filter(s => !excludedDomains.includes(s.domain)).map(suggestion => (
                  <span 
                    key={suggestion.domain}
                    onClick={() => handleAddSuggested(suggestion.domain)}
                    style={STYLES.suggestedTag}
                    title="点击添加"
                  >
                    <Plus size={12} />
                    {suggestion.label}
                  </span>
                ))}
              </div>
            </div>
            
            {/* 手动添加新域名 */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={newDomain}
                onChange={e => setNewDomain(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddDomain()}
                placeholder="输入自定义域名，如 example.com"
                style={{ ...STYLES.input, flex: 1 }}
              />
              <button onClick={handleAddDomain} style={STYLES.button.secondary}>
                <Plus size={16} />
                添加
              </button>
            </div>

            {/* 操作按钮区 */}
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center' }}>
                <button
                  onClick={handleScan}
                  disabled={isScanning}
                  style={{ ...STYLES.button.primary, opacity: isScanning ? 0.7 : 1 }}
                >
                  {isScanning ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                  扫描链接
                </button>
                
                {scanResult && (
                  <>
                    <button
                      onClick={handleCheck}
                      disabled={isChecking || (checkResults.length === 0 ? getSelectedCount(treeData) === 0 : selectedItems.size === 0)}
                      style={{ ...STYLES.button.primary, opacity: isChecking || (checkResults.length === 0 ? getSelectedCount(treeData) === 0 : selectedItems.size === 0) ? 0.7 : 1 }}
                    >
                      {isChecking ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                      {checkResults.length > 0 ? `重新检测勾选 (${selectedItems.size})` : `并行检测选中 (${getSelectedCount(treeData)})`}
                    </button>
                    
                    <button
                      onClick={handleSaveResults}
                      style={STYLES.button.secondary}
                      title="保存当前的检测和结果到本地缓存"
                    >
                      <Save size={16} />
                      保存结果
                    </button>
                    
                    <span style={{ color: '#64748b', fontSize: '14px' }}>
                      共 <strong>{scanResult.total}</strong> 个链接，<strong>{scanResult.unique}</strong> 个唯一下级域名
                    </span>
                  </>
                )}
                
                {hasSavedData && !scanResult && (
                  <button
                    onClick={handleLoadResults}
                    style={{ ...STYLES.button.secondary, color: '#3b82f6', borderColor: '#3b82f6' }}
                    title="从本地缓存读取上次的结果"
                  >
                    读取上次结果
                  </button>
                )}
              </div>
              
              {isChecking && (
                <div style={{ marginTop: '16px' }}>
                  <div style={STYLES.progress.container}>
                    <div style={STYLES.progress.bar(progress)} />
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', textAlign: 'center' }}>
                    正在并行检测... {progress}%
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* 消息提示 */}
      {message && (
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px',
          background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: message.type === 'success' ? '#166534' : '#991b1b',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
          {message.text}
        </div>
      )}

      {/* 资源树形选择 */}
      {treeData.length > 0 && checkResults.length === 0 && (
        <div style={STYLES.card.base}>
          <div style={STYLES.card.header}>
            <Layers size={20} style={STYLES.card.headerIcon} />
            <span style={STYLES.card.headerTitle}>选择检测范围</span>
            <button 
              onClick={handleSelectAll}
              style={{ ...STYLES.button.secondary, ...STYLES.card.headerExtra }}
            >
              {treeData.every(node => node.checked) ? '取消全选' : '全选'}
            </button>
          </div>
          <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            {treeData.map(node => renderTreeNode(node))}
          </div>
        </div>
      )}

      {/* 结果统计 */}
      {checkResults.length > 0 && (
        <div style={{ ...STYLES.card.base, overflow: 'visible' }}>
          <div style={STYLES.body}>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ fontSize: '14px', color: '#334155' }}>正常: {stats.ok}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ fontSize: '14px', color: '#334155' }}>网站失效: {stats['网站失效']}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ fontSize: '14px', color: '#334155' }}>网站超时: {stats['网站超时']}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#94a3b8' }} />
                <span style={{ fontSize: '14px', color: '#334155' }}>已排除: {stats.excluded}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#dc2626' }} />
                <span style={{ fontSize: '14px', color: '#334155' }}>全部异常: {stats.allFailed}</span>
              </div>
            </div>
            
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }} ref={filterDropdownRef}>
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  style={{
                    ...STYLES.button.secondary,
                    background: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px'
                  }}
                >
                  <Filter size={16} style={{ color: '#64748b' }} />
                  <span>筛选 ({filter.length})</span>
                  {isFilterOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                
                <div 
                  className={`portal-popup ${isFilterOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
                  style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '12px',
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
                  padding: '8px',
                  zIndex: 50,
                  minWidth: '200px',
                  visibility: isFilterOpen ? 'visible' : 'hidden',
                  transformOrigin: 'top right',
                  pointerEvents: isFilterOpen ? 'auto' : 'none'
                }}>
                  {[
                    { value: 'ok', label: '正常', count: stats.ok, color: '#22c55e' },
                      { value: '网站失效', label: '网站失效', count: stats['网站失效'], color: '#ef4444' },
                      { value: '网站超时', label: '网站超时', count: stats['网站超时'], color: '#f59e0b' },
                      { value: 'excluded', label: '已排除', count: stats.excluded, color: '#94a3b8' }
                    ].map(opt => (
                      <label
                        key={opt.value}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <input
                          type="checkbox"
                          checked={filter.includes(opt.value as LinkFilterType)}
                          onChange={e => {
                            if (e.target.checked) {
                              setFilter([...filter, opt.value as LinkFilterType]);
                            } else {
                              setFilter(filter.filter(f => f !== opt.value));
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: opt.color }} />
                        <span style={{ fontSize: '13px', color: '#334155', flex: 1 }}>{opt.label}</span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{opt.count}</span>
                      </label>
                    ))}
                </div>
              </div>
              
              
              <button 
                onClick={() => {
                  const failedUrls = sortedAndFilteredResults.filter(r => r.status !== 'ok').map(r => r.url);
                  setSelectedItems(new Set(failedUrls));
                }} 
                style={STYLES.button.secondary}
              >
                全选异常
              </button>

              
              <button
                onClick={handleApply}
                disabled={selectedItems.size === 0 || isApplying}
                style={{ ...STYLES.button.danger, opacity: selectedItems.size === 0 ? 0.5 : 1 }}
              >
                {isApplying ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                应用选中 ({selectedItems.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 已排除链接按域名分组显示 */}
      {filter.includes('excluded') && excludedByDomain.size > 0 && (
        <div style={STYLES.card.base}>
          <div style={STYLES.card.header}>
            <Shield size={20} style={STYLES.card.headerIcon} />
            <span style={STYLES.card.headerTitle}>已排除链接（按域名分组）</span>
          </div>
          <div style={STYLES.card.body}>
            {Array.from(excludedByDomain.entries()).map(([domain, results]) => (
              <div key={domain} style={STYLES.excludedGroup}>
                <div style={STYLES.excludedGroupHeader}>
                  <Globe size={14} />
                  {domain}
                  <span style={STYLES.excludedGroupCount}>{results.length} 个链接</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {results.map((result, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2563eb', textDecoration: 'none', flex: 1 }}
                      >
                        {truncateUrl(result.url, 60)}
                      </a>
                      <span style={{ color: '#64748b', fontSize: '12px' }}>
                        {result.resourceName || '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 结果列表 */}
      {sortedAndFilteredResults.length > 0 && !filter.includes('excluded') && (
        <div style={STYLES.card.base}>
          <div style={{ overflowX: 'auto' }}>
            <table style={STYLES.table}>
              <thead>
                <tr>
                  <th style={{ ...STYLES.th, width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedItems.size === sortedAndFilteredResults.filter(r => r.status !== 'ok').length && sortedAndFilteredResults.some(r => r.status !== 'ok')}
                      onChange={() => {
                        const failedUrls = sortedAndFilteredResults.filter(r => r.status !== 'ok').map(r => r.url);
                        setSelectedItems(selectedItems.size === failedUrls.length ? new Set() : new Set(failedUrls));
                      }}
                    />
                  </th>
                  <th style={STYLES.th}>链接</th>
                  <th style={STYLES.th}>资源名称</th>
                  <th 
                    style={STYLES.thSortable}
                    onClick={() => handleSort('resourceStatus')}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                  >
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      后台状态
                      {renderSortIcon('resourceStatus')}
                    </span>
                  </th>
                  <th 
                    style={STYLES.thSortable}
                    onClick={() => handleSort('status')}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                  >
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      检测状态
                      {renderSortIcon('status')}
                    </span>
                  </th>
                  <th 
                    style={STYLES.thSortable}
                    onClick={() => handleSort('httpCode')}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                  >
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      HTTP
                      {renderSortIcon('httpCode')}
                    </span>
                  </th>
                  <th 
                    style={STYLES.thSortable}
                    onClick={() => handleSort('domain')}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                  >
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      域名
                      {renderSortIcon('domain')}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedAndFilteredResults.map((result, index) => (
                  <tr key={result.url + index}>
                    <td style={STYLES.td}>
                      <input
                        type="checkbox"
                        checked={selectedItems.has(result.url)}
                        onChange={() => {
                          const newSelected = new Set(selectedItems);
                          if (newSelected.has(result.url)) {
                            newSelected.delete(result.url);
                          } else {
                            newSelected.add(result.url);
                          }
                          setSelectedItems(newSelected);
                        }}
                      />
                    </td>
                    <td style={STYLES.td}>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2563eb', textDecoration: 'none' }}
                      >
                        {truncateUrl(result.url, 40)}
                      </a>
                    </td>
                    <td style={{ ...STYLES.td, color: '#64748b' }}>
                      {result.resourceName || '-'}
                    </td>
                    <td style={STYLES.td}>
                      {result.resourceStatus ? (
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 500,
                          ...STYLES.badge[result.resourceStatus as keyof typeof STYLES.badge] || STYLES.badge.ok
                        }}>
                          {getLinkStatusLabel(result.resourceStatus)}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>-</span>
                      )}
                    </td>
                    <td style={STYLES.td}>
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 500,
                        ...STYLES.badge[result.status as keyof typeof STYLES.badge]
                      }}>
                        {getLinkStatusIcon(result.status)}
                        {getLinkStatusLabel(result.status)}
                      </span>
                    </td>
                    <td style={STYLES.td}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        background: '#f1f5f9',
                        color: '#475569',
                      }}>
                        {result.httpCode || '-'}
                      </span>
                    </td>
                    <td style={{ ...STYLES.td, color: '#64748b', fontSize: '13px' }}>
                      {result.domain}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}