// ResourceEditor 主组件 - 整合批量添加和资源转移功能
import React, { useState, useEffect, useRef } from 'react';
import { 
  Edit3, 
  Plus, 
  ArrowRightLeft,
  AlertTriangle
} from 'lucide-react';
import { BatchAdder } from '../BatchAdder';
import { ResourceMover } from '../ResourceMover';
import {
  LAYOUT,
  TABS,
  PAGE_TITLE,
  MODAL,
  BUTTON
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
}

export function ResourceEditor({ onDataStatusChange }: ResourceEditorProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('batch');
  const [hasUnsavedData, setHasUnsavedData] = useState(false);
  const [pendingSubTab, setPendingSubTab] = useState<SubTabId | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 通知父组件数据状态变化
  const onDataStatusChangeRef = useRef(onDataStatusChange);
  useEffect(() => {
    onDataStatusChangeRef.current = onDataStatusChange;
  }, [onDataStatusChange]);

  useEffect(() => {
    onDataStatusChangeRef.current?.(hasUnsavedData);
  }, [hasUnsavedData]);

  // 子组件数据状态变化回调
  const handleDataStatusChange = (hasData: boolean) => {
    setHasUnsavedData(hasData);
  };

  const requestSubTabChange = (targetTab: SubTabId) => {
    if (hasUnsavedData && targetTab !== activeSubTab) {
      setPendingSubTab(targetTab);
      setShowConfirmModal(true);
    } else {
      setActiveSubTab(targetTab);
    }
  };

  const confirmSwitch = () => {
    if (pendingSubTab) {
      setActiveSubTab(pendingSubTab);
      setHasUnsavedData(false);
    }
    setShowConfirmModal(false);
    setPendingSubTab(null);
  };

  const cancelSwitch = () => {
    setShowConfirmModal(false);
    setPendingSubTab(null);
  };

  return (
    <div>
      {/* 子标签切换 */}
      <div style={TABS.sub}>
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            className="toolbox-sub-tab"
            onClick={() => requestSubTabChange(tab.id)}
            style={TABS.subTab(activeSubTab === tab.id)}
            title={tab.description}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 - 居中显示，独立卡片 */}
      <div style={STYLES.container}>
        {activeSubTab === 'batch' && (
          <BatchAdder onDataStatusChange={handleDataStatusChange} />
        )}
        {activeSubTab === 'mover' && (
          <ResourceMover onDataStatusChange={handleDataStatusChange} />
        )}
      </div>

      {/* 确认切换弹窗 */}
      {showConfirmModal && (
        <div style={MODAL.overlay} onClick={cancelSwitch}>
          <div style={MODAL.content} onClick={e => e.stopPropagation()}>
            <div style={MODAL.title}>
              <AlertTriangle size={24} style={{ color: '#f59e0b' }} />
              确认离开？
            </div>
            
            <p style={MODAL.text}>
              当前标签页有未保存的数据，离开将导致数据丢失。
              <br /><br />
              确定要切换吗？
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
  );
}
