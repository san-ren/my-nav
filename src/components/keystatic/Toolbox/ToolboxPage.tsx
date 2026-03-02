// src/components/keystatic/Toolbox/ToolboxPage.tsx
import React, { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { Link, Wrench, ArrowLeft, AlertTriangle, Edit3 } from 'lucide-react';
import { LinkChecker } from './LinkChecker';
import { ResourceEditor } from './ResourceEditor';
import { TABS as TAB_STYLES, MODAL, BUTTON } from './toolbox-shared';

// --- ✅ 全局Token上下文 ---
interface TokenContextType {
  githubToken: string;
  setGithubToken: (token: string) => void;
  saveToken: () => void;
  resetToken: () => void;
  isTokenSaved: boolean;
}

const TokenContext = createContext<TokenContextType>({
  githubToken: '',
  setGithubToken: () => {},
  saveToken: () => {},
  resetToken: () => {},
  isTokenSaved: false,
});

export const useGithubToken = () => useContext(TokenContext);

// localStorage key
const GITHUB_TOKEN_KEY = 'toolbox_github_token';

// --- 类型定义 ---
type TabId = 'link' | 'editor';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  description: string;
}

// --- 样式常量 ---
const STYLES = {
  container: {
    minHeight: '100vh',
    background: '#f8fafc',
  },
  header: {
    background: 'white',
    borderBottom: '1px solid #e2e8f0',
    padding: '8px 20px',    // 👈 标题区域内边距：上下16px，左右24px
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',           // 👈 图标与文字之间的间距
  },
  adminLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: '#2563eb',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    padding: '8px 16px',
    borderRadius: '6px',
    background: '#eff6ff',
    transition: 'all 0.2s',
  },
};

// --- 标签页配置 ---
const TABS: Tab[] = [
  {
    id: 'link',
    label: '链接检测',
    icon: <Link size={18} />,
    description: '检测GitHub仓库和网站链接有效性',
  },
  {
    id: 'editor',
    label: '资源编辑',
    icon: <Edit3 size={18} />,
    description: '批量添加和转移资源',
  },
];

// --- 主组件 ---
export function ToolboxPage() {
  const [activeTab, setActiveTab] = useState<TabId>('link');
  const [pendingTab, setPendingTab] = useState<TabId | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // ✅ 全局GitHub Token状态 - 支持localStorage持久化
  const [githubToken, setGithubTokenState] = useState(() => {
    // 初始化时从localStorage读取
    if (typeof window !== 'undefined') {
      return localStorage.getItem(GITHUB_TOKEN_KEY) || '';
    }
    return '';
  });
  
  // 追踪是否有未保存的更改
  const [isTokenSaved, setIsTokenSaved] = useState(true);

  // 子组件数据状态（由子组件通过回调更新）
  const [hasUnsavedData, setHasUnsavedData] = useState({
    link: false,
    editor: false,
  });

  // 设置Token（标记为未保存）
  const setGithubToken = useCallback((token: string) => {
    setGithubTokenState(token);
    setIsTokenSaved(false);
  }, []);

  // 保存Token到localStorage
  const saveToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(GITHUB_TOKEN_KEY, githubToken);
      setIsTokenSaved(true);
    }
  }, [githubToken]);

  // 重置Token
  const resetToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(GITHUB_TOKEN_KEY);
      setGithubTokenState('');
      setIsTokenSaved(true);
    }
  }, []);

  // 请求切换标签
  const requestTabChange = useCallback((targetTab: TabId) => {
    // 如果当前标签有未保存数据，显示确认弹窗
    if (hasUnsavedData[activeTab]) {
      setPendingTab(targetTab);
      setShowConfirmModal(true);
    } else {
      setActiveTab(targetTab);
    }
  }, [activeTab, hasUnsavedData]);

  // 确认切换
  const confirmSwitch = useCallback(() => {
    if (pendingTab) {
      // 清除之前标签的数据状态
      setHasUnsavedData(prev => ({ ...prev, [activeTab]: false }));
      setActiveTab(pendingTab);
    }
    setShowConfirmModal(false);
    setPendingTab(null);
  }, [pendingTab, activeTab]);

  // 取消切换
  const cancelSwitch = useCallback(() => {
    setShowConfirmModal(false);
    setPendingTab(null);
  }, []);

  // 子组件更新数据状态
  const updateDataStatus = useCallback((tab: TabId, hasData: boolean) => {
    setHasUnsavedData(prev => ({ ...prev, [tab]: hasData }));
  }, []);

  // ✅ 使用 useCallback 缓存传递给子组件的回调函数，避免无限渲染循环
  const handleLinkDataStatusChange = useCallback((hasData: boolean) => {
    updateDataStatus('link', hasData);
  }, [updateDataStatus]);

  const handleEditorDataStatusChange = useCallback((hasData: boolean) => {
    updateDataStatus('editor', hasData);
  }, [updateDataStatus]);

  const renderContent = () => {
    switch (activeTab) {
      case 'link':
        return <LinkChecker onDataStatusChange={handleLinkDataStatusChange} />;
      case 'editor':
        return <ResourceEditor onDataStatusChange={handleEditorDataStatusChange} />;
      default:
        return null;
    }
  };


  // ✅ Token上下文值
  const tokenContextValue = {
    githubToken,
    setGithubToken,
    saveToken,
    resetToken,
    isTokenSaved,
  };

  return (
    // ✅ 用 TokenContext.Provider 包裹整个组件
    <TokenContext.Provider value={tokenContextValue}>
      <div style={STYLES.container}>
        {/* 顶部导航 */}
        <div style={STYLES.header}>
          <div style={STYLES.title}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}>
              <Wrench size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                工具箱
              </h1>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                导航站资源管理工具集
              </p>
            </div>
          </div>
          
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <a 
              href="/keystatic" 
              style={STYLES.adminLink}
            >
              <ArrowLeft size={16} />
              返回后台
            </a>
          </div>
        </div>

        {/* 标签页导航 */}
        <div style={TAB_STYLES.main}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => requestTabChange(tab.id)}
              style={{
                ...TAB_STYLES.mainTab(activeTab === tab.id),
                position: 'relative',
              }}
              title={tab.description}
            >
              {tab.icon}
              {tab.label}
              {/* 数据状态指示器 */}
              {hasUnsavedData[tab.id] && (
                <span style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#f59e0b',
                }} />
              )}
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div style={{ padding: '0' }}>
          {renderContent()}
        </div>

        {/* 确认切��弹窗 */}
        {showConfirmModal && (
          <div style={MODAL.overlay} onClick={cancelSwitch}>
            <div style={MODAL.content} onClick={e => e.stopPropagation()}>
              <div style={MODAL.title}>
                <AlertTriangle size={24} style={{ color: '#f59e0b' }} />
                确认切换？
              </div>
              
              <p style={MODAL.text}>
                当前页面有未保存的扫描数据，切换到其他标签页将导致数据丢失。
                <br /><br />
                确定要离开吗？
              </p>
              
              <div style={MODAL.buttons}>
                <button onClick={cancelSwitch} style={BUTTON.secondary}>
                  取消
                </button>
                <button onClick={confirmSwitch} style={BUTTON.danger}>
                  确认离开
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TokenContext.Provider>
  );
}
