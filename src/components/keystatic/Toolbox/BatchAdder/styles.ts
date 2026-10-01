// BatchAdder 样式常量
// 基础样式来自 shared/styles（各工具共用），这里只补本组件特有样式
import { INPUT } from '../toolbox-shared';
import { buildToolboxStyles } from '../shared/styles';

export const STYLES = buildToolboxStyles({
  textarea: INPUT.textarea,
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
});

// 状态徽章辅助函数：统一来自 src/utils/resourceStatus.ts（唯一真源）
export { getStatusBadge } from '../../../../utils/resourceStatus';
