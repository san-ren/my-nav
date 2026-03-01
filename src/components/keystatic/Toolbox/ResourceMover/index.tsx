// ResourceMover 主组件
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowRightLeft, 
  Folder, 
  FolderOpen, 
  FileText, 
  Layers,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  Check,
} from 'lucide-react';
import type { ResourceItem, TargetLocation } from './types';

// --- 动画样式 ---
const ANIMATION_STYLES = `
  @keyframes expandDown {
    from {
      opacity: 0;
      max-height: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      max-height: 2000px;
      transform: translateY(0);
    }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .tree-children {
    animation: expandDown 0.25s ease-out forwards;
    overflow: hidden;
  }
  
  .tree-node-enter {
    animation: fadeIn 0.2s ease-out forwards;
  }
  
  .chevron-icon {
    transition: transform 0.2s ease;
  }
  
  .chevron-icon.expanded {
    transform: rotate(90deg);
  }
  
  .folder-icon {
    transition: transform 0.2s ease;
  }
  
  .folder-icon:hover {
    transform: scale(1.1);
  }
  
  .tree-node-row {
    transition: all 0.15s ease;
  }
  
  .tree-node-row:hover {
    background: #f1f5f9 !important;
  }
  
  .target-node-row {
    transition: all 0.15s ease;
    cursor: pointer;
  }
  
  .target-node-row:hover {
    background: #eff6ff !important;
  }
  
  .target-node-row.selected {
    background: #dbeafe !important;
    border-left: 3px solid #2563eb;
  }
  
  .resource-row {
    transition: all 0.15s ease;
  }
  
  .resource-row:hover {
    background: #f8fafc;
  }
  
  .resource-row.selected {
    background: #eff6ff;
  }
`;

// --- 样式常量 ---
const STYLES = {
  container: {
    padding: '24px',
    maxWidth: '1400px',
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
      padding: '12px 24px',
      fontSize: '14px',
      fontWeight: 600,
      color: 'white',
      background: '#22c55e',
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
      transition: 'transform 0.2s ease',
    },
  },
  treeNode: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    borderBottom: '1px solid #f1f5f9',
    userSelect: 'none' as const,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    outline: 'none',
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    outline: 'none',
    background: 'white',
    cursor: 'pointer',
  },
};

// --- 辅助函数 ---
const getNodeIcon = (type: string, expanded?: boolean) => {
  switch (type) {
    case 'file': return <Layers size={16} style={{ color: '#8b5cf6' }} />;
    case 'category': return expanded 
      ? <FolderOpen size={16} style={{ color: '#3b82f6' }} /> 
      : <Folder size={16} style={{ color: '#3b82f6' }} />;
    case 'tab': return <FileText size={16} style={{ color: '#10b981' }} />;
    case 'resource': return <ArrowRight size={14} style={{ color: '#64748b' }} />;
    case 'target': return <Folder size={16} style={{ color: '#f59e0b' }} />;
    default: return null;
  }
};

// --- Chevron 组件（带动画） ---
const AnimatedChevron = ({ expanded, size = 16 }: { expanded: boolean; size?: number }) => (
  <ChevronRight 
    size={size} 
    className={`chevron-icon ${expanded ? 'expanded' : ''}`}
    style={{ color: '#64748b' }}
  />
);

// --- 主组件 ---
interface ResourceMoverProps {
  onDataStatusChange?: (hasData: boolean) => void;
}

export function ResourceMover({ onDataStatusChange }: ResourceMoverProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // 数据状态
  const [allResources, setAllResources] = useState<ResourceItem[]>([]);
  const [targetLocations, setTargetLocations] = useState<TargetLocation[]>([]);
  
  // 选择状态
  const [selectedResources, setSelectedResources] = useState<Set<string>>(new Set());
  const [selectedTarget, setSelectedTarget] = useState<TargetLocation | null>(null);
  
  // 筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFile, setFilterFile] = useState<string>('all');
  
  // 展开状态 - 源资源树
  const [sourceExpandedNodes, setSourceExpandedNodes] = useState<Set<string>>(new Set());
  // 展开状态 - 目标位置树
  const [targetExpandedNodes, setTargetExpandedNodes] = useState<Set<string>>(new Set());
  
  // 通知父组件
  useEffect(() => {
    onDataStatusChange?.(selectedResources.size > 0);
  }, [selectedResources.size, onDataStatusChange]);
  
  // 加载数据
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [resourcesRes, targetsRes] = await Promise.all([
        fetch('/api/resource-mover?mode=resources'),
        fetch('/api/resource-mover?mode=targets'),
      ]);
      
      if (resourcesRes.ok) {
        const resources = await resourcesRes.json();
        setAllResources(resources);
      }
      
      if (targetsRes.ok) {
        const targets = await targetsRes.json();
        setTargetLocations(targets);
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadData();
  }, []);
  
  // 筛选后的资源
  const filteredResources = useMemo(() => {
    let result = allResources;
    
    if (filterFile !== 'all') {
      result = result.filter(r => r.location.file === filterFile);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.name.toLowerCase().includes(query) ||
        (r.url && r.url.toLowerCase().includes(query))
      );
    }
    
    return result;
  }, [allResources, filterFile, searchQuery]);
  
  // 构建源资源树形结构
  const sourceTreeData = useMemo(() => {
    const tree: Map<string, Map<string, Map<string, ResourceItem[]>>> = new Map();
    
    filteredResources.forEach(resource => {
      const fileKey = `${resource.location.pageName}--${resource.location.groupName}`;
      const catKey = resource.location.categoryName;
      const tabKey = resource.location.tabName ? `tab:${resource.location.tabName}` : 'resources';
      
      if (!tree.has(fileKey)) {
        tree.set(fileKey, new Map());
      }
      const fileMap = tree.get(fileKey)!;
      
      if (!fileMap.has(catKey)) {
        fileMap.set(catKey, new Map());
      }
      const catMap = fileMap.get(catKey)!;
      
      if (!catMap.has(tabKey)) {
        catMap.set(tabKey, []);
      }
      catMap.get(tabKey)!.push(resource);
    });
    
    return tree;
  }, [filteredResources]);
  
  // 构建目标位置树形结构
  const targetTreeData = useMemo(() => {
    const tree: Map<string, Map<string, Map<string, TargetLocation[]>>> = new Map();
    
    targetLocations.forEach(loc => {
      const fileKey = `${loc.pageName}--${loc.groupName}`;
      const catKey = loc.categoryName;
      const tabKey = loc.tabName ? `tab:${loc.tabName}` : 'resources';
      
      if (!tree.has(fileKey)) {
        tree.set(fileKey, new Map());
      }
      const fileMap = tree.get(fileKey)!;
      
      if (!fileMap.has(catKey)) {
        fileMap.set(catKey, new Map());
      }
      const catMap = fileMap.get(catKey)!;
      
      if (!catMap.has(tabKey)) {
        catMap.set(tabKey, []);
      }
      catMap.get(tabKey)!.push(loc);
    });
    
    return tree;
  }, [targetLocations]);
  
  // 获取所有文件列表
  const fileList = useMemo(() => {
    const files = new Map<string, string>();
    allResources.forEach(r => {
      files.set(r.location.file, `${r.location.pageName} / ${r.location.groupName}`);
    });
    return Array.from(files.entries());
  }, [allResources]);
  
  // 切换源资源节点展开
  const toggleSourceNode = (nodeId: string) => {
    const newExpanded = new Set(sourceExpandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setSourceExpandedNodes(newExpanded);
  };
  
  // 切换目标位置节点展开
  const toggleTargetNode = (nodeId: string) => {
    const newExpanded = new Set(targetExpandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setTargetExpandedNodes(newExpanded);
  };
  
  // 切换资源选择
  const toggleResource = (resourceId: string) => {
    const newSelected = new Set(selectedResources);
    if (newSelected.has(resourceId)) {
      newSelected.delete(resourceId);
    } else {
      newSelected.add(resourceId);
    }
    setSelectedResources(newSelected);
  };
  
  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedResources.size === filteredResources.length) {
      setSelectedResources(new Set());
    } else {
      setSelectedResources(new Set(filteredResources.map(r => r.id)));
    }
  };
  
  // 选择目标位置
  const selectTarget = (loc: TargetLocation) => {
    // 如果点击已选中的，则取消选中
    if (selectedTarget && 
        selectedTarget.file === loc.file && 
        selectedTarget.categoryName === loc.categoryName &&
        selectedTarget.tabName === loc.tabName) {
      setSelectedTarget(null);
    } else {
      setSelectedTarget(loc);
    }
  };
  
  // 执行移动
  const handleMove = async () => {
    if (selectedResources.size === 0 || !selectedTarget) {
      setMessage({ type: 'error', text: '请选择要移动的资源和目标位置' });
      return;
    }
    
    setIsMoving(true);
    try {
      const sourceItems = allResources.filter(r => selectedResources.has(r.id));
      
      const res = await fetch('/api/resource-mover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceItems,
          target: selectedTarget,
        }),
      });
      
      const result = await res.json();
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setSelectedResources(new Set());
        setSelectedTarget(null);
        // 重新加载数据
        await loadData();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setIsMoving(false);
    }
  };
  
  // 渲染源资源树
  const renderSourceTree = () => {
    const nodes: React.ReactNode[] = [];
    
    sourceTreeData.forEach((catMap, fileKey) => {
      const [pageName, groupName] = fileKey.split('--');
      const fileId = `source-file-${fileKey}`;
      const isFileExpanded = sourceExpandedNodes.has(fileId);
      
      nodes.push(
        <div key={fileId} className="tree-node-enter">
          <div 
            className="tree-node-row"
            style={{ ...STYLES.treeNode, background: '#fafafa' }}
            onClick={() => toggleSourceNode(fileId)}
          >
            <button style={STYLES.button.icon}>
              <AnimatedChevron expanded={isFileExpanded} />
            </button>
            {getNodeIcon('file')}
            <span style={{ flex: 1, fontWeight: 500, color: '#1e293b' }}>
              {pageName} / {groupName}
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              {Array.from(catMap.values()).reduce((sum, m) => sum + Array.from(m.values()).reduce((s, arr) => s + arr.length, 0), 0)} 项
            </span>
          </div>
          
          {isFileExpanded && (
            <div className="tree-children">
              {Array.from(catMap.entries()).map(([catName, tabMap]) => {
                const catId = `${fileId}-cat-${catName}`;
                const isCatExpanded = sourceExpandedNodes.has(catId);
                
                return (
                  <div key={catId}>
                    <div 
                      className="tree-node-row"
                      style={{ ...STYLES.treeNode, paddingLeft: '36px', background: '#f8fafc' }}
                      onClick={() => toggleSourceNode(catId)}
                    >
                      <button style={STYLES.button.icon}>
                        <AnimatedChevron expanded={isCatExpanded} />
                      </button>
                      {getNodeIcon('category', isCatExpanded)}
                      <span style={{ flex: 1, fontWeight: 500, color: '#334155' }}>
                        {catName}
                      </span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {Array.from(tabMap.values()).reduce((sum, arr) => sum + arr.length, 0)} 项
                      </span>
                    </div>
                    
                    {isCatExpanded && (
                      <div className="tree-children">
                        {Array.from(tabMap.entries()).map(([tabKey, resources]) => {
                          const isTab = tabKey.startsWith('tab:');
                          const tabName = isTab ? tabKey.replace('tab:', '') : '顶部资源';
                          const tabId = `${catId}-tab-${tabKey}`;
                          const isTabExpanded = sourceExpandedNodes.has(tabId);
                          
                          return (
                            <div key={tabId}>
                              <div 
                                className="tree-node-row"
                                style={{ ...STYLES.treeNode, paddingLeft: '60px', background: '#f1f5f9' }}
                                onClick={() => toggleSourceNode(tabId)}
                              >
                                <button style={STYLES.button.icon}>
                                  <AnimatedChevron expanded={isTabExpanded} />
                                </button>
                                {getNodeIcon(isTab ? 'tab' : 'category')}
                                <span style={{ flex: 1, color: '#475569' }}>
                                  {tabName}
                                </span>
                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                  {resources.length} 项
                                </span>
                              </div>
                              
                              {isTabExpanded && (
                                <div className="tree-children">
                                  {resources.map(resource => (
                                    <div 
                                      key={resource.id}
                                      className={`resource-row ${selectedResources.has(resource.id) ? 'selected' : ''}`}
                                      style={{ ...STYLES.treeNode, paddingLeft: '84px', cursor: 'pointer' }}
                                      onClick={() => toggleResource(resource.id)}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedResources.has(resource.id)}
                                        onChange={() => toggleResource(resource.id)}
                                        style={{ cursor: 'pointer' }}
                                      />
                                      {getNodeIcon('resource')}
                                      <span style={{ flex: 1, fontSize: '13px', color: '#475569' }}>
                                        {resource.name}
                                      </span>
                                      {resource.url && (
                                        <span style={{ fontSize: '11px', color: '#94a3b8', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {resource.url}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    });
    
    return nodes;
  };
  
  // 渲染目标位置树
  const renderTargetTree = () => {
    const nodes: React.ReactNode[] = [];
    
    targetTreeData.forEach((catMap, fileKey) => {
      const [pageName, groupName] = fileKey.split('--');
      const fileId = `target-file-${fileKey}`;
      const isFileExpanded = targetExpandedNodes.has(fileId);
      
      nodes.push(
        <div key={fileId} className="tree-node-enter">
          <div 
            className="target-node-row"
            style={{ ...STYLES.treeNode, background: '#fafafa' }}
            onClick={() => toggleTargetNode(fileId)}
          >
            <button style={STYLES.button.icon}>
              <AnimatedChevron expanded={isFileExpanded} />
            </button>
            {getNodeIcon('file')}
            <span style={{ flex: 1, fontWeight: 500, color: '#1e293b' }}>
              {pageName} / {groupName}
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              {Array.from(catMap.values()).reduce((sum, m) => sum + Array.from(m.values()).reduce((s, arr) => s + arr.length, 0), 0)} 个位置
            </span>
          </div>
          
          {isFileExpanded && (
            <div className="tree-children">
              {Array.from(catMap.entries()).map(([catName, tabMap]) => {
                const catId = `${fileId}-cat-${catName}`;
                const isCatExpanded = targetExpandedNodes.has(catId);
                
                return (
                  <div key={catId}>
                    <div 
                      className="target-node-row"
                      style={{ ...STYLES.treeNode, paddingLeft: '36px', background: '#f8fafc' }}
                      onClick={() => toggleTargetNode(catId)}
                    >
                      <button style={STYLES.button.icon}>
                        <AnimatedChevron expanded={isCatExpanded} />
                      </button>
                      {getNodeIcon('category', isCatExpanded)}
                      <span style={{ flex: 1, fontWeight: 500, color: '#334155' }}>
                        {catName}
                      </span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {Array.from(tabMap.values()).reduce((sum, arr) => sum + arr.length, 0)} 个位置
                      </span>
                    </div>
                    
                    {isCatExpanded && (
                      <div className="tree-children">
                        {Array.from(tabMap.entries()).map(([tabKey, locations]) => {
                          const isTab = tabKey.startsWith('tab:');
                          const tabName = isTab ? tabKey.replace('tab:', '') : '顶部资源';
                          const loc = locations[0]; // 每个tabKey只有一个位置
                          const isSelected = selectedTarget && 
                            selectedTarget.file === loc.file && 
                            selectedTarget.categoryName === loc.categoryName &&
                            selectedTarget.tabName === loc.tabName;
                          
                          return (
                            <div 
                              key={tabKey}
                              className={`target-node-row ${isSelected ? 'selected' : ''}`}
                              style={{ ...STYLES.treeNode, paddingLeft: '60px' }}
                              onClick={() => selectTarget(loc)}
                            >
                              <div style={{ width: '20px' }} />
                              {getNodeIcon(isTab ? 'tab' : 'target')}
                              <span style={{ flex: 1, color: '#475569' }}>
                                {tabName}
                              </span>
                              {isSelected && (
                                <Check size={16} style={{ color: '#2563eb' }} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    });
    
    return nodes;
  };
  
  return (
    <div style={STYLES.container}>
      {/* 注入动画样式 */}
      <style>{ANIMATION_STYLES}</style>
      
      {/* 标题 */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ArrowRightLeft size={28} />
          资源转移
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          将卡片、Tab或列表中的资源移动到其他位置
        </p>
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
      
      {/* 筛选卡片 */}
      <div style={STYLES.card}>
        <div style={STYLES.body}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={16} style={{ color: '#64748b' }} />
              <input
                type="text"
                placeholder="搜索资源名称或链接..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ ...STYLES.input, width: '250px' }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={16} style={{ color: '#64748b' }} />
              <select
                value={filterFile}
                onChange={e => setFilterFile(e.target.value)}
                style={{ ...STYLES.select, width: '200px' }}
              >
                <option value="all">全部文件</option>
                {fileList.map(([file, name]) => (
                  <option key={file} value={file}>{name}</option>
                ))}
              </select>
            </div>
            
            <button onClick={toggleSelectAll} style={STYLES.button.secondary}>
              {selectedResources.size === filteredResources.length ? '取消全选' : '全选'}
            </button>
            
            <span style={{ color: '#64748b', fontSize: '14px' }}>
              已选择 <strong>{selectedResources.size}</strong> 项
            </span>
          </div>
        </div>
      </div>
      
      {/* 主内容区 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* 源资源列表 */}
        <div style={STYLES.card}>
          <div style={STYLES.header}>
            <Layers size={20} style={{ color: '#64748b' }} />
            <span style={{ fontWeight: 600, color: '#334155' }}>选择要移动的资源</span>
            <button 
              onClick={loadData} 
              style={{ ...STYLES.button.secondary, marginLeft: 'auto', padding: '6px 12px' }}
              disabled={isLoading}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              刷新
            </button>
          </div>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                加载中...
              </div>
            ) : filteredResources.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                没有找到资源
              </div>
            ) : (
              renderSourceTree()
            )}
          </div>
        </div>
        
        {/* 目标位置选择 */}
        <div style={STYLES.card}>
          <div style={STYLES.header}>
            <Folder size={20} style={{ color: '#64748b' }} />
            <span style={{ fontWeight: 600, color: '#334155' }}>选择目标位置</span>
            {selectedTarget && (
              <span style={{ 
                marginLeft: 'auto', 
                fontSize: '12px', 
                color: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Check size={14} />
                已选择
              </span>
            )}
          </div>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                加载中...
              </div>
            ) : targetLocations.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                没有可用的目标位置
              </div>
            ) : (
              renderTargetTree()
            )}
          </div>
          
          {/* 已选择的目标位置详情 */}
          {selectedTarget && (
            <div style={{ 
              padding: '16px', 
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '8px' }}>
                目标位置：
              </div>
              <div style={{ fontSize: '13px', color: '#1e293b', lineHeight: '1.6' }}>
                <span style={{ color: '#8b5cf6' }}>{selectedTarget.pageName}</span>
                {' / '}
                <span style={{ color: '#3b82f6' }}>{selectedTarget.groupName}</span>
                {' / '}
                <span style={{ color: '#10b981' }}>{selectedTarget.categoryName}</span>
                {selectedTarget.tabName && (
                  <><span> / </span><span style={{ color: '#f59e0b' }}>{selectedTarget.tabName}</span></>
                )}
                {!selectedTarget.tabName && (
                  <><span> / </span><span style={{ color: '#94a3b8' }}>顶部资源</span></>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 操作按钮 */}
      <div style={{ marginTop: '16px' }}>
        <button
          onClick={handleMove}
          disabled={selectedResources.size === 0 || !selectedTarget || isMoving}
          style={{
            ...STYLES.button.success,
            opacity: (selectedResources.size === 0 || !selectedTarget) ? 0.5 : 1,
            width: '100%',
            justifyContent: 'center',
          }}
        >
          {isMoving ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              移动中...
            </>
          ) : (
            <>
              <ArrowRight size={16} />
              移动 {selectedResources.size} 个资源到目标位置
            </>
          )}
        </button>
      </div>
    </div>
  );
}
