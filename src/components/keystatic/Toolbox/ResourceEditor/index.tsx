// ResourceEditor 主组件 - 整合批量添加和资源转移功能
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  ArrowRightLeft
} from 'lucide-react';
import { BatchAdder } from '../BatchAdder';
import { ResourceMover } from '../ResourceMover';
import {
  LAYOUT,
  TABS
} from '../toolbox-shared';

// --- 类型定义 ---
type SubTabId = 'batch' | 'mover';

interface SubTab {
  id: SubTabId;
  label: string;
  icon: React.ReactNode;
  description: string;
}

// --- 样式常量 ---
// 使用共享样式
const STYLES = {
  container: LAYOUT.containerWide,
};

// --- 子标签配置 ---
const SUB_TABS: SubTab[] = [
  {
    id: 'batch',
    label: '批量添加',
    icon: <Plus size={16} />,
    description: '批量添加资源到导航站',
  },
  {
    id: 'mover',
    label: '资源转移',
    icon: <ArrowRightLeft size={16} />,
    description: '移动资源到其他位置',
  },
];

// --- 主组件 ---
interface ResourceEditorProps {
  onDataStatusChange?: (hasData: boolean) => void;
  onTaskStart?: (id: string, name: string) => void;
  onTaskProgress?: (id: string, progress: number) => void;
  onTaskEnd?: (id: string, message?: string) => void;
}

export function ResourceEditor({ onDataStatusChange, onTaskStart, onTaskProgress, onTaskEnd }: ResourceEditorProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('batch');
  const [tabDataStatus, setTabDataStatus] = useState<{ batch: boolean; mover: boolean }>({ batch: false, mover: false });

  // 通知父组件数据状态变化
  const onDataStatusChangeRef = useRef(onDataStatusChange);
  useEffect(() => {
    onDataStatusChangeRef.current = onDataStatusChange;
  }, [onDataStatusChange]);

  // 渲染任务参数
  const taskProps = {
    onTaskStart,
    onTaskProgress,
    onTaskEnd
  };

  useEffect(() => {
    onDataStatusChangeRef.current?.(tabDataStatus[activeSubTab]);
  }, [tabDataStatus, activeSubTab]);

  // 子组件数据状态变化回调
  const handleDataStatusChange = (tabId: SubTabId) => (hasData: boolean) => {
    setTabDataStatus(prev => ({ ...prev, [tabId]: hasData }));
  };

  return (
    <div>
      {/* 子标签切换 */}
      <div style={TABS.sub}>
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            className="toolbox-sub-tab"
            onClick={() => setActiveSubTab(tab.id)}
            style={TABS.subTab(activeSubTab === tab.id)}
            title={tab.description}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 - 居中显示，独立卡片 */}
      <div style={STYLES.container} className="tab-content">
        <div style={{ display: activeSubTab === 'batch' ? 'block' : 'none' }}>
          <BatchAdder onDataStatusChange={handleDataStatusChange('batch')} {...taskProps} />
        </div>
        <div style={{ display: activeSubTab === 'mover' ? 'block' : 'none' }}>
          <ResourceMover onDataStatusChange={handleDataStatusChange('mover')} {...taskProps} />
        </div>
      </div>
    </div>
  );
}
