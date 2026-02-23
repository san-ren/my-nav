// src/components/keystatic/Toolbox/ToolboxPage.tsx
import React, { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { Github, Link, Plus, Wrench, ArrowLeft, AlertTriangle, Save, RotateCcw, Check, Eye, EyeOff } from 'lucide-react';
import { GithubChecker } from './GithubChecker';
import { LinkChecker } from './LinkChecker';
import { BatchAdder } from './BatchAdder';

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
type TabId = 'github' | 'link' | 'batch';

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
    padding: '16px 24px',
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
    gap: '12px',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    padding: '16px 24px',
    background: 'white',
    borderBottom: '1px solid #e2e8f0',
  },
  tab: (isActive: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: isActive ? '#2563eb' : '#64748b',
    background: isActive ? '#eff6ff' : 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  }),
  content: {
    padding: '0',
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
  // 弹窗样式
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '12px',
  },
  modalText: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.6',
    marginBottom: '24px',
  },
  modalButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  buttonPrimary: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'white',
    background: '#ef4444',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
  },
  buttonSecondary: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#475569',
    background: '#f1f5f9',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
  },
};

// --- 标签页配置 ---
const TABS: Tab[] = [
  {
    id: 'github',
    label: 'GitHub 检测',
    icon: <Github size={18} />,
    description: '检测 GitHub 仓库状态',
  },
  {
    id: 'link',
    label: '链接检测',
    icon: <Link size={18} />,
    description: '检测网站链接有效性',
  },
  {
    id: 'batch',
    label: '批量添加',
    icon: <Plus size={18} />,
    description: '批量添加资源',
  },
];

// --- 主组件 ---
export function ToolboxPage() {
  const [activeTab, setActiveTab] = useState<TabId>('github');
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
    github: false,
    link: false,
    batch: false,
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
  const handleGithubDataStatusChange = useCallback((hasData: boolean) => {
    updateDataStatus('github', hasData);
  }, [updateDataStatus]);

  const handleLinkDataStatusChange = useCallback((hasData: boolean) => {
    updateDataStatus('link', hasData);
  }, [updateDataStatus]);

  const handleBatchDataStatusChange = useCallback((hasData: boolean) => {
    updateDataStatus('batch', hasData);
  }, [updateDataStatus]);

  const renderContent = () => {
    switch (activeTab) {
      case 'github':
        return <GithubChecker onDataStatusChange={handleGithubDataStatusChange} />;
      case 'link':
        return <LinkChecker onDataStatusChange={handleLinkDataStatusChange} />;
      case 'batch':
        return <BatchAdder onDataStatusChange={handleBatchDataStatusChange} />;
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
        <div style={STYLES.tabs}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => requestTabChange(tab.id)}
              style={{
                ...STYLES.tab(activeTab === tab.id),
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
        <div style={STYLES.content}>
          {renderContent()}
        </div>

        {/* 确认切换弹窗 */}
        {showConfirmModal && (
          <div style={STYLES.modalOverlay} onClick={cancelSwitch}>
            <div style={STYLES.modal} onClick={e => e.stopPropagation()}>
              <div style={STYLES.modalTitle}>
                <AlertTriangle size={24} style={{ color: '#f59e0b' }} />
                确认切换？
              </div>
              
              <p style={STYLES.modalText}>
                当前页面有未保存的扫描数据，切换到其他标签页将导致数据丢失。
                <br /><br />
                确定要离开吗？
              </p>
              
              <div style={STYLES.modalButtons}>
                <button onClick={cancelSwitch} style={STYLES.buttonSecondary}>
                  取消
                </button>
                <button onClick={confirmSwitch} style={STYLES.buttonPrimary}>
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
