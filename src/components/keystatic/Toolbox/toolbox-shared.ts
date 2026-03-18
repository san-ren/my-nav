// Toolbox 共享样式常量
// 所有标签页和组件共用，实现一次修改、全局生效

// ==================== 基础布局样式 ====================
export const LAYOUT = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  containerWide: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
};

// ==================== 标签页样式 ====================
export const TABS = {
  // 主标签容器（顶部导航级别）
  main: {
    display: 'flex',
    gap: '2px',
    padding: '12px 16px 0 16px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    position: 'relative' as const,
    zIndex: 1,
  },
  // 主标签按钮
  mainTab: (isActive: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: isActive ? 600 : 500,
    color: isActive ? '#1e293b' : '#64748b',
    background: isActive ? '#ffffff' : 'transparent',
    border: 'none',
    borderRadius: isActive ? '12px 12px 0 0' : '8px 8px 0 0',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative' as const,
    zIndex: isActive ? 10 : 1,
    // 活动标签使用白色背景覆盖下面的边框
    marginBottom: '-1px',
    boxShadow: isActive ? '0 -2px 8px rgba(0,0,0,0.04)' : 'none',
  }),
  // 子标签容器（二级导航，与主标签视觉连接）
  sub: {
    display: 'flex',
    gap: '8px',
    marginTop: '-1px',
    marginBottom: '0',
    background: '#ffffff',
    padding: '12px 16px',
    borderBottom: '1px solid #e2e8f0',
    position: 'relative' as const,
    zIndex: 0,
  },
  // 子标签按钮（选中样式与主标签一致）
  subTab: (isActive: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    color: isActive ? '#2563eb' : '#64748b',
    background: isActive ? '#eff6ff' : 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  }),
};

// ==================== 卡片样式 ====================
export const CARD = {
  base: {
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    marginBottom: '16px',
    overflow: 'hidden',
  },
  header: {
    padding: '12px 16px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minHeight: '56px',
    boxSizing: 'border-box' as const,
  },
  // Header 内部元素样式
  headerIcon: {
    color: '#3b82f6',
  },
  headerTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#0f172a',
  },
  headerExtra: {
    marginLeft: 'auto',
  },
  headerCount: {
    marginLeft: '8px',
    fontSize: '12px',
    color: '#94a3b8',
  },
  body: {
    padding: '10px 20px',
  },
};

// ==================== 按钮样式 ====================
export const BUTTON = {
  primary: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'white',
    background: '#2563eb',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.2s',
  },
  secondary: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#475569',
    background: '#f1f5f9',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.2s',
  },
  success: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'white',
    background: '#22c55e',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.2s',
  },
  danger: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'white',
    background: '#ef4444',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.2s',
  },
  // 图标按钮
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
  // 小型按钮
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
  // 带图标的按钮
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
};

// ==================== 输入框样式 ====================
export const INPUT = {
  base: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'monospace',
  },
  // 文本域
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
  // 选择框
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
  // 带按钮的输入框容器
  withButton: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  field: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '14px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'monospace',
  },
};

// ==================== 表格样式 ====================
export const TABLE = {
  base: {
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
};

// ==================== 树形节点样式 ====================
export const TREE = {
  node: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderBottom: '1px solid #f1f5f9',
    transition: 'background 0.15s',
  },
};

// ==================== 进度条样式 ====================
export const PROGRESS = {
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
};

// ==================== 徽章样式 ====================
export const BADGE = {
  // 状态徽章
  ok: { background: '#dcfce7', color: '#166534' },
  failed: { background: '#fee2e2', color: '#991b1b' },
  timeout: { background: '#fef3c7', color: '#92400e' },
  excluded: { background: '#f1f5f9', color: '#64748b' },
  stale: { background: '#fef3c7', color: '#92400e' },
  archived: { background: '#ede9fe', color: '#5b21b6' },
  // 标签样式
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
  tagPrimary: {
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
};

// ==================== 消息提示样式 ====================
export const MESSAGE = {
  success: {
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '16px',
    background: '#dcfce7',
    color: '#166534',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  error: {
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '16px',
    background: '#fee2e2',
    color: '#991b1b',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
};

// ==================== 弹窗样式 ====================
export const MODAL = {
  overlay: {
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
  content: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '12px',
  },
  text: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.6',
    marginBottom: '24px',
  },
  buttons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
};

// ==================== 页面标题样式 ====================
export const PAGE_TITLE = {
  container: {
    marginBottom: '12px',
  },
  h1: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  description: {
    color: '#64748b',
    fontSize: '13px',
    lineHeight: 1.4,
  },
};

// ==================== 动画样式字符串 ====================
export const ANIMATION_CSS = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
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
  
  .animate-spin {
    animation: spin 1s linear infinite;
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

// ==================== 辅助函数 ====================

// 获取状态徽章样式
export const getStatusBadge = (status: string): { text: string; color: string; bg: string } => {
  const statusMap: Record<string, { text: string; color: string; bg: string }> = {
    // 解析状态
    pending: { text: '待解析', color: '#64748b', bg: '#f1f5f9' },
    parsing: { text: '解析中...', color: '#2563eb', bg: '#eff6ff' },
    ready: { text: '就绪', color: '#22c55e', bg: '#dcfce7' },
    // 检测状态
    ok: { text: '正常', color: '#166534', bg: '#dcfce7' },
    '官网失效': { text: '官网失效', color: '#991b1b', bg: '#fee2e2' },
    timeout: { text: '超时', color: '#92400e', bg: '#fef3c7' },
    excluded: { text: '已排除', color: '#64748b', bg: '#f1f5f9' },
    stale: { text: '长期未更新', color: '#92400e', bg: '#fef3c7' },
    archived: { text: '已归档', color: '#5b21b6', bg: '#ede9fe' },
    // 新增状态
    'github已归档': { text: 'github已归档', color: '#5b21b6', bg: '#ede9fe' },
    'github仓库已失效': { text: 'github仓库已失效', color: '#991b1b', bg: '#fee2e2' },
    '网站失效': { text: '网站失效', color: '#991b1b', bg: '#fee2e2' },
    '网站超时': { text: '网站超时', color: '#92400e', bg: '#fef3c7' },
    // 错误状态
    error: { text: '解析失败', color: '#ef4444', bg: '#fee2e2' },
  };
  
  return statusMap[status] || { text: status, color: '#64748b', bg: '#f1f5f9' };
};

// 状态排序权重
export const getStatusWeight = (status: string): number => {
  const weights: Record<string, number> = {
    '官网失效': 0,
    'github仓库已失效': 0,
    '网站失效': 0,
    archived: 1,
    'github已归档': 1,
    timeout: 2,
    '网站超时': 2,
    stale: 3,
    excluded: 4,
    ok: 5,
  };
  return weights[status] ?? 6;
};

// 资源状态排序权重
export const getResourceStatusWeight = (status: string | undefined): number => {
  if (!status) return 5;
  const weights: Record<string, number> = {
    '官网失效': 0,
    'github仓库已失效': 0,
    '网站失效': 0,
    'github已归档': 1,
    '网站超时': 2,
    stale: 3,
    ok: 4,
  };
  return weights[status] ?? 5;
};
