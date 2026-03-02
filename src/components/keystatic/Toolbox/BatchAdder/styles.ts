// BatchAdder 样式常量
// 使用共享样式模块
import {
  LAYOUT,
  CARD,
  BUTTON,
  INPUT,
} from '../toolbox-shared';

export const STYLES = {
  // 从共享样式导入
  container: LAYOUT.container,
  card: {
    base: CARD.base,
    header: CARD.header,
    headerIcon: CARD.headerIcon,
    headerTitle: CARD.headerTitle,
    headerExtra: CARD.headerExtra,
    headerCount: CARD.headerCount,
    body: CARD.body,
  },
  header: CARD.header,
  body: CARD.body,
  input: INPUT.base,
  textarea: INPUT.textarea,
  button: BUTTON,
  select: INPUT.select,
  
  // 组件特有样式
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
