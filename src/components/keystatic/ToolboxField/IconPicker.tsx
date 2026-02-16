// src/components/keystatic/ToolboxField/IconPicker.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { stopBubble } from './utils';

export function IconPickerInput(props: any) {
    const [localIcons, setLocalIcons] = useState<string[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [hoveredIconIdx, setHoveredIconIdx] = useState<number | null>(null);
    
    // 内部状态，初始化时防空
    const [internalValue, setInternalValue] = useState(props.value || '');

    const containerRef = useRef<HTMLDivElement>(null);
    // 🔥 新增：专门用于引用 input 元素，以便绑定原生事件
    const inputRef = useRef<HTMLInputElement>(null);

    // 1. 【向下同步】监听 props.value (Keystatic -> Component)
    useEffect(() => {
        // 只有当传入值确实改变，且不等于当前内部值时才更新，避免死循环
        // 同时处理 undefined/null 转换为空字符串
        const incomingValue = props.value === undefined || props.value === null ? '' : props.value;
        if (incomingValue !== internalValue) {
            setInternalValue(incomingValue);
        }
    }, [props.value]);

    // 2. 【核心修复：原生事件监听】(AutoFiller -> Component)
    // 这是解决“自动填充后预览不显示”的关键。
    // 我们绕过 React 合成事件，直接监听 DOM 的 'input' 事件。
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;

        const handleNativeInput = (e: Event) => {
            const target = e.target as HTMLInputElement;
            const newValue = target.value;
            
            // 强制同步内部状态（修复预览图）
            setInternalValue(newValue);
            // 通知 Keystatic 保存
            props.onChange(newValue);
        };

        // 监听 AutoFiller 触发的冒泡事件
        el.addEventListener('input', handleNativeInput);
        
        return () => {
            el.removeEventListener('input', handleNativeInput);
        };
    }, []); // 仅在挂载时绑定一次

    // 3. 处理用户手动输入（保留 React 处理方式作为双重保险）
    const handleValueChange = (newValue: string) => {
        setInternalValue(newValue);
        props.onChange(newValue);
    };
  
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
      // 选中后也要更新
      setInternalValue(iconPath);
      props.onChange(iconPath);
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
  
    const inputWrapperStyle: React.CSSProperties = { flex: 1, position: 'relative', display: 'flex', alignItems: 'center' };
    
    const inputStyle: React.CSSProperties = {
      width: '100%', padding: '8px 12px', paddingRight: '40px',
      fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none',
      fontFamily: 'monospace', color: '#334155'
    };
  
    const dropdownStyle: React.CSSProperties = {
      position: 'absolute', zIndex: 9999, 
      top: '100%', left: 0, right: 0, marginTop: '4px',
      background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      maxHeight: '240px', overflowY: 'auto', padding: '12px',
      
      opacity: showDropdown ? 1 : 0,
      transform: showDropdown ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.98)',
      pointerEvents: showDropdown ? 'auto' : 'none', 
      visibility: showDropdown ? 'visible' : 'hidden',
      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      transformOrigin: 'top center',
    };

    const arrowButtonStyle: React.CSSProperties = {
      position: 'absolute', right: '6px', top: '50%', marginTop: '-14px',
      width: '28px', height: '28px',
      borderRadius: '6px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: showDropdown ? '#eff6ff' : 'transparent',
      color: showDropdown ? '#2563eb' : '#94a3b8',
      border: 'none', cursor: 'pointer',
      transition: 'all 0.2s ease',
    };

    const iconStyle: React.CSSProperties = {
      transform: `rotate(${showDropdown ? 90 : 0}deg)`,
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    };

    const itemWrapperStyle: React.CSSProperties = {
        position: 'relative', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1, 
    };

    const largePreviewStyle = (isHovered: boolean): React.CSSProperties => ({
        position: 'absolute',
        top: '50%', left: '50%',
        width: '160px', 
        height: '160px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', 
        padding: '12px',
        zIndex: 10000, 
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', 
        opacity: isHovered ? 1 : 0,
        visibility: isHovered ? 'visible' : 'hidden',
        transform: `translate(-50%, -50%) scale(${isHovered ? 1 : 0.5})`,
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', 
    });
  
    return (
      <div ref={containerRef} style={containerStyle} onClick={stopBubble}>
        <label style={labelStyle}>图标路径</label>
        <span style={descStyle}>输入 URL 或从下拉框选择本地图标</span>
  
        <div style={wrapperStyle}>
          {/* 预览图 */}
          <div style={previewStyle}>
            {internalValue ? (
              <img 
                src={internalValue} 
                alt="icon" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                onError={(e:any) => { e.target.style.display='none'; }} 
              />
            ) : (
              <span style={{ color: '#cbd5e1', fontSize: '10px' }}>None</span>
            )}
          </div>
  
          {/* 输入框 */}
          <div style={inputWrapperStyle}>
             <input
              ref={inputRef} // 🔥 关键：绑定 Ref
              type="text"
              data-id="icon-input-field" 
              value={internalValue}
              onChange={e => handleValueChange(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              placeholder="/images/logos/xxx.webp"
              style={inputStyle}
             />
             
            <button 
              type="button"
              style={arrowButtonStyle}
              onClick={() => setShowDropdown(!showDropdown)}
              onMouseEnter={(e) => {
                 if(!showDropdown) {
                    e.currentTarget.style.backgroundColor = '#f1f5f9'; 
                    e.currentTarget.style.color = '#475569'; 
                 }
              }}
              onMouseLeave={(e) => {
                 if(!showDropdown) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                 }
              }}
            >
              <ChevronRight size={18} style={iconStyle} />
            </button>
          </div>
        </div>
  
        {/* 下拉面板 */}
        {localIcons.length > 0 && (
          <div style={dropdownStyle}>
            <div style={{ 
                fontSize: '11px', fontWeight: 700, color: '#94a3b8', 
                marginBottom: '8px', padding: '0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' 
            }}>
              Local Icons ({localIcons.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(32px, 1fr))', gap: '8px', position: 'relative' }}>
              {localIcons.map((icon, index) => {
                const isHovered = hoveredIconIdx === index;
                return (
                <div 
                    key={icon + index}
                    style={{...itemWrapperStyle, zIndex: isHovered ? 20 : 1 }}
                    onMouseEnter={() => setHoveredIconIdx(index)}
                    onMouseLeave={() => setHoveredIconIdx(null)}
                >
                    <button
                    type="button"
                    onClick={() => handleSelect(icon)}
                    title={icon.split('/').pop()} 
                    style={{
                        border: internalValue === icon ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                        borderRadius: '6px', padding: '4px', background: 'white', cursor: 'pointer',
                        width: '100%', height: '100%',
                        aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                        opacity: isHovered ? 0.5 : 1, 
                    }}
                    onMouseEnter={(e) => { 
                        e.currentTarget.style.borderColor = '#93c5fd'; 
                    }}
                    onMouseLeave={(e) => { 
                        e.currentTarget.style.borderColor = internalValue === icon ? '#3b82f6' : '#e2e8f0'; 
                    }}
                    >
                        <img src={icon} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} loading="lazy" />
                    </button>

                    <div style={largePreviewStyle(isHovered)}>
                        <img src={icon} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                </div>
              )})}
            </div>
          </div>
        )}
      </div>
    );
}