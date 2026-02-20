// src/components/keystatic/Toolbox/BatchAdder.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Link, 
  Play,
  RefreshCw,
  CheckCircle,
  XCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Image,
  FileText,
  FolderOpen,
  Layers
} from 'lucide-react';

// --- 类型定义 ---
interface ParsedResource {
  url: string;
  title: string;
  desc: string;
  icon: string;
  homepage?: string;
  isGithub: boolean;
  originalUrl: string;
}

interface ParseResult {
  success: boolean;
  data?: ParsedResource;
  error?: string;
}

interface GroupInfo {
  id: string;
  name: string;
  pageName: string;
  file: string;
  categories: { name: string; index: number }[];
}

interface AddResult {
  success: boolean;
  message: string;
  addedTo?: string;
}

interface PendingItem {
  id: string;
  url: string;
  status: 'pending' | 'parsing' | 'ready' | 'error';
  data?: ParsedResource;
  error?: string;
  targetGroup?: string;
  targetCategory?: number | 'top';
}

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
  textarea: {
    width: '100%',
    minHeight: '150px',
    padding: '12px 16px',
    fontSize: '14px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'monospace',
    resize: 'vertical' as const,
    lineHeight: '1.6',
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
    danger: {
      padding: '8px 16px',
      fontSize: '13px',
      fontWeight: 500,
      color: '#ef4444',
      background: 'transparent',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
  },
  select: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    outline: 'none',
    background: 'white',
    cursor: 'pointer',
    minWidth: '150px',
  },
  resourceCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    background: '#fafafa',
    transition: 'all 0.2s',
  },
  iconPreview: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    background: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
};

// --- 辅助函数 ---
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return { text: '待解析', color: '#64748b', bg: '#f1f5f9' };
    case 'parsing':
      return { text: '解析中...', color: '#2563eb', bg: '#eff6ff' };
    case 'ready':
      return { text: '就绪', color: '#22c55e', bg: '#dcfce7' };
    case 'error':
      return { text: '解析失败', color: '#ef4444', bg: '#fee2e2' };
    default:
      return { text: status, color: '#64748b', bg: '#f1f5f9' };
  }
};

// --- 主组件 ---

interface BatchAdderProps {
  onDataStatusChange: (hasData: boolean) => void;
}

export function BatchAdder({ onDataStatusChange }: BatchAdderProps) {

  const [inputText, setInputText] = useState('');
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

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
  useEffect(() => {
    onDataStatusChange?.(pendingItems.length > 0);
  }, [pendingItems, onDataStatusChange]);

  // 解析 URL 列表
  const parseUrls = (text: string): string[] => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const urls: string[] = [];
    
    for (const line of lines) {
      // 支持多种 URL 格式
      const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        urls.push(urlMatch[1]);
      } else if (line.includes('.') && !line.includes(' ')) {
        // 可能是裸域名
        urls.push(line.startsWith('http') ? line : `https://${line}`);
      }
    }
    
    return [...new Set(urls)]; // 去重
  };

  // 开始解析
  const handleParse = async () => {
    const urls = parseUrls(inputText);
    if (urls.length === 0) {
      setMessage({ type: 'error', text: '未检测到有效的 URL' });
      return;
    }

    setIsParsing(true);
    setProgress({ current: 0, total: urls.length });
    setMessage(null);

    // 初始化待解析列表
    const items: PendingItem[] = urls.map((url, index) => ({
      id: `item-${index}`,
      url,
      status: 'pending',
    }));
    setPendingItems(items);

    // 逐个解析
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      
      // 更新状态为解析中
      setPendingItems(prev => prev.map(item => 
        item.url === url ? { ...item, status: 'parsing' } : item
      ));

      try {
        const res = await fetch(`/api/batch-add?mode=parse&url=${encodeURIComponent(url)}`);
        const result: ParseResult = await res.json();

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
      } catch (e: any) {
        setPendingItems(prev => prev.map(item => {
          if (item.url === url) {
            return { ...item, status: 'error', error: e.message };
          }
          return item;
        }));
      }

      setProgress({ current: i + 1, total: urls.length });
      
      // 避免请求过快
      if (i < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    setIsParsing(false);
  };

  // 批量添加
  const handleAddAll = async () => {
    const readyItems = pendingItems.filter(item => 
      item.status === 'ready' && item.data && item.targetGroup
    );

    if (readyItems.length === 0) {
      setMessage({ type: 'error', text: '没有可添加的资源' });
      return;
    }

    setIsAdding(true);
    setMessage(null);

    const addItems = readyItems.map(item => ({
      groupFile: item.targetGroup!,
      resource: item.data!,
      target: { 
        type: item.targetCategory === 'top' ? 'top' : 'category',
        categoryIndex: item.targetCategory === 'top' ? undefined : item.targetCategory,
      },
    }));

    try {
      const res = await fetch('/api/batch-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'batch-add', items: addItems }),
      });

      const results: AddResult[] = await res.json();
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (failCount === 0) {
        setMessage({ type: 'success', text: `成功添加 ${successCount} 个资源` });
        // 清空已添加的项目
        setPendingItems(prev => prev.filter(item => item.status !== 'ready'));
        setInputText('');
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

  // 获取分组名称
  const getGroupName = (file: string): string => {
    const group = groups.find(g => g.file === file);
    return group?.name || file;
  };

  // 获取分类列表
  const getCategories = (file: string) => {
    const group = groups.find(g => g.file === file);
    return group?.categories || [];
  };

  const readyCount = pendingItems.filter(item => item.status === 'ready').length;

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
              {isParsing ? `解析中 (${progress.current}/${progress.total})` : '解析全部'}
            </button>
            
            <span style={{ color: '#64748b', fontSize: '14px' }}>
              检测到 {parseUrls(inputText).length} 个 URL
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
            {readyCount > 0 && (
              <button
                onClick={handleAddAll}
                disabled={isAdding}
                style={{ ...STYLES.button.success, opacity: isAdding ? 0.7 : 1 }}
              >
                {isAdding ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                添加全部 ({readyCount})
              </button>
            )}
          </div>
          
          <div style={STYLES.body}>
            {pendingItems.map(item => {
              const statusBadge = getStatusBadge(item.status);
              const isExpanded = expandedItems.has(item.id);
              
              return (
                <div key={item.id} style={STYLES.resourceCard}>
                  {/* 主行 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* 图标预览 */}
                    <div style={STYLES.iconPreview}>
                      {item.data?.icon ? (
                        <img 
                          src={item.data.icon} 
                          alt="" 
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <Image size={24} style={{ color: '#cbd5e1' }} />
                      )}
                    </div>
                    
                    {/* 信息 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '15px' }}>
                          {item.data?.title || item.url}
                        </span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 500,
                          color: statusBadge.color,
                          background: statusBadge.bg,
                        }}>
                          {statusBadge.text}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none' }}
                        >
                          {item.url.length > 50 ? item.url.substring(0, 50) + '...' : item.url}
                        </a>
                        <ExternalLink size={12} style={{ color: '#94a3b8' }} />
                      </div>
                    </div>
                    
                    {/* 目标选择 */}
                    {item.status === 'ready' && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <FolderOpen size={14} style={{ color: '#64748b' }} />
                          <select
                            value={item.targetGroup || ''}
                            onChange={e => updateItemTarget(item.id, 'targetGroup', e.target.value)}
                            style={{ ...STYLES.select, minWidth: '120px' }}
                          >
                            {groups.map(g => (
                              <option key={g.file} value={g.file}>{g.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Layers size={14} style={{ color: '#64748b' }} />
                          <select
                            value={item.targetCategory?.toString() || 'top'}
                            onChange={e => updateItemTarget(item.id, 'targetCategory', e.target.value === 'top' ? 'top' : Number(e.target.value))}
                            style={{ ...STYLES.select, minWidth: '100px' }}
                          >
                            <option value="top">顶部资源</option>
                            {getCategories(item.targetGroup || '').map(cat => (
                              <option key={cat.index} value={cat.index}>{cat.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                    
                    {/* 操作按钮 */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {item.data?.desc && (
                        <button
                          onClick={() => toggleExpand(item.id)}
                          style={{ ...STYLES.button.secondary, padding: '6px 10px' }}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      )}
                      <button
                        onClick={() => removeItem(item.id)}
                        style={STYLES.button.danger}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {/* 展开详情 */}
                  {isExpanded && item.data?.desc && (
                    <div style={{ marginTop: '12px', padding: '12px', background: 'white', borderRadius: '6px' }}>
                      <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', margin: 0 }}>
                        {item.data.desc}
                      </p>
                    </div>
                  )}
                  
                  {/* 错误信息 */}
                  {item.status === 'error' && item.error && (
                    <div style={{ marginTop: '8px', color: '#ef4444', fontSize: '13px' }}>
                      {item.error}
                    </div>
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
            <li>支持 GitHub 仓库链接，自动获取项目名称、描述和图标</li>
            <li>支持普通网站链接，自动抓取页面标题和图标</li>
            <li>解析完成后，选择目标分组和分类位置</li>
            <li>点击"添加全部"批量添加到导航站</li>
            <li>添加后请前往 Keystatic 后台进一步编辑详情</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
