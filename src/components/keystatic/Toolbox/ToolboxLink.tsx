// src/components/keystatic/Toolbox/ToolboxLink.tsx
import React from 'react';
import { Wrench, Github, Link, Plus } from 'lucide-react';

export function ToolboxLink() {
  return (
    <div style={{
      padding: '20px',
      background: 'linear-gradient(135deg, #eff6ff 0%, #faf5ff 100%)',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      marginBottom: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
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
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            工具箱
          </h3>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
            资源管理工具集
          </p>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <a
          href="/toolbox"
          target="_blank"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            padding: '16px 12px',
            background: 'white',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            textDecoration: 'none',
            transition: 'all 0.2s',
          }}
        >
          <Github size={24} style={{ color: '#1e293b' }} />
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>GitHub 检测</span>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>检测仓库状态</span>
        </a>
        
        <a
          href="/toolbox"
          target="_blank"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            padding: '16px 12px',
            background: 'white',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            textDecoration: 'none',
            transition: 'all 0.2s',
          }}
        >
          <Link size={24} style={{ color: '#1e293b' }} />
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>链接检测</span>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>检测网站有效性</span>
        </a>
        
        <a
          href="/toolbox"
          target="_blank"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            padding: '16px 12px',
            background: 'white',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            textDecoration: 'none',
            transition: 'all 0.2s',
          }}
        >
          <Plus size={24} style={{ color: '#1e293b' }} />
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>批量添加</span>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>批量添加资源</span>
        </a>
      </div>
      
      <p style={{ 
        marginTop: '16px', 
        fontSize: '12px', 
        color: '#64748b', 
        textAlign: 'center',
        padding: '8px',
        background: 'rgba(255,255,255,0.5)',
        borderRadius: '6px',
      }}>
        💡 点击上方卡片打开工具箱页面（仅开发环境可用）
      </p>
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
