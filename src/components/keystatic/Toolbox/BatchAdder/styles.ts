// BatchAdder 样式常量

export const STYLES = {
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

// 状态徽章辅助函数
export const getStatusBadge = (status: string) => {
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
