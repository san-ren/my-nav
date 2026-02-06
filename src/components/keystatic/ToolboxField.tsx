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
    // ... (代码保持不变)
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
  
    const handleSmartFill = async () => {
      // ... (代码保持不变)
      if (!url) return;
      setLoading(true);
      setStatus('🔍 分析中...');
  
      try {
        const res = await fetch(`/api/smart-parse?url=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error(res.statusText);
        
        const data = await res.json();
        console.log('Smart Data:', data);
  
        const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea');
        let filledCount = 0;
  
        inputs.forEach((input: any) => {
          const container = input.closest('div[data-layout-span]') || input.closest('label') || input.parentElement?.parentElement;
          const labelText = (container?.textContent || '').toLowerCase();
          
          if (!input.value) {
              if (labelText.includes('名称') || labelText.includes('name')) {
                  setNativeValue(input, data.title); filledCount++;
              }
              if ((labelText.includes('链接') || labelText.includes('url')) && !labelText.includes('官网') && !labelText.includes('official')) {
                  setNativeValue(input, data.originalUrl || url); filledCount++;
              }
              if (labelText.includes('官网') || labelText.includes('official')) {
                   if (data.homepage) { setNativeValue(input, data.homepage); filledCount++; }
              }
              if (labelText.includes('简短') || labelText.includes('desc')) {
                  setNativeValue(input, data.desc || ''); filledCount++;
              }
              // 强制覆盖图标字段
              if (labelText.includes('图标') || labelText.includes('icon')) {
                  if (data.icon && (!input.value || input.value === '')) {
                       setNativeValue(input, data.icon);
                       filledCount++;
                  }
              }
          }
        });
  
        setStatus(`✅ 已填 ${filledCount} 项`);
        setTimeout(() => setStatus(''), 4000);
        setUrl(''); 
  
      } catch (e: any) {
        setStatus(`❌ 失败`);
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
  
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
          placeholder="粘贴链接，自动抓取图标和信息..."
          style={{ 
            flex: 1, padding: '8px 12px', fontSize: '14px', 
            border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' 
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSmartFill()}
        />
        <button 
          type="button"
          onClick={handleSmartFill}
          disabled={loading}
          style={{ 
            padding: '8px 16px', fontSize: '14px', color: 'white', 
            background: '#2563eb', borderRadius: '4px', border: 'none', cursor: 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? '⏳' : '填充'}
        </button>
        {status && (
          <span style={{ position: 'absolute', bottom: '-20px', right: '10px', fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>
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
    // ... (代码保持不变)
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
  
    // 样式定义
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
      maxHeight: '240px', overflowY: 'auto', padding: '8px'
    };
  
    return (
      <div ref={containerRef} style={containerStyle} onClick={stopBubble}>
        <label style={labelStyle}>图标路径</label>
        <span style={descStyle}>输入 URL 或从下拉框选择本地图标</span>
  
        <div style={wrapperStyle}>
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
  
          <div style={inputWrapperStyle}>
             <input
              type="text"
              value={value}
              onChange={e => onChange(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              placeholder="/images/logos/xxx.webp"
              style={inputStyle}
            />
            <button 
              type="button"
              style={{ 
                  position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer'
              }}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              ▼
            </button>
          </div>
        </div>
  
        {showDropdown && localIcons.length > 0 && (
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
                      aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center'
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

// 🔥 2. 定义一个标准 Text 字段的类型，用于“欺骗” TS
// 我们不需要真正创建它，只需要它的类型
const _dummyText = fields.text({ label: 'dummy' });
type TextFieldType = typeof _dummyText;

// 🔥 3. 导出 ToolboxField，并强转类型为 any
// 这里必须用 as any，因为 AutoFiller 的 UI 结构比较特殊
export const toolboxField = {
  kind: 'form' as const,
  Input: AutoFillerComponent,
  defaultValue: () => null,
  parse: () => null,
  serialize: () => ({ value: null }),
  validate: (value: any) => true, 
  reader: { parse: () => null },
} as any; 

// 🔥 4. 导出 IconPickerField，并强转为 TextFieldType
// 这样 keystatic.config.tsx 就会把它当作一个普通的 fields.text 处理，从而消除所有报错
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
} as unknown as TextFieldType; // 双重断言：先转 unknown 再转 TextFieldType，最稳妥