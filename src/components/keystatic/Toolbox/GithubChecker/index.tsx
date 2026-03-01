// src/components/keystatic/Toolbox/GithubChecker.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Github, 
  Search, 
  AlertTriangle, 
  XCircle, 
  CheckCircle, 
  Clock, 
  Archive,
  Play,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Filter,
  Download,
  Layers,
  Folder,
  FolderOpen,
  FileText,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Check
} from 'lucide-react';
import { useGithubToken } from '../ToolboxPage';

// --- 类型定义 ---
interface GitHubRepoInfo {
  url: string;
  owner: string;
  repo: string;
  source: string;
  path: string[];
}

interface CheckResult {
  url: string;
  owner: string;
  repo: string;
  exists: boolean;
  archived: boolean;
  pushedAt: string | null;
  staleYears: number | null;
  status: 'ok' | 'stale' | 'archived' | 'failed';
  error?: string;
}

// 检测选项类型
interface CheckOptions {
  checkArchived: boolean;  // 是否检测归档
  checkStale: boolean;     // 是否检测长期未更新
}

interface ScanResult {
  total: number;
  unique: number;
  repos: GitHubRepoInfo[];
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
  repo?: GitHubRepoInfo;
}

type FilterType = 'all' | 'ok' | 'stale' | 'archived' | 'failed';
type SortField = 'status' | 'pushedAt' | 'staleYears' | null;
type SortDirection = 'asc' | 'desc';

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
  inputWithButton: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  inputField: {
    flex: 1,
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
    success: {
      padding: '8px 16px',
      fontSize: '13px',
      fontWeight: 500,
      color: 'white',
      background: '#22c55e',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
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
    iconButton: {
      padding: '10px 12px',
      background: '#f1f5f9',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  },
  badge: {
    ok: { background: '#dcfce7', color: '#166534' },
    stale: { background: '#fef3c7', color: '#92400e' },
    archived: { background: '#ede9fe', color: '#5b21b6' },
    failed: { background: '#fee2e2', color: '#991b1b' },
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
  thSortable: {
    padding: '12px 16px',
    textAlign: 'left' as const,
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    borderBottom: '1px solid #e2e8f0',
    background: '#f8fafc',
    cursor: 'pointer',
    userSelect: 'none' as const,
    transition: 'background 0.15s',
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    borderBottom: '1px solid #f1f5f9',
  },
  treeNode: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderBottom: '1px solid #f1f5f9',
    transition: 'background 0.15s',
  },
  tokenStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
  },
  tokenSaved: {
    background: '#dcfce7',
    color: '#166534',
  },
  tokenUnsaved: {
    background: '#fef3c7',
    color: '#92400e',
  },
};

// --- 辅助函数 ---
const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'ok': return <CheckCircle size={16} style={{ color: '#22c55e' }} />;
    case 'stale': return <AlertTriangle size={16} style={{ color: '#f59e0b' }} />;
    case 'archived': return <Archive size={16} style={{ color: '#8b5cf6' }} />;
    case 'failed': return <XCircle size={16} style={{ color: '#ef4444' }} />;
    default: return null;
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'ok': return '正常';
    case 'stale': return '长期未更新';
    case 'archived': return '已归档';
    case 'failed': return '已失效';
    default: return status;
  }
};

// 状态排序权重
const getStatusWeight = (status: string): number => {
  switch (status) {
    case 'failed': return 0;
    case 'archived': return 1;
    case 'stale': return 2;
    case 'ok': return 3;
    default: return 4;
  }
};

const getNodeIcon = (node: TreeNode) => {
  switch (node.type) {
    case 'page': return <Layers size={16} style={{ color: '#8b5cf6' }} />;
    case 'group': return node.expanded ? <FolderOpen size={16} style={{ color: '#3b82f6' }} /> : <Folder size={16} style={{ color: '#3b82f6' }} />;
    case 'category': return <FileText size={16} style={{ color: '#10b981' }} />;
    case 'resource': return <Github size={14} style={{ color: '#64748b' }} />;
    default: return null;
  }
};

// --- 主组件 ---
interface GithubCheckerProps {
  onDataStatusChange?: (hasData: boolean) => void;
}

export function GithubChecker({ onDataStatusChange }: GithubCheckerProps) {
  const { githubToken, setGithubToken, saveToken, resetToken, isTokenSaved } = useGithubToken();
  const [staleYears, setStaleYears] = useState(3);
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

  const [showToken, setShowToken] = useState(false);
  
  // 检测选项 - 默认都开启
  const [checkOptions, setCheckOptions] = useState<CheckOptions>({
    checkArchived: true,
    checkStale: true,
  });
  
  // 排序状态 - 默认按状态排序
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // 通知父组件数据状态变化
  const onDataStatusChangeRef = useRef(onDataStatusChange);
  // 使用 ref 记录上一次的状态，防止重复调用导致父组件频繁重绘丢失焦点
  const lastDataStatusRef = useRef<boolean>(false);

  useEffect(() => {
    onDataStatusChangeRef.current = onDataStatusChange;
  }, [onDataStatusChange]);

  useEffect(() => {
    const hasData = scanResult !== null || checkResults.length > 0;
    // 只有当状态真正发生改变时，才通知父组件
    if (lastDataStatusRef.current !== hasData) {
      lastDataStatusRef.current = hasData;
      onDataStatusChangeRef.current?.(hasData);
    }
  }, [scanResult, checkResults]);

  // 排序函数
  const handleSort = (field: SortField) => {
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
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} style={{ color: '#94a3b8', marginLeft: '4px' }} />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp size={14} style={{ color: '#2563eb', marginLeft: '4px' }} />;
    }
    return <ArrowDown size={14} style={{ color: '#2563eb', marginLeft: '4px' }} />;
  };

  // 筛选和排序后的结果
  const sortedAndFilteredResults = useMemo(() => {
    let results = checkResults.filter(r => {
      if (filter === 'all') return true;
      return r.status === filter;
    });

    if (sortField) {
      results = [...results].sort((a, b) => {
        let comparison = 0;
        
        switch (sortField) {
          case 'status':
            comparison = getStatusWeight(a.status) - getStatusWeight(b.status);
            break;
          case 'pushedAt':
            const dateA = a.pushedAt ? new Date(a.pushedAt).getTime() : 0;
            const dateB = b.pushedAt ? new Date(b.pushedAt).getTime() : 0;
            comparison = dateA - dateB;
            break;
          case 'staleYears':
            const yearsA = a.staleYears ?? -1;
            const yearsB = b.staleYears ?? -1;
            comparison = yearsA - yearsB;
            break;
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return results;
  }, [checkResults, filter, sortField, sortDirection]);

  // 将扫描结果转换为树形结构
  const buildTree = (repos: GitHubRepoInfo[]): TreeNode[] => {
    const pageMap = new Map<string, Map<string, Map<string, GitHubRepoInfo[]>>>();
    
    repos.forEach(repo => {
      const parts = repo.source.replace('.json', '').split('--');
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
      
      const categoryIndex = repo.path.findIndex(p => p === 'categories');
      let categoryName = '顶部资源';
      if (categoryIndex !== -1 && repo.path[categoryIndex + 2]) {
        categoryName = `分类: ${repo.path[categoryIndex + 2]}`;
      }
      
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, []);
      }
      categoryMap.get(categoryName)!.push(repo);
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
        
        categoryMap.forEach((repos, categoryName) => {
          const categoryNode: TreeNode = {
            id: `category-${pageName}-${groupName}-${categoryName}`,
            type: 'category',
            name: categoryName,
            checked: false,
            indeterminate: false,
            expanded: false,
            children: repos.map(repo => ({
              id: `repo-${repo.url}`,
              type: 'resource' as const,
              name: `${repo.owner}/${repo.repo}`,
              checked: false,
              indeterminate: false,
              expanded: false,
              repo: repo,
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

  // 获取所有选中的资源
  const getSelectedRepos = (nodes: TreeNode[]): GitHubRepoInfo[] => {
    const repos: GitHubRepoInfo[] = [];
    
    const traverse = (node: TreeNode) => {
      if (node.type === 'resource' && node.checked && node.repo) {
        repos.push(node.repo);
      }
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    
    nodes.forEach(traverse);
    return repos;
  };

  // 统计选中数量
  const getSelectedCount = (nodes: TreeNode[]): number => {
    return getSelectedRepos(nodes).length;
  };

  // 扫描 GitHub 链接
  const handleScan = async () => {
    setIsScanning(true);
    setMessage(null);
    try {
      const res = await fetch('/api/github-check?mode=scan');
      if (!res.ok) throw new Error('扫描失败');
      const data: ScanResult = await res.json();
      setScanResult(data);
      const tree = buildTree(data.repos);
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

  // 检测仓库状态 - 并行检测
  const handleCheck = async () => {
    const selectedRepos = getSelectedRepos(treeData);
    if (selectedRepos.length === 0) {
      setMessage({ type: 'error', text: '请先选择要检测的资源' });
      return;
    }
    
    setIsChecking(true);
    setProgress(0);
    setCheckResults([]);
    
    const concurrency = githubToken ? 20 : 10;
    const uniqueRepos = new Map<string, { owner: string; repo: string }>();
    
    selectedRepos.forEach(r => {
      uniqueRepos.set(`${r.owner}/${r.repo}`, { owner: r.owner, repo: r.repo });
    });
    
    const uniqueList = Array.from(uniqueRepos.values());
    const results: CheckResult[] = [];
    let completed = 0;
    
    const checkSingleRepo = async (repoInfo: { owner: string; repo: string }): Promise<CheckResult> => {
      const res = await fetch(`/api/github-check?mode=check&owner=${repoInfo.owner}&repo=${repoInfo.repo}&token=${encodeURIComponent(githubToken)}`);
      if (res.ok) {
        return await res.json();
      }
      return {
        url: `https://github.com/${repoInfo.owner}/${repoInfo.repo}`,
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        exists: false,
        archived: false,
        pushedAt: null,
        staleYears: null,
        status: 'failed',
        error: '请求失败',
      };
    };

    for (let i = 0; i < uniqueList.length; i += concurrency) {
      const batch = uniqueList.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(checkSingleRepo));
      results.push(...batchResults);
      
      completed += batch.length;
      setProgress(Math.min(100, Math.round((completed / uniqueList.length) * 100)));
      
      if (i + concurrency < uniqueList.length) {
        await new Promise(resolve => setTimeout(resolve, githubToken ? 100 : 500));
      }
    }
    
    const resultMap = new Map<string, CheckResult>();
    results.forEach(r => resultMap.set(`${r.owner}/${r.repo}`, r));
    
    const finalResults: CheckResult[] = selectedRepos.map(r => {
      const key = `${r.owner}/${r.repo}`;
      const result = resultMap.get(key);
      if (result) {
        // 根据检测选项决定状态
        let finalStatus = result.status;
        
        // 如果开启了归档检测，且仓库已归档，标记为archived
        if (checkOptions.checkArchived && result.archived) {
          finalStatus = 'archived';
        }
        // 如果仓库未归档（或未开启归档检测），且开启了长期未更新检测
        else if (checkOptions.checkStale && result.staleYears !== null && result.staleYears >= staleYears) {
          finalStatus = 'stale';
        }
        // 如果两个检测都关闭，只检测仓库是否存在
        else if (!checkOptions.checkArchived && !checkOptions.checkStale) {
          finalStatus = result.exists ? 'ok' : 'failed';
        }
        
        return { ...result, status: finalStatus };
      }
      return {
        url: r.url,
        owner: r.owner,
        repo: r.repo,
        exists: false,
        archived: false,
        pushedAt: null,
        staleYears: null,
        status: 'failed' as const,
        error: '未检测',
      };
    });
    
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
        if (selectedItems.has(result.url) && result.status !== 'ok') {
          const repo = getSelectedRepos(treeData).find(r => r.url === result.url);
          if (repo) {
            updates.push({
              source: repo.source,
              path: repo.path.slice(0, -1),
              status: result.status,
            });
          }
        }
      });
      
      const res = await fetch('/api/github-check', {
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
    stale: checkResults.filter(r => r.status === 'stale').length,
    archived: checkResults.filter(r => r.status === 'archived').length,
    failed: checkResults.filter(r => r.status === 'failed').length,
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
          <Github size={28} />
          GitHub 项目状态检测
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          批量检测所有 GitHub 仓库的更新状态，标记长期未更新或已失效的资源
          {githubToken && <span style={{ color: '#22c55e', marginLeft: '8px' }}>✓ 已配置 GitHub Token，并发数: 20</span>}
          {!githubToken && <span style={{ color: '#f59e0b', marginLeft: '8px' }}>未配置 Token，并发数: 10</span>}
        </p>
      </div>

      {/* 配置卡片 */}
      <div style={STYLES.card}>
        <div style={STYLES.header}>
          <Settings size={20} style={{ color: '#64748b' }} />
          <span style={{ fontWeight: 600, color: '#334155' }}>检测配置</span>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#334155', marginBottom: '8px' }}>
                  GitHub Token (全局配置，批量添加也会使用)
                </label>
                
                {/* Token输入框和按钮 */}
                <div style={STYLES.inputWithButton}>
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={githubToken}
                    onChange={e => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxx..."
                    style={STYLES.inputField}
                  />
                  <button
                    onClick={() => setShowToken(!showToken)}
                    style={STYLES.button.iconButton}
                    title={showToken ? '隐藏' : '显示'}
                  >
                    {showToken ? <EyeOff size={18} style={{ color: '#64748b' }} /> : <Eye size={18} style={{ color: '#64748b' }} />}
                  </button>
                </div>
                
                {/* Token状态和操作按钮 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  {/* 状态指示 */}
                  <span style={{
                    ...STYLES.tokenStatus,
                    ...(isTokenSaved ? STYLES.tokenSaved : STYLES.tokenUnsaved)
                  }}>
                    {isTokenSaved ? (
                      <>
                        <Check size={12} />
                        已保存
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={12} />
                        未保存
                      </>
                    )}
                  </span>
                  
                  {/* 保存按钮 */}
                  <button
                    onClick={saveToken}
                    disabled={isTokenSaved}
                    style={{
                      ...STYLES.button.success,
                      opacity: isTokenSaved ? 0.5 : 1,
                      cursor: isTokenSaved ? 'not-allowed' : 'pointer',
                    }}
                    title="保存到浏览器本地存储"
                  >
                    <Save size={14} />
                    保存
                  </button>
                  
                  {/* 重置按钮 */}
                  <button
                    onClick={resetToken}
                    style={{
                      ...STYLES.button.secondary,
                      padding: '8px 16px',
                      fontSize: '13px',
                    }}
                    title="清除Token"
                  >
                    <RotateCcw size={14} />
                    重置
                  </button>
                </div>
                
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
                  无 Token: 60次/小时 | 有 Token: 5000次/小时
                  <br />
                  💡 Token 将保存在浏览器本地存储中，下次访问自动加载
                </p>
              </div>
              
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#334155', marginBottom: '8px' }}>
                  长期未更新阈值 (年)
                </label>
                <select
                  value={staleYears}
                  onChange={e => setStaleYears(Number(e.target.value))}
                  style={{ ...STYLES.input, cursor: 'pointer' }}
                >
                  <option value={1}>1 年</option>
                  <option value={2}>2 年</option>
                  <option value={3}>3 年</option>
                  <option value={5}>5 年</option>
                  <option value={7}>7 年</option>
                </select>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  超过此时间未更新的仓库将标记为"长期未更新"
                </p>
              </div>
            </div>
            
            {/* 检测选项 */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#334155', marginBottom: '12px' }}>
                检测选项
              </label>
              <div style={{ display: 'flex', gap: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={checkOptions.checkArchived}
                    onChange={e => setCheckOptions(prev => ({ ...prev, checkArchived: e.target.checked }))}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <Archive size={16} style={{ color: '#8b5cf6' }} />
                  <span style={{ fontSize: '14px', color: '#334155' }}>检测归档仓库</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={checkOptions.checkStale}
                    onChange={e => setCheckOptions(prev => ({ ...prev, checkStale: e.target.checked }))}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <Clock size={16} style={{ color: '#f59e0b' }} />
                  <span style={{ fontSize: '14px', color: '#334155' }}>检测长期未更新</span>
                </label>
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
                💡 若仓库已归档，将不再检查更新时间；若未开启任何检测，仅检测仓库是否存在
              </p>
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
              扫描项目
            </button>
            
            {scanResult && (
              <>
                <button
                  onClick={handleCheck}
                  disabled={isChecking || getSelectedCount(treeData) === 0}
                  style={{ ...STYLES.button.primary, opacity: isChecking || getSelectedCount(treeData) === 0 ? 0.7 : 1 }}
                >
                  {isChecking ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                  并行检测选中 ({getSelectedCount(treeData)})
                </button>
                
                
                <span style={{ color: '#64748b', fontSize: '14px' }}>
                  共 <strong>{scanResult.total}</strong> 个仓库，<strong>{scanResult.unique}</strong> 个唯一
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
                正在并行检测... {progress}%
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
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
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
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#8b5cf6' }} />
                <span style={{ fontSize: '14px', color: '#334155' }}>已归档: {stats.archived}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ fontSize: '14px', color: '#334155' }}>长期未更新: {stats.stale}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ fontSize: '14px', color: '#334155' }}>已失效: {stats.failed}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Filter size={16} style={{ color: '#64748b' }} />
                <select
                  value={filter}
                  onChange={e => setFilter(e.target.value as FilterType)}
                  style={{ ...STYLES.input, width: 'auto', padding: '8px 12px' }}
                >
                  <option value="all">全部 ({stats.total})</option>
                  <option value="ok">正常 ({stats.ok})</option>
                  <option value="archived">已归档 ({stats.archived})</option>
                  <option value="stale">长期未更新 ({stats.stale})</option>
                  <option value="failed">已失效 ({stats.failed})</option>
                </select>
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

      {/* 结果列表 */}
      {sortedAndFilteredResults.length > 0 && (
        <div style={STYLES.card}>
          <div style={{ overflowX: 'auto' }}>
            <table style={STYLES.table}>
              <thead>
                <tr>
                  <th style={{ ...STYLES.th, width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedItems.size === sortedAndFilteredResults.filter(r => r.status !== 'ok').length}
                      onChange={() => {
                        const failedUrls = sortedAndFilteredResults.filter(r => r.status !== 'ok').map(r => r.url);
                        setSelectedItems(selectedItems.size === failedUrls.length ? new Set() : new Set(failedUrls));
                      }}
                    />
                  </th>
                  <th style={STYLES.th}>仓库</th>
                  <th 
                    style={STYLES.thSortable}
                    onClick={() => handleSort('status')}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                  >
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      状态
                      {renderSortIcon('status')}
                    </span>
                  </th>
                  <th 
                    style={STYLES.thSortable}
                    onClick={() => handleSort('pushedAt')}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                  >
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      最后提交
                      {renderSortIcon('pushedAt')}
                    </span>
                  </th>
                  <th 
                    style={STYLES.thSortable}
                    onClick={() => handleSort('staleYears')}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                  >
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      未更新
                      {renderSortIcon('staleYears')}
                    </span>
                  </th>
                  <th style={STYLES.th}>备注</th>
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
                          const newSet = new Set(selectedItems);
                          if (newSet.has(result.url)) {
                            newSet.delete(result.url);
                          } else {
                            newSet.add(result.url);
                          }
                          setSelectedItems(newSet);
                        }}
                        disabled={result.status === 'ok'}
                      />
                    </td>
                    <td style={STYLES.td}>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2563eb', textDecoration: 'none' }}
                      >
                        {result.owner}/{result.repo}
                      </a>
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
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                        <Clock size={14} />
                        {formatDate(result.pushedAt)}
                      </span>
                    </td>
                    <td style={STYLES.td}>
                      {result.staleYears !== null ? `${result.staleYears} 年` : '-'}
                    </td>
                    <td style={STYLES.td}>
                      {result.archived && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}>
                          <Archive size={14} />
                          已归档
                        </span>
                      )}
                      {result.error && !result.archived && (
                        <span style={{ color: '#94a3b8' }}>{result.error}</span>
                      )}
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