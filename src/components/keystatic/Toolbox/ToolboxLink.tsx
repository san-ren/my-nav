// src/components/keystatic/Toolbox/ToolboxLink.tsx
import React from 'react';
import { Wrench, Github, Link, Plus } from 'lucide-react';

export function ToolboxLink() {
  return (
    <div style={{
      padding: '12px 16px',
      background: 'linear-gradient(135deg, #eff6ff 0%, #faf5ff 100%)',
      borderRadius: '10px',
      border: '1px solid #e2e8f0',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    }}>
      {/* 左侧标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}>
          <Wrench size={18} />
        </div>
        
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
            工具箱
          </h3>
          <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
            仅开发环境
          </p>
        </div>
      </div>

      {/* 分隔线 */}
      <div style={{ width: '1px', height: '32px', background: '#e2e8f0', flexShrink: 0 }} />

      {/* 右侧功能按钮 */}
      <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
        <a
          href="/toolbox"
          target="_blank"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            background: 'white',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            textDecoration: 'none',
            transition: 'all 0.2s',
            fontSize: '13px',
            fontWeight: 500,
            color: '#334155',
          }}
        >
          <Github size={16} style={{ color: '#1e293b' }} />
          GitHub 检测
        </a>

        <a
          href="/toolbox"
          target="_blank"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            background: 'white',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            textDecoration: 'none',
            transition: 'all 0.2s',
            fontSize: '13px',
            fontWeight: 500,
            color: '#334155',
          }}
        >
          <Link size={16} style={{ color: '#1e293b' }} />
          链接检测
        </a>

        <a
          href="/toolbox"
          target="_blank"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            background: 'white',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            textDecoration: 'none',
            transition: 'all 0.2s',
            fontSize: '13px',
            fontWeight: 500,
            color: '#334155',
          }}
        >
          <Plus size={16} style={{ color: '#1e293b' }} />
          批量添加
        </a>
      </div>
    </div>
  );
}

// Keystatic 字段定义
export const toolboxLinkField = {
  kind: 'form' as const,
  Input: ToolboxLink,
  defaultValue: () => null,
  parse: () => null,
  serialize: () => ({ value: null }),
  validate: () => true,
  reader: { parse: () => null },
} as any;
