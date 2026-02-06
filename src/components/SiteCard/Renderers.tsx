// src/components/SiteCard/Renderers.tsx
import React from 'react';

// 这是给 DocumentRenderer 用的渲染规则
export const componentBlockRenderers = {
  // 对应你在 config 里定义的 key: 'container'
  container: (props: any) => {
    const { type, title, content } = props;
    
    // 简单的样式映射 (复用你 config 里的逻辑)
    const styles: any = {
      note: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', icon: 'ℹ️' },
      tip: { bg: '#f0fdf4', border: '#22c55e', text: '#166534', icon: '💡' },
      important: { bg: '#faf5ff', border: '#a855f7', text: '#6b21a8', icon: '💬' },
      warning: { bg: '#fefce8', border: '#eab308', text: '#854d0e', icon: '⚠️' },
      danger: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', icon: '🔥' },
      details: { bg: '#f8fafc', border: '#cbd5e1', text: '#334155', icon: '▶' },
    };
    const style = styles[type] || styles.note;

    // 渲染成简单的 HTML 结构
    return (
      <div style={{ 
        padding: '10px', 
        background: style.bg, 
        borderLeft: `3px solid ${style.border}`, 
        borderRadius: '4px', 
        margin: '8px 0',
        fontSize: '0.9em'
      }}>
        <div style={{ fontWeight: 'bold', color: style.text, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
           <span>{style.icon}</span> {title || type.toUpperCase()}
        </div>
        {/* 这里的 children 是 Keystatic 帮你渲染好的内部富文本 */}
        <div>{props.children}</div> 
      </div>
    );
  },
};