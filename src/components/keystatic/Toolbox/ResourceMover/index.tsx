// ResourceMover 主组件
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowRightLeft, 
  Folder, 
  FolderOpen, 
  FileText, 
  Layers,
  ChevronRight,
  CheckCircle,
  XCircle,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  Check,
  Plus,
} from 'lucide-react';
import type { ResourceItem, TargetLocation } from './types';
import {
  LAYOUT,
  CARD,
  BUTTON,
  INPUT,
  TREE,
  ANIMATION_CSS,
} from '../toolbox-shared';

// --- 样式常量 ---
// 使用共享样式
const STYLES = {
  container: LAYOUT.containerWide,
  card: CARD.base,
  header: CARD.header,
  body: CARD.body,
  button: BUTTON,
  treeNode: TREE.node,
  input: INPUT.base,
  select: INPUT.select,
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

const TriStateCheckbox = ({
  checked,
  indeterminate,
  onChange,
  onClick,
  disabled,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  onClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}) => {
  const ref = useRef<HTMLInputElement | null>(null);
  
  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);
  
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={onClick}
      disabled={disabled}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
    />
  );
};

// --- 主组件 ---
interface ResourceMoverProps {
  onDataStatusChange?: (hasData: boolean) => void;
  onTaskStart?: (id: string, name: string) => void;
  onTaskProgress?: (id: string, progress: number) => void;
  onTaskEnd?: (id: string, message?: string) => void;
}

export function ResourceMover({ 
  onDataStatusChange,
  onTaskStart,
  onTaskProgress,
  onTaskEnd,
}: ResourceMoverProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // 数据状态
  const [allResources, setAllResources] = useState<ResourceItem[]>([]);
  const [targetLocations, setTargetLocations] = useState<TargetLocation[]>([]);
  
  // 选择状态
  const [selectedResources, setSelectedResources] = useState<Set<string>>(new Set());
  const [selectedTarget, setSelectedTarget] = useState<TargetLocation | null>(null);

  // 新建目标状态
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState<{ file: string; pageName: string; groupName: string } | null>(null);
  const [creatingTab, setCreatingTab] = useState<{ file: string; pageName: string; groupName: string; categoryName: string } | null>(null);
  const [newGroup, setNewGroup] = useState({
    pageName: '',
    sortPrefix: '01',
    groupName: '',
    categoryName: '',
    visualTag: ' ',
  });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newTabName, setNewTabName] = useState('');
  
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

  const pageNameOptions = useMemo(() => {
    const options = new Set<string>();
    allResources.forEach(r => options.add(r.location.pageName));
    targetLocations.forEach(t => options.add(t.pageName));
    return Array.from(options.values());
  }, [allResources, targetLocations]);

  const sortPrefixOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  }, []);
  
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

  const toggleResourceGroup = (resourceIds: string[]) => {
    if (resourceIds.length === 0) return;
    setSelectedResources(prev => {
      const next = new Set(prev);
      const allSelected = resourceIds.every(id => next.has(id));
      if (allSelected) {
        resourceIds.forEach(id => next.delete(id));
      } else {
        resourceIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const getSelectionState = (resourceIds: string[]) => {
    const selectedCount = resourceIds.filter(id => selectedResources.has(id)).length;
    const total = resourceIds.length;
    return {
      selectedCount,
      total,
      isAllSelected: total > 0 && selectedCount === total,
      isPartial: selectedCount > 0 && selectedCount < total,
    };
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

  const expandTargetTo = (loc: TargetLocation) => {
    const fileKey = `${loc.pageName}--${loc.groupName}`;
    const fileId = `target-file-${fileKey}`;
    const catId = `${fileId}-cat-${loc.categoryName}`;
    setTargetExpandedNodes(prev => {
      const next = new Set(prev);
      next.add(fileId);
      next.add(catId);
      return next;
    });
  };

  const createTarget = async (payload: any) => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/resource-mover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createTarget', ...payload }),
      });
      
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        setMessage({ type: 'error', text: result.message || result.error || '创建失败' });
        return null;
      }
      
      setMessage({ type: 'success', text: result.message || '创建成功' });
      await loadData();
      
      if (result.createdTarget) {
        setSelectedTarget(result.createdTarget);
        expandTargetTo(result.createdTarget);
      }
      
      return result.createdTarget || null;
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateGroup = async () => {
    const pageName = newGroup.pageName.trim();
    const sortPrefix = newGroup.sortPrefix.trim();
    const groupName = newGroup.groupName.trim();
    const categoryName = newGroup.categoryName.trim();
    
    if (!pageName || !sortPrefix || !groupName || !categoryName) {
      setMessage({ type: 'error', text: '请填写完整的分组信息' });
      return;
    }
    
    const created = await createTarget({
      type: 'group',
      group: {
        pageName,
        sortPrefix,
        groupName,
        categoryName,
        visualTag: newGroup.visualTag || ' ',
      },
    });
    
    if (created) {
      setCreatingGroup(false);
      setNewGroup({
        pageName: '',
        sortPrefix: '01',
        groupName: '',
        categoryName: '',
        visualTag: ' ',
      });
    }
  };

  const handleCreateCategory = async () => {
    if (!creatingCategory) return;
    const categoryName = newCategoryName.trim();
    if (!categoryName) {
      setMessage({ type: 'error', text: '请输入分类名称' });
      return;
    }
    
    const created = await createTarget({
      type: 'category',
      category: {
        file: creatingCategory.file,
        categoryName,
      },
    });
    
    if (created) {
      setCreatingCategory(null);
      setNewCategoryName('');
    }
  };

  const handleCreateTab = async () => {
    if (!creatingTab) return;
    const tabName = newTabName.trim();
    if (!tabName) {
      setMessage({ type: 'error', text: '请输入 Tab 名称' });
      return;
    }
    
    const created = await createTarget({
      type: 'tab',
      tab: {
        file: creatingTab.file,
        categoryName: creatingTab.categoryName,
        tabName,
      },
    });
    
    if (created) {
      setCreatingTab(null);
      setNewTabName('');
    }
  };
  
  // 执行移动
  const handleMove = async () => {
    if (selectedResources.size === 0 || !selectedTarget) {
      setMessage({ type: 'error', text: '请选择要移动的资源和目标位置' });
      return;
    }
    
    setIsMoving(true);
    const taskId = 'resource-move';
    onTaskStart?.(taskId, '正在移动资源');

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
      onTaskEnd?.(taskId, '移动操作已完成');
    }
  };
  
  // 渲染源资源树
  const renderSourceTree = () => {
    const nodes: React.ReactNode[] = [];
    
    sourceTreeData.forEach((catMap, fileKey) => {
      const [pageName, groupName] = fileKey.split('--');
      const fileId = `source-file-${fileKey}`;
      const isFileExpanded = sourceExpandedNodes.has(fileId);
      const fileResourceIds = Array.from(catMap.values()).flatMap(tabMap => 
        Array.from(tabMap.values()).flatMap(resources => resources.map(resource => resource.id))
      );
      const fileSelection = getSelectionState(fileResourceIds);
      
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
            <TriStateCheckbox
              checked={fileSelection.isAllSelected}
              indeterminate={fileSelection.isPartial}
              onChange={() => toggleResourceGroup(fileResourceIds)}
              onClick={(e) => e.stopPropagation()}
            />
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
                const catResourceIds = Array.from(tabMap.values()).flatMap(resources => resources.map(resource => resource.id));
                const catSelection = getSelectionState(catResourceIds);
                
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
                      <TriStateCheckbox
                        checked={catSelection.isAllSelected}
                        indeterminate={catSelection.isPartial}
                        onChange={() => toggleResourceGroup(catResourceIds)}
                        onClick={(e) => e.stopPropagation()}
                      />
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
                          const tabResourceIds = resources.map(resource => resource.id);
                          const tabSelection = getSelectionState(tabResourceIds);
                          
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
                                <TriStateCheckbox
                                  checked={tabSelection.isAllSelected}
                                  indeterminate={tabSelection.isPartial}
                                  onChange={() => toggleResourceGroup(tabResourceIds)}
                                  onClick={(e) => e.stopPropagation()}
                                />
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
                                        onClick={(e) => e.stopPropagation()}
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
      const fileSample = Array.from(catMap.values()).flatMap(tabMap => 
        Array.from(tabMap.values()).flatMap(locations => locations)
      )[0];
      const file = fileSample?.file || '';
      
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
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                style={{ ...STYLES.button.small }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!file) return;
                  setCreatingCategory({ file, pageName, groupName });
                  setNewCategoryName('');
                  setCreatingTab(null);
                  setTargetExpandedNodes(prev => {
                    const next = new Set(prev);
                    next.add(fileId);
                    return next;
                  });
                }}
                disabled={!file || isCreating}
              >
                <Plus size={12} />
                新建分类
              </button>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {Array.from(catMap.values()).reduce((sum, m) => sum + Array.from(m.values()).reduce((s, arr) => s + arr.length, 0), 0)} 个位置
              </span>
            </div>
          </div>
          
          {isFileExpanded && (
            <div className="tree-children">
              {creatingCategory && creatingCategory.file === file && (
                <div style={{ padding: '8px 12px 8px 36px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="新分类名称"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      style={{ ...STYLES.input, fontFamily: 'inherit' }}
                      disabled={isCreating}
                    />
                    <button
                      style={STYLES.button.primary}
                      onClick={handleCreateCategory}
                      disabled={isCreating}
                    >
                      创建
                    </button>
                    <button
                      style={STYLES.button.secondary}
                      onClick={() => {
                        setCreatingCategory(null);
                        setNewCategoryName('');
                      }}
                      disabled={isCreating}
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
              {Array.from(catMap.entries()).map(([catName, tabMap]) => {
                const catId = `${fileId}-cat-${catName}`;
                const isCatExpanded = targetExpandedNodes.has(catId);
                const catSample = Array.from(tabMap.values()).flatMap(locations => locations)[0];
                const catFile = catSample?.file || file;
                
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
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          style={{ ...STYLES.button.small }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!catFile) return;
                            setCreatingTab({ file: catFile, pageName, groupName, categoryName: catName });
                            setNewTabName('');
                            setTargetExpandedNodes(prev => {
                              const next = new Set(prev);
                              next.add(fileId);
                              next.add(catId);
                              return next;
                            });
                          }}
                          disabled={!catFile || isCreating}
                        >
                          <Plus size={12} />
                          新建 Tab
                        </button>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {Array.from(tabMap.values()).reduce((sum, arr) => sum + arr.length, 0)} 个位置
                        </span>
                      </div>
                    </div>
                    
                    {isCatExpanded && (
                      <div className="tree-children">
                        {creatingTab && creatingTab.file === catFile && creatingTab.categoryName === catName && (
                          <div style={{ padding: '8px 12px 8px 60px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="text"
                                placeholder="新 Tab 名称"
                                value={newTabName}
                                onChange={(e) => setNewTabName(e.target.value)}
                                style={{ ...STYLES.input, fontFamily: 'inherit' }}
                                disabled={isCreating}
                              />
                              <button
                                style={STYLES.button.primary}
                                onClick={handleCreateTab}
                                disabled={isCreating}
                              >
                                创建
                              </button>
                              <button
                                style={STYLES.button.secondary}
                                onClick={() => {
                                  setCreatingTab(null);
                                  setNewTabName('');
                                }}
                                disabled={isCreating}
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        )}
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
      <style>{ANIMATION_CSS}</style>
      
      {/* 标题 */}
      <div style={{ marginBottom: '12px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowRightLeft size={20} />
          资源转移
        </h1>
        <p style={{ color: '#64748b', fontSize: '13px', lineHeight: 1.4 }}>
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
            <Layers size={20} style={CARD.headerIcon} />
            <span style={CARD.headerTitle}>选择要移动的资源</span>
            <button 
              onClick={loadData} 
              style={{ ...STYLES.button.secondary, ...CARD.headerExtra }}
              disabled={isLoading}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              刷新
            </button>
          </div>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>新建目标分组</span>
                <button
                  style={STYLES.button.secondary}
                  onClick={() => {
                    setCreatingGroup(!creatingGroup);
                    setCreatingCategory(null);
                    setCreatingTab(null);
                  }}
                  disabled={isCreating}
                >
                  <Plus size={14} />
                  {creatingGroup ? '收起' : '新建分组'}
                </button>
              </div>
              {creatingGroup && (
                <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                  <input
                    type="text"
                    list="resource-mover-page-options"
                    placeholder="pageName (如 home)"
                    value={newGroup.pageName}
                    onChange={(e) => setNewGroup(prev => ({ ...prev, pageName: e.target.value }))}
                    style={{ ...STYLES.input, fontFamily: 'inherit' }}
                    disabled={isCreating}
                  />
                  <select
                    value={newGroup.sortPrefix}
                    onChange={(e) => setNewGroup(prev => ({ ...prev, sortPrefix: e.target.value }))}
                    style={STYLES.select}
                    disabled={isCreating}
                  >
                    {sortPrefixOptions.map(prefix => (
                      <option key={prefix} value={prefix}>{prefix}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="分组名称"
                    value={newGroup.groupName}
                    onChange={(e) => setNewGroup(prev => ({ ...prev, groupName: e.target.value }))}
                    style={{ ...STYLES.input, fontFamily: 'inherit' }}
                    disabled={isCreating}
                  />
                  <input
                    type="text"
                    placeholder="新分类名称"
                    value={newGroup.categoryName}
                    onChange={(e) => setNewGroup(prev => ({ ...prev, categoryName: e.target.value }))}
                    style={{ ...STYLES.input, fontFamily: 'inherit' }}
                    disabled={isCreating}
                  />
                  <input
                    type="text"
                    placeholder="visualTag (可选)"
                    value={newGroup.visualTag}
                    onChange={(e) => setNewGroup(prev => ({ ...prev, visualTag: e.target.value }))}
                    style={{ ...STYLES.input, fontFamily: 'inherit' }}
                    disabled={isCreating}
                  />
                </div>
              )}
              {creatingGroup && (
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                  <button
                    style={STYLES.button.primary}
                    onClick={handleCreateGroup}
                    disabled={isCreating}
                  >
                    创建分组
                  </button>
                  <button
                    style={STYLES.button.secondary}
                    onClick={() => {
                      setCreatingGroup(false);
                      setNewGroup({
                        pageName: '',
                        sortPrefix: '01',
                        groupName: '',
                        categoryName: '',
                        visualTag: ' ',
                      });
                    }}
                    disabled={isCreating}
                  >
                    取消
                  </button>
                </div>
              )}
              <datalist id="resource-mover-page-options">
                {pageNameOptions.map(option => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>
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
            <Folder size={20} style={CARD.headerIcon} />
            <span style={CARD.headerTitle}>选择目标位置</span>
            {selectedTarget && (
              <span style={{ 
                ...CARD.headerExtra,
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
      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={handleMove}
          disabled={selectedResources.size === 0 || !selectedTarget || isMoving}
          style={{
            ...STYLES.button.success,
            opacity: (selectedResources.size === 0 || !selectedTarget) ? 0.5 : 1,
            padding: '10px 24px',
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
