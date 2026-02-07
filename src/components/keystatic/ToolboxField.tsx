// src/components/keystatic/ToolboxField.tsx
import React, { useState, useEffect, useRef } from 'react';
import { fields } from '@keystatic/core'; 

// --- 通用辅助函数 ---

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

  if (valueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter?.call(element, value);
  } else {
    valueSetter?.call(element, value);
  }
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

const stopBubble = (e: React.SyntheticEvent) => {
  e.stopPropagation();
};

// ==========================================
// 1. 智能填充组件 (AutoFiller)
// ==========================================
function AutoFillerComponent(props: any) {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    
    // 用于防抖的引用
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
    // 核心填充逻辑
    const handleSmartFill = async (targetUrl: string) => {
      if (!targetUrl) return;
      setLoading(true);
      setStatus('🔍 自动分析中...');
  
      try {
        const res = await fetch(`/api/smart-parse?url=${encodeURIComponent(targetUrl)}`);
        if (!res.ok) throw new Error(res.statusText);
        
        const data = await res.json();
        console.log('Smart Data:', data);
  
        const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea');
        let filledCount = 0;
  
        inputs.forEach((input: any) => {
          const container = input.closest('div[data-layout-span]') || input.closest('label') || input.parentElement?.parentElement;
          const labelText = (container?.textContent || '').toLowerCase();
          
          const isIconInput = input.getAttribute('data-id') === 'icon-input-field';

          if (!input.value || isIconInput) {
              
              if (labelText.includes('名称') || labelText.includes('name')) {
                  setNativeValue(input, data.title); filledCount++;
              }
              if ((labelText.includes('链接') || labelText.includes('url')) && !labelText.includes('官网') && !labelText.includes('official')) {
                  setNativeValue(input, data.originalUrl || targetUrl); filledCount++;
              }
              if (labelText.includes('官网') || labelText.includes('official')) {
                   if (data.homepage) { setNativeValue(input, data.homepage); filledCount++; }
              }
              if (labelText.includes('简短') || labelText.includes('desc')) {
                  setNativeValue(input, data.desc || ''); filledCount++;
              }

              if (isIconInput || labelText.includes('图标') || labelText.includes('icon')) {
                  if (data.icon) {
                       setNativeValue(input, data.icon);
                       filledCount++;
                  }
              }
          }
        });
  
        setStatus(`✅ 已填 ${filledCount} 项`);
        setTimeout(() => setStatus(''), 4000);
        // setUrl(''); // 保持 URL 不清空，方便用户确认
  
      } catch (e: any) {
        setStatus(`❌ 解析失败`);
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    // 监听 URL 变化，实现自动触发 (防抖)
    useEffect(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        const isLooksLikeUrl = /^https?:\/\/.{3,}/.test(url.trim());

        if (isLooksLikeUrl) {
            debounceTimerRef.current = setTimeout(() => {
                handleSmartFill(url.trim());
            }, 800);
        } else {
            setStatus(''); 
        }

        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [url]);
  
    return (
      <div 
        style={{ 
          display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '24px', 
          padding: '12px', border: '1px solid #bfdbfe', background: '#eff6ff', 
          borderRadius: '8px', position: 'relative' 
        }} 
        onClick={stopBubble}
      >
        <div style={{ fontSize: '20px' }}>🛠️</div>
        <input 
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="粘贴链接，自动开始解析..."
          style={{ 
            flex: 1, padding: '8px 12px', fontSize: '14px', 
            border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' 
          }}
          // 🔥 修复点：阻止 Enter 键默认提交表单行为
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // 关键：阻止关闭弹窗
                e.stopPropagation(); // 关键：阻止冒泡
                handleSmartFill(url);
            }
          }}
        />
        <button 
          type="button"
          onClick={() => handleSmartFill(url)}
          disabled={loading || !url}
          style={{ 
            padding: '8px 16px', fontSize: '14px', color: 'white', 
            background: '#2563eb', borderRadius: '4px', border: 'none', cursor: 'pointer',
            opacity: (loading || !url) ? 0.7 : 1,
            transition: 'opacity 0.2s'
          }}
        >
          {loading ? '⏳' : '填充'}
        </button>
        {status && (
          <span style={{ position: 'absolute', bottom: '-22px', right: '4px', fontSize: '12px', color: status.includes('❌') ? '#ef4444' : '#64748b', fontWeight: 'bold' }}>
            {status}
          </span>
        )}
      </div>
    );
  }

// ==========================================
// 2. IconPicker 组件
// ==========================================
export function IconPickerInput(props: any) {
    const [localIcons, setLocalIcons] = useState<string[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    
    const value = props.value || '';
    const onChange = props.onChange; 
    
    const containerRef = useRef<HTMLDivElement>(null);
  
    useEffect(() => {
      fetch('/api/smart-parse?mode=list_icons')
        .then(res => {
            if(!res.ok) return [];
            return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) setLocalIcons(data);
        })
        .catch(e => console.error("Icon load failed", e));
      
      const handleClickOutside = (event: any) => {
        if (containerRef.current && !containerRef.current.contains(event.target)) {
          setShowDropdown(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
  
    const handleSelect = (iconPath: string) => {
      onChange(iconPath); 
      setShowDropdown(false);
    };
  
    // --- 样式定义 ---
    const containerStyle: React.CSSProperties = { position: 'relative', marginBottom: '8px' };
    const labelStyle: React.CSSProperties = { display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '4px' };
    const descStyle: React.CSSProperties = { display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '8px' };
    const wrapperStyle: React.CSSProperties = { display: 'flex', gap: '12px', alignItems: 'center' };
    
    const previewStyle: React.CSSProperties = {
      width: '40px', height: '40px', 
      border: '1px solid #cbd5e1', borderRadius: '4px', 
      background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0
    };
  
    const inputWrapperStyle: React.CSSProperties = { flex: 1, position: 'relative' };
    const inputStyle: React.CSSProperties = {
      width: '100%', padding: '8px 12px', paddingRight: '30px',
      fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none',
      fontFamily: 'monospace'
    };
  
    const dropdownStyle: React.CSSProperties = {
      position: 'absolute', zIndex: 9999, 
      top: '100%', left: 0, right: 0, marginTop: '4px',
      background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      maxHeight: '240px', overflowY: 'auto', padding: '8px',
      
      opacity: showDropdown ? 1 : 0,
      transform: showDropdown ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.98)',
      pointerEvents: showDropdown ? 'auto' : 'none', 
      visibility: showDropdown ? 'visible' : 'hidden',
      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      transformOrigin: 'top center',
    };

    const arrowStyle: React.CSSProperties = {
      position: 'absolute', right: '8px', top: '50%', 
      transform: `translateY(-50%) rotate(${showDropdown ? 180 : 0}deg)`, 
      background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '20px', height: '20px'
    };
  
    return (
      <div ref={containerRef} style={containerStyle} onClick={stopBubble}>
        <label style={labelStyle}>图标路径</label>
        <span style={descStyle}>输入 URL 或从下拉框选择本地图标</span>
  
        <div style={wrapperStyle}>
          {/* 预览图 */}
          <div style={previewStyle}>
            {value ? (
              <img 
                src={value} 
                alt="icon" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                onError={(e:any) => { e.target.style.display='none'; }} 
              />
            ) : (
              <span style={{ color: '#cbd5e1', fontSize: '10px' }}>None</span>
            )}
          </div>
  
          {/* 输入框区域 */}
          <div style={inputWrapperStyle}>
             <input
              type="text"
              data-id="icon-input-field" 
              value={value}
              onChange={e => onChange(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              placeholder="/images/logos/xxx.webp"
              style={inputStyle}
             />
            <button 
              type="button"
              style={arrowStyle}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              ▼
            </button>
          </div>
        </div>
  
        {/* 下拉面板 */}
        {localIcons.length > 0 && (
          <div style={dropdownStyle}>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', padding: '0 4px' }}>
              本地库 ({localIcons.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
              {localIcons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => handleSelect(icon)}
                  title={icon.split('/').pop()}
                  style={{
                      border: value === icon ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                      borderRadius: '4px', padding: '4px', background: 'white', cursor: 'pointer',
                      aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'border-color 0.2s, background-color 0.2s'
                  }}
                >
                  <img src={icon} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
}

const _dummyText = fields.text({ label: 'dummy' });
type TextFieldType = typeof _dummyText;

export const toolboxField = {
  kind: 'form' as const,
  Input: AutoFillerComponent,
  defaultValue: () => null,
  parse: () => null,
  serialize: () => ({ value: null }),
  validate: (value: any) => true, 
  reader: { parse: () => null },
} as any; 

export const iconPickerField = {
    kind: 'form' as const,
    Input: IconPickerInput,
    defaultValue: () => '',
    validate: (value: unknown) => typeof value === 'string',
    parse: (value: unknown) => (value === undefined || value === null) ? '' : String(value),
    serialize: (value: unknown) => ({ value: value }), 
    reader: {
        parse: (value: unknown) => (value === undefined || value === null) ? '' : String(value),
    }
} as unknown as TextFieldType;