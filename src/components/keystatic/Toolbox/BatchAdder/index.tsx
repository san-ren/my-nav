// BatchAdder 主组件
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Link, Play, RefreshCw, CheckCircle, XCircle, Trash2,
  ChevronDown, ChevronUp, ExternalLink, Image, FileText,
  FolderOpen, Layers, FolderPlus, LayersIcon, AlertTriangle
} from 'lucide-react';
import { STYLES, getStatusBadge } from './styles';
import type { 
  PendingItem, GroupInfo, AddResult, BatchAddMode, 
  DuplicateCheckResult, ParsedResource 
} from './types';
import { useGithubToken } from '../ToolboxPage';

// --- 主组件 ---

interface BatchAdderProps {
  onDataStatusChange: (hasData: boolean) => void;
}

export function BatchAdder({ onDataStatusChange }: BatchAdderProps) {
  const { githubToken } = useGithubToken();
  const [inputText, setInputText] = useState('');
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  // 批量添加模式相关状态
  const [batchAddMode, setBatchAddMode] = useState<BatchAddMode>('individual');
  const [batchTargetGroup, setBatchTargetGroup] = useState<string>('');
  const [batchTargetCategory, setBatchTargetCategory] = useState<number | 'top'>('top');
  const [newTabName, setNewTabName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // 重复检测相关状态
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<DuplicateCheckResult | null>(null);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

  // 加载分组列表
  useEffect(() => {
    fetch('/api/batch-add?mode=groups')
      .then(res => res.json())
      .then((data: GroupInfo[]) => {
        setGroups(data);
      })
      .catch(console.error);
  }, []);

  // 通知父组件数据状态变化
  const onDataStatusChangeRef = useRef(onDataStatusChange);
  useEffect(() => {
    onDataStatusChangeRef.current = onDataStatusChange;
  }, [onDataStatusChange]);

  useEffect(() => {
    onDataStatusChangeRef.current?.(pendingItems.length > 0);
  }, [pendingItems.length]);

  // 解析 URL 列表
  const parseUrls = (text: string): string[] => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const urls: string[] = [];
    
    for (const line of lines) {
      const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        urls.push(urlMatch[1]);
      } else if (line.includes('.') && !line.includes(' ')) {
        urls.push(line.startsWith('http') ? line : `https://${line}`);
      }
    }
    
    return [...new Set(urls)];
  };

  // 开始解析 - 并行解析所有URL
  const handleParse = async () => {
    const urls = parseUrls(inputText);
    if (urls.length === 0) {
      setMessage({ type: 'error', text: '未检测到有效的 URL' });
      return;
    }

    setIsParsing(true);
    setProgress({ current: 0, total: urls.length });
    setMessage(null);
    setDuplicateCheckResult(null);

    // 初始化所有项目状态
    const items: PendingItem[] = urls.map((url, index) => ({
      id: `item-${index}`,
      url,
      status: 'pending' as const,
    }));
    setPendingItems(items);

    // 并发数量：有token时可以更高并发
    const concurrency = githubToken ? 10 : 5;
    let completed = 0;

    // 并行解析函数
    const parseSingleUrl = async (url: string, index: number): Promise<{ index: number; result: any }> => {
      // 更新状态为解析中
      setPendingItems(prev => prev.map(item => 
        item.url === url ? { ...item, status: 'parsing' } : item
      ));

      try {
        // 使用共享的GitHub token
        const res = await fetch(`/api/batch-add?mode=parse&url=${encodeURIComponent(url)}&token=${encodeURIComponent(githubToken)}`);
        const result = await res.json();
        
        completed++;
        setProgress({ current: completed, total: urls.length });
        
        return { index, result };
      } catch (e: any) {
        completed++;
        setProgress({ current: completed, total: urls.length });
        
        return { index, result: { success: false, error: e.message } };
      }
    };

    // 使用并发控制并行解析
    const parsePromises = urls.map((url, index) => parseSingleUrl(url, index));
    
    // 分批执行，每批concurrency个
    for (let i = 0; i < parsePromises.length; i += concurrency) {
      const batch = parsePromises.slice(i, i + concurrency);
      const results = await Promise.all(batch);
      
      // 更新所有完成的项目
      for (const { index, result } of results) {
        const url = urls[index];
        setPendingItems(prev => prev.map(item => {
          if (item.url === url) {
            return {
              ...item,
              status: result.success ? 'ready' : 'error',
              data: result.data,
              error: result.error,
              targetGroup: groups[0]?.file,
              targetCategory: 'top',
            };
          }
          return item;
        }));
      }
    }

    setIsParsing(false);
  };

  // 检测重复
  const handleCheckDuplicates = async () => {
    const readyItems = pendingItems.filter(item => item.status === 'ready' && item.data);

    if (readyItems.length === 0) {
      setMessage({ type: 'error', text: '没有可检测的资源' });
      return;
    }

    setIsCheckingDuplicates(true);
    setMessage(null);

    try {
      const res = await fetch('/api/batch-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check-duplicates',
          resources: readyItems.map(item => item.data!)
        }),
      });

      const result: DuplicateCheckResult = await res.json();
      setDuplicateCheckResult(result);

      if (result.isDuplicate) {
        setMessage({ type: 'error', text: `检测到 ${result.duplicates.length} 个重复资源` });
      } else {
        setMessage({ type: 'success', text: `检测完成，${result.uniqueResources.length} 个资源均无重复` });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  // 批量添加
  const handleAddAll = async () => {
    const readyItems = pendingItems.filter(item => item.status === 'ready' && item.data);

    if (readyItems.length === 0) {
      setMessage({ type: 'error', text: '没有可添加的资源' });
      return;
    }

    // 如果有重复检测结果，使用去重后的资源
    let itemsToAdd = readyItems;
    if (duplicateCheckResult && duplicateCheckResult.isDuplicate) {
      const uniqueUrls = new Set(duplicateCheckResult.uniqueResources.map(r => r.url));
      itemsToAdd = readyItems.filter(item => uniqueUrls.has(item.data!.url));
    }

    if (itemsToAdd.length === 0) {
      setMessage({ type: 'error', text: '所有资源都已存在，无需添加' });
      return;
    }

    // 验证
    if (batchAddMode === 'newTab') {
      if (!batchTargetGroup) {
        setMessage({ type: 'error', text: '请选择目标分组' });
        return;
      }
      if (!newTabName.trim()) {
        setMessage({ type: 'error', text: '请输入新Tab名称' });
        return;
      }
    } else if (batchAddMode === 'newCategory') {
      if (!batchTargetGroup) {
        setMessage({ type: 'error', text: '请选择目标分组' });
        return;
      }
      if (!newCategoryName.trim()) {
        setMessage({ type: 'error', text: '请输入新分类名称' });
        return;
      }
    } else {
      const invalidItems = itemsToAdd.filter(item => !item.targetGroup);
      if (invalidItems.length > 0) {
        setMessage({ type: 'error', text: '请为所有资源选择目标分组' });
        return;
      }
    }

    setIsAdding(true);
    setMessage(null);

    try {
      let results: AddResult[] = [];

      if (batchAddMode === 'newTab') {
        const res = await fetch('/api/batch-add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add-as-new-tab',
            groupFile: batchTargetGroup,
            categoryIndex: batchTargetCategory === 'top' ? undefined : batchTargetCategory,
            tabName: newTabName.trim(),
            resources: itemsToAdd.map(item => item.data!)
          }),
        });
        results = await res.json();
      } else if (batchAddMode === 'newCategory') {
        const res = await fetch('/api/batch-add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add-as-new-category',
            groupFile: batchTargetGroup,
            categoryName: newCategoryName.trim(),
            resources: itemsToAdd.map(item => item.data!)
          }),
        });
        results = await res.json();
      } else {
        const addItems = itemsToAdd.map(item => ({
          groupFile: item.targetGroup!,
          resource: item.data!,
          target: { 
            type: item.targetCategory === 'top' ? 'top' : 'category',
            categoryIndex: item.targetCategory === 'top' ? undefined : item.targetCategory,
          },
        }));

        const res = await fetch('/api/batch-add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'batch-add', items: addItems }),
        });
        results = await res.json();
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (failCount === 0) {
        setMessage({ type: 'success', text: `成功添加 ${successCount} 个资源` });
        setPendingItems(prev => prev.filter(item => item.status !== 'ready'));
        setInputText('');
        setNewTabName('');
        setNewCategoryName('');
        setDuplicateCheckResult(null);
      } else {
        setMessage({ type: 'error', text: `成功 ${successCount} 个，失败 ${failCount} 个` });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setIsAdding(false);
    }
  };

  // 更新项目目标
  const updateItemTarget = (id: string, field: 'targetGroup' | 'targetCategory', value: any) => {
    setPendingItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // 删除项目
  const removeItem = (id: string) => {
    setPendingItems(prev => prev.filter(item => item.id !== id));
  };

  // 切换展开状态
  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 获取分类列表
  const getCategories = (file: string) => {
    const group = groups.find(g => g.file === file);
    return group?.categories || [];
  };

  const readyCount = pendingItems.filter(item => item.status === 'ready').length;
  const uniqueCount = duplicateCheckResult?.uniqueResources.length ?? readyCount;

  return (
    <div style={STYLES.container}>
      {/* 标题 */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Plus size={28} />
          批量添加资源
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          输入多个网址，自动解析并批量添加到指定分组
          {githubToken && <span style={{ color: '#22c55e', marginLeft: '8px' }}>✓ 已配置 GitHub Token，解析速度更快</span>}
        </p>
      </div>

      {/* 输入卡片 */}
      <div style={STYLES.card}>
        <div style={STYLES.header}>
          <Link size={20} style={{ color: '#64748b' }} />
          <span style={{ fontWeight: 600, color: '#334155' }}>输入网址</span>
        </div>
        <div style={STYLES.body}>
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={"每行输入一个网址，支持：\nhttps://github.com/user/repo\nhttps://example.com\nplay.google.com/store/apps/..."}
            style={STYLES.textarea}
          />
          <div style={{ marginTop: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={handleParse}
              disabled={isParsing || !inputText.trim()}
              style={{ ...STYLES.button.primary, opacity: (isParsing || !inputText.trim()) ? 0.7 : 1 }}
            >
              {isParsing ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
              {isParsing ? `解析中 (${progress.current}/${progress.total})` : '并行解析全部'}
            </button>
            <span style={{ color: '#64748b', fontSize: '14px' }}>
              检测到 {parseUrls(inputText).length} 个 URL
              {githubToken && <span style={{ color: '#22c55e' }}> · 并发数: 10</span>}
              {!githubToken && <span style={{ color: '#f59e0b' }}> · 并发数: 5 (配置Token可加速)</span>}
            </span>
          </div>
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

      {/* 解析结果 */}
      {pendingItems.length > 0 && (
        <div style={STYLES.card}>
          <div style={STYLES.header}>
            <FileText size={20} style={{ color: '#64748b' }} />
            <span style={{ fontWeight: 600, color: '#334155' }}>解析结果</span>
            <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: '14px' }}>
              就绪: {readyCount} / {pendingItems.length}
            </span>
            
            {/* 检测重复按钮 */}
            {readyCount > 0 && (
              <button
                onClick={handleCheckDuplicates}
                disabled={isCheckingDuplicates}
                style={{ ...STYLES.button.secondary, opacity: isCheckingDuplicates ? 0.7 : 1 }}
              >
                {isCheckingDuplicates ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                检测重复
              </button>
            )}
            
            {readyCount > 0 && (
              <button
                onClick={handleAddAll}
                disabled={isAdding}
                style={{ ...STYLES.button.success, opacity: isAdding ? 0.7 : 1 }}
              >
                {isAdding ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                添加全部 ({uniqueCount})
              </button>
            )}
          </div>
          
          {/* 重复检测结果提示 */}
          {duplicateCheckResult && duplicateCheckResult.isDuplicate && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#fef3c7' }}>
              <div style={{ fontWeight: 600, color: '#92400e', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} />
                发现 {duplicateCheckResult.duplicates.length} 个重复资源
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {duplicateCheckResult.duplicates.map((dup, idx) => (
                  <div key={idx} style={{ fontSize: '13px', color: '#78350f', padding: '8px 12px', background: 'white', borderRadius: '6px', border: '1px solid #fcd34d' }}>
                    <span style={{ fontWeight: 500 }}>{dup.title}</span>
                    <span style={{ color: '#a16207' }}> 已存在于 </span>
                    <span style={{ fontWeight: 500, color: '#92400e' }}>{dup.location}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#a16207' }}>
                💡 添加时将自动跳过重复资源，仅添加 {duplicateCheckResult.uniqueResources.length} 个新资源
              </div>
            </div>
          )}
          
          {/* 批量添加模式选择器 */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <div style={{ marginBottom: '12px', fontWeight: 600, color: '#334155', fontSize: '14px' }}>
              批量添加模式
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => setBatchAddMode('individual')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: batchAddMode === 'individual' ? '2px solid #2563eb' : '1px solid #e2e8f0', background: batchAddMode === 'individual' ? '#eff6ff' : 'white', cursor: 'pointer' }}>
                <Layers size={16} style={{ color: batchAddMode === 'individual' ? '#2563eb' : '#64748b' }} />
                <span style={{ fontSize: '13px', fontWeight: 500, color: batchAddMode === 'individual' ? '#2563eb' : '#475569' }}>单独添加</span>
              </button>
              <button onClick={() => setBatchAddMode('newTab')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: batchAddMode === 'newTab' ? '2px solid #2563eb' : '1px solid #e2e8f0', background: batchAddMode === 'newTab' ? '#eff6ff' : 'white', cursor: 'pointer' }}>
                <LayersIcon size={16} style={{ color: batchAddMode === 'newTab' ? '#2563eb' : '#64748b' }} />
                <span style={{ fontSize: '13px', fontWeight: 500, color: batchAddMode === 'newTab' ? '#2563eb' : '#475569' }}>作为新Tab添加</span>
              </button>
              <button onClick={() => setBatchAddMode('newCategory')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: batchAddMode === 'newCategory' ? '2px solid #2563eb' : '1px solid #e2e8f0', background: batchAddMode === 'newCategory' ? '#eff6ff' : 'white', cursor: 'pointer' }}>
                <FolderPlus size={16} style={{ color: batchAddMode === 'newCategory' ? '#2563eb' : '#64748b' }} />
                <span style={{ fontSize: '13px', fontWeight: 500, color: batchAddMode === 'newCategory' ? '#2563eb' : '#475569' }}>作为新分类添加</span>
              </button>
            </div>
            
            {/* 批量添加模式配置 */}
            {(batchAddMode === 'newTab' || batchAddMode === 'newCategory') && (
              <div style={{ marginTop: '16px', padding: '16px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>目标分组</label>
                    <select value={batchTargetGroup} onChange={e => { setBatchTargetGroup(e.target.value); setBatchTargetCategory('top'); }} style={{ ...STYLES.select, minWidth: '180px' }}>
                      <option value="">请选择分组</option>
                      {groups.map(g => (<option key={g.file} value={g.file}>{g.name}</option>))}
                    </select>
                  </div>
                  {batchAddMode === 'newTab' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>目标分类（可选）</label>
                      <select value={batchTargetCategory.toString()} onChange={e => setBatchTargetCategory(e.target.value === 'top' ? 'top' : Number(e.target.value))} style={{ ...STYLES.select, minWidth: '150px' }} disabled={!batchTargetGroup}>
                        <option value="top">分组直属（无分类）</option>
                        {getCategories(batchTargetGroup).map(cat => (<option key={cat.index} value={cat.index}>{cat.name}</option>))}
                      </select>
                    </div>
                  )}
                  {batchAddMode === 'newTab' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>新Tab名称 <span style={{ color: '#ef4444' }}>*</span></label>
                      <input type="text" value={newTabName} onChange={e => setNewTabName(e.target.value)} placeholder="例如：常用工具、推荐网站..." style={{ padding: '8px 12px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }} />
                    </div>
                  )}
                  {batchAddMode === 'newCategory' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>新分类名称 <span style={{ color: '#ef4444' }}>*</span></label>
                      <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="例如：开发工具、设计资源..." style={{ padding: '8px 12px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }} />
                    </div>
                  )}
                </div>
                <div style={{ marginTop: '12px', fontSize: '12px', color: '#64748b' }}>
                  {batchAddMode === 'newTab' && <span>💡 将在所选位置创建一个新Tab，所有资源将添加到该Tab中</span>}
                  {batchAddMode === 'newCategory' && <span>💡 将在所选分组下创建一个新分类，所有资源将添加到该分类的直属资源列表中</span>}
                </div>
              </div>
            )}
          </div>
          
          {/* 资源列表 */}
          <div style={STYLES.body}>
            {pendingItems.map(item => {
              const statusBadge = getStatusBadge(item.status);
              const isExpanded = expandedItems.has(item.id);
              
              return (
                <div key={item.id} style={STYLES.resourceCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={STYLES.iconPreview}>
                      {item.data?.icon ? (
                        <img src={item.data.icon} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <Image size={24} style={{ color: '#cbd5e1' }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '15px' }}>{item.data?.title || item.url}</span>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, color: statusBadge.color, background: statusBadge.bg }}>{statusBadge.text}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none' }}>
                          {item.url.length > 50 ? item.url.substring(0, 50) + '...' : item.url}
                        </a>
                        <ExternalLink size={12} style={{ color: '#94a3b8' }} />
                      </div>
                    </div>
                    
                    {/* 目标选择 - 仅在单独添加模式下显示 */}
                    {item.status === 'ready' && batchAddMode === 'individual' && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <FolderOpen size={14} style={{ color: '#64748b' }} />
                          <select value={item.targetGroup || ''} onChange={e => updateItemTarget(item.id, 'targetGroup', e.target.value)} style={{ ...STYLES.select, minWidth: '120px' }}>
                            {groups.map(g => (<option key={g.file} value={g.file}>{g.name}</option>))}
                          </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Layers size={14} style={{ color: '#64748b' }} />
                          <select value={item.targetCategory?.toString() || 'top'} onChange={e => updateItemTarget(item.id, 'targetCategory', e.target.value === 'top' ? 'top' : Number(e.target.value))} style={{ ...STYLES.select, minWidth: '100px' }}>
                            <option value="top">顶部资源</option>
                            {getCategories(item.targetGroup || '').map(cat => (<option key={cat.index} value={cat.index}>{cat.name}</option>))}
                          </select>
                        </div>
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {item.data?.desc && (
                        <button onClick={() => toggleExpand(item.id)} style={{ ...STYLES.button.secondary, padding: '6px 10px' }}>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      )}
                      <button onClick={() => removeItem(item.id)} style={STYLES.button.danger}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {isExpanded && item.data?.desc && (
                    <div style={{ marginTop: '12px', padding: '12px', background: 'white', borderRadius: '6px' }}>
                      <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', margin: 0 }}>{item.data.desc}</p>
                    </div>
                  )}
                  
                  {item.status === 'error' && item.error && (
                    <div style={{ marginTop: '8px', color: '#ef4444', fontSize: '13px' }}>{item.error}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div style={STYLES.card}>
        <div style={STYLES.header}>
          <span style={{ fontWeight: 600, color: '#334155' }}>📖 使用说明</span>
        </div>
        <div style={STYLES.body}>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#64748b', fontSize: '14px', lineHeight: '1.8' }}>
            <li><strong>并行解析</strong>：所有URL同时解析，大幅提升速度</li>
            <li><strong>GitHub Token</strong>：在GitHub检测页配置Token后，批量添加也会使用，提高API限额</li>
            <li>支持 GitHub 仓库链接，自动获取项目名称、描述和图标</li>
            <li>支持普通网站链接，自动抓取页面标题和图标</li>
            <li><strong>单独添加模式</strong>：为每个资源单独选择目标分组和分类位置</li>
            <li><strong>作为新Tab添加</strong>：将所有资源作为一个新Tab添加到指定位置</li>
            <li><strong>作为新分类添加</strong>：将所有资源作为新分类添加到指定分组</li>
            <li><strong>重复检测</strong>：添加前可检测资源是否已存在，避免重复添加</li>
            <li>添加后请前往 Keystatic 后台进一步编辑详情</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default BatchAdder;
