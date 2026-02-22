// src/components/keystatic/Toolbox/LinkChecker.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Link, 
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
  Shield,
  RotateCcw,
  Trash2,
  Layers,
  Folder,
  FolderOpen,
  FileText
} from 'lucide-react';

// --- 类型定义 ---
interface LinkInfo {
  url: string;
  domain: string;
  source: string;
  path: string[];
  resourceName?: string;
}

interface CheckResult {
  url: string;
  domain: string;
  status: 'ok' | 'failed' | 'timeout' | 'excluded';
  httpCode?: number;
  error?: string;
  resourceName?: string;
}

interface ScanResult {
  total: number;
  unique: number;
  links: LinkInfo[];
}

// 树形结构节点
interface TreeNode {
  id: string;
  type: 'page' | 'group' | 'category' | 'resource';
  name: string;
  checked: boolean;
  indeterminate: boolean;
  expanded: boolean;
  children?: TreeNode[];
  link?: LinkInfo;
}

type FilterType = 'all' | 'ok' | 'failed' | 'timeout' | 'excluded';

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

// --- 样式常量 ---
const STYLES = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    marginBottom: '16px',
    overflow: 'hidden',
  },
  header: {
    padding: '20px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  body: {
    padding: '20px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'monospace',
  },
  button: {
    primary: {
      padding: '12px 24px',
      fontSize: '14px',
      fontWeight: 600,
      color: 'white',
      background: '#2563eb',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    secondary: {
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: 500,
      color: '#475569',
      background: '#f1f5f9',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    danger: {
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: 500,
      color: 'white',
      background: '#ef4444',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    small: {
      padding: '6px 12px',
      fontSize: '12px',
      fontWeight: 500,
      color: '#475569',
      background: '#f1f5f9',
      borderRadius: '6px',
      border: '1px solid #e2e8f0',
      cursor: 'pointer',
    },
    icon: {
      padding: '4px',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '4px',
    },
  },
  badge: {
    ok: { background: '#dcfce7', color: '#166534' },
    failed: { background: '#fee2e2', color: '#991b1b' },
    timeout: { background: '#fef3c7', color: '#92400e' },
    excluded: { background: '#f1f5f9', color: '#64748b' },
  },
  progress: {
    container: {
      width: '100%',
      height: '8px',
      background: '#e2e8f0',
      borderRadius: '4px',
      overflow: 'hidden',
    },
    bar: (percent: number) => ({
      width: `${percent}%`,
      height: '100%',
      background: percent < 100 ? '#3b82f6' : '#22c55e',
      transition: 'width 0.3s ease',
    }),
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left' as const,
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    borderBottom: '1px solid #e2e8f0',
    background: '#f8fafc',
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    borderBottom: '1px solid #f1f5f9',
  },
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
  treeNode: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderBottom: '1px solid #f1f5f9',
    transition: 'background 0.15s',
  },
};

// --- 辅助函数 ---
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'ok': return <CheckCircle size={16} style={{ color: '#22c55e' }} />;
    case 'failed': return <XCircle size={16} style={{ color: '#ef4444' }} />;
    case 'timeout': return <Clock size={16} style={{ color: '#f59e0b' }} />;
    case 'excluded': return <Shield size={16} style={{ color: '#64748b' }} />;
    default: return null;
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'ok': return '正常';
    case 'failed': return '失效';
    case 'timeout': return '超时';
    case 'excluded': return '已排除';
    default: return status;
  }
};

const truncateUrl = (url: string, maxLength: number = 50): string => {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
};

const isDefaultDomain = (domain: string) => DEFAULT_EXCLUDED_DOMAINS.includes(domain);

const getNodeIcon = (node: TreeNode) => {
  switch (node.type) {
    case 'page': return <Layers size={16} style={{ color: '#8b5cf6' }} />;
    case 'group': return node.expanded ? <FolderOpen size={16} style={{ color: '#3b82f6' }} /> : <Folder size={16} style={{ color: '#3b82f6' }} />;
    case 'category': return <FileText size={16} style={{ color: '#10b981' }} />;
    case 'resource': return <Globe size={14} style={{ color: '#64748b' }} />;
    default: return null;
  }
};

// --- 主组件 ---
interface LinkCheckerProps {
  onDataStatusChange?: (hasData: boolean) => void;
}

export function LinkChecker({ onDataStatusChange }: LinkCheckerProps) {
  const [excludedDomains, setExcludedDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [checkResults, setCheckResults] = useState<CheckResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showSettings, setShowSettings] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  // 将扫描结果转换为树形结构
  const buildTree = (links: LinkInfo[]): TreeNode[] => {
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
    
    const tree: TreeNode[] = [];
    
    pageMap.forEach((groupMap, pageName) => {
      const pageNode: TreeNode = {
        id: `page-${pageName}`,
        type: 'page',
        name: `页面: ${pageName}`,
        checked: false,
        indeterminate: false,
        expanded: true,
        children: [],
      };
      
      groupMap.forEach((categoryMap, groupName) => {
        const groupNode: TreeNode = {
          id: `group-${pageName}-${groupName}`,
          type: 'group',
          name: groupName,
          checked: false,
          indeterminate: false,
          expanded: true,
          children: [],
        };
        
        categoryMap.forEach((links, categoryName) => {
          const categoryNode: TreeNode = {
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
  const updateNodeStatus = (node: TreeNode): TreeNode => {
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
  const setAllChildrenChecked = (node: TreeNode, checked: boolean): TreeNode => {
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
  const toggleNodeChecked = (nodes: TreeNode[], nodeId: string): TreeNode[] => {
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
  const toggleNodeExpanded = (nodes: TreeNode[], nodeId: string): TreeNode[] => {
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
  const getSelectedLinks = (nodes: TreeNode[]): LinkInfo[] => {
    const links: LinkInfo[] = [];
    
    const traverse = (node: TreeNode) => {
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
  const getSelectedCount = (nodes: TreeNode[]): number => {
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
      const data: ScanResult = await res.json();
      setScanResult(data);
      const tree = buildTree(data.links);
      setTreeData(tree);
      setCheckResults([]);
      setSelectedItems(new Set());
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setIsScanning(false);
    }
  };

  // 检测链接
  const handleCheck = async () => {
    const selectedLinks = getSelectedLinks(treeData);
    if (selectedLinks.length === 0) {
      setMessage({ type: 'error', text: '请先选择要检测的链接' });
      return;
    }
    
    setIsChecking(true);
    setProgress(0);
    setCheckResults([]);
    
    const urls = selectedLinks.map(l => l.url);
    const batchSize = 10;
    const results: CheckResult[] = [];
    
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      
      const res = await fetch(`/api/link-check?mode=batch&urls=${encodeURIComponent(JSON.stringify(batch))}&excluded=${encodeURIComponent(excludedDomains.join(','))}`);
      if (res.ok) {
        const batchResults: CheckResult[] = await res.json();
        results.push(...batchResults);
      }
      
      setProgress(Math.min(100, Math.round(((i + batchSize) / urls.length) * 100)));
    }
    
    const finalResults = results.map((result, index) => ({
      ...result,
      resourceName: selectedLinks[index]?.resourceName,
    }));
    
    setCheckResults(finalResults);
    setIsChecking(false);
    setProgress(100);
  };

  // 应用状态更新
  const handleApply = async () => {
    if (selectedItems.size === 0) return;
    
    setIsApplying(true);
    try {
      const updates: { source: string; path: string[]; status: string }[] = [];
      
      checkResults.forEach((result) => {
        if (selectedItems.has(result.url) && result.status === 'failed') {
          const link = getSelectedLinks(treeData).find(l => l.url === result.url);
          if (link) {
            updates.push({
              source: link.source,
              path: link.path.slice(0, -1),
              status: 'failed',
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

  // 筛选结果
  const filteredResults = checkResults.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  // 统计
  const stats = {
    total: checkResults.length,
    ok: checkResults.filter(r => r.status === 'ok').length,
    failed: checkResults.filter(r => r.status === 'failed').length,
    timeout: checkResults.filter(r => r.status === 'timeout').length,
    excluded: checkResults.filter(r => r.status === 'excluded').length,
  };

  // 渲染树节点
  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
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
          
          {getNodeIcon(node)}
          
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
    <div style={STYLES.container}>
      {/* 标题 */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link size={28} />
          网站有效性检测
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          批量检测所有网站链接的有效性，标记失效资源
        </p>
      </div>

      {/* 排除域名配置 */}
      <div style={STYLES.card}>
        <div style={STYLES.header}>
          <Shield size={20} style={{ color: '#64748b' }} />
          <span style={{ fontWeight: 600, color: '#334155' }}>排除域名配置</span>
          <span style={{ marginLeft: '8px', fontSize: '12px', color: '#94a3b8' }}>
            ({excludedDomains.length} 个域名)
          </span>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            style={{ marginLeft: 'auto', ...STYLES.button.secondary, padding: '6px 12px' }}
          >
            {showSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showSettings ? '收起' : '展开'}
          </button>
        </div>
        {showSettings && (
          <div style={STYLES.body}>
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
          </div>
        )}
      </div>

      {/* 操作卡片 */}
      <div style={STYLES.card}>
        <div style={STYLES.body}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
                  disabled={isChecking || getSelectedCount(treeData) === 0}
                  style={{ ...STYLES.button.primary, opacity: isChecking || getSelectedCount(treeData) === 0 ? 0.7 : 1 }}
                >
                  {isChecking ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                  检测选中 ({getSelectedCount(treeData)})
                </button>
                
                <span style={{ color: '#64748b', fontSize: '14px' }}>
                  共 <strong>{scanResult.total}</strong> 个链接，<strong>{scanResult.unique}</strong> 个唯一
                </span>
              </>
            )}
          </div>
          
          {isChecking && (
            <div style={{ marginTop: '16px' }}>
              <div style={STYLES.progress.container}>
                <div style={STYLES.progress.bar(progress)} />
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                正在检测... {progress}%
              </p>
            </div>
          )}
        </div>
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
        <div style={STYLES.card}>
          <div style={STYLES.header}>
            <Layers size={20} style={{ color: '#64748b' }} />
            <span style={{ fontWeight: 600, color: '#334155' }}>选择检测范围</span>
            <button 
              onClick={handleSelectAll}
              style={{ marginLeft: 'auto', ...STYLES.button.secondary, padding: '6px 12px' }}
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
        <div style={STYLES.card}>
          <div style={STYLES.body}>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ fontSize: '14px', color: '#334155' }}>正常: {stats.ok}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ fontSize: '14px', color: '#334155' }}>失效: {stats.failed}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ fontSize: '14px', color: '#334155' }}>超时: {stats.timeout}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#94a3b8' }} />
                <span style={{ fontSize: '14px', color: '#334155' }}>已排除: {stats.excluded}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Filter size={16} style={{ color: '#64748b' }} />
                <select
                  value={filter}
                  onChange={e => setFilter(e.target.value as FilterType)}
                  style={{ ...STYLES.input, width: 'auto', padding: '8px 12px' }}
                >
                  <option value="all">全部 ({stats.total})</option>
                  <option value="ok">正常 ({stats.ok})</option>
                  <option value="failed">失效 ({stats.failed})</option>
                  <option value="timeout">超时 ({stats.timeout})</option>
                  <option value="excluded">已排除 ({stats.excluded})</option>
                </select>
              </div>
              
              <button 
                onClick={() => {
                  const failedUrls = filteredResults.filter(r => r.status === 'failed').map(r => r.url);
                  setSelectedItems(new Set(failedUrls));
                }} 
                style={STYLES.button.secondary}
              >
                全选失效项
              </button>

              <button
                onClick={handleApply}
                disabled={selectedItems.size === 0 || isApplying}
                style={{ ...STYLES.button.danger, opacity: selectedItems.size === 0 ? 0.5 : 1 }}
              >
                {isApplying ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                标记选中为失效 ({selectedItems.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 结果列表 */}
      {filteredResults.length > 0 && (
        <div style={STYLES.card}>
          <div style={{ overflowX: 'auto' }}>
            <table style={STYLES.table}>
              <thead>
                <tr>
                  <th style={{ ...STYLES.th, width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedItems.size === filteredResults.filter(r => r.status === 'failed').length && filteredResults.some(r => r.status === 'failed')}
                      onChange={() => {
                        const failedUrls = filteredResults.filter(r => r.status === 'failed').map(r => r.url);
                        setSelectedItems(selectedItems.size === failedUrls.length ? new Set() : new Set(failedUrls));
                      }}
                    />
                  </th>
                  <th style={STYLES.th}>链接</th>
                  <th style={STYLES.th}>资源名称</th>
                  <th style={STYLES.th}>状态</th>
                  <th style={STYLES.th}>HTTP</th>
                  <th style={STYLES.th}>备注</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result, index) => (
                  <tr key={result.url + index}>
                    <td style={STYLES.td}>
                      <input
                        type="checkbox"
                        checked={selectedItems.has(result.url)}
                        onChange={() => {
                          const newSet = new Set(selectedItems);
                          if (newSet.has(result.url)) {
                            newSet.delete(result.url);
                          } else {
                            newSet.add(result.url);
                          }
                          setSelectedItems(newSet);
                        }}
                        disabled={result.status !== 'failed'}
                      />
                    </td>
                    <td style={STYLES.td}>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={result.url}
                        style={{ color: '#2563eb', textDecoration: 'none', fontSize: '13px' }}
                      >
                        {truncateUrl(result.url, 45)}
                      </a>
                    </td>
                    <td style={STYLES.td}>
                      <span style={{ color: '#334155' }}>{result.resourceName || '-'}</span>
                    </td>
                    <td style={STYLES.td}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 500,
                        ...STYLES.badge[result.status],
                      }}>
                        {getStatusIcon(result.status)}
                        {getStatusLabel(result.status)}
                      </span>
                    </td>
                    <td style={STYLES.td}>
                      <span style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '13px',
                        color: result.httpCode && result.httpCode < 400 ? '#22c55e' : '#ef4444'
                      }}>
                        {result.httpCode || '-'}
                      </span>
                    </td>
                    <td style={STYLES.td}>
                      <span style={{ color: '#94a3b8', fontSize: '13px' }}>{result.error || '-'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
