/**
 * 结果筛选下拉（portal-popup 气泡 + 多选）
 *
 * 两个 Checker 原先各自内联了「按钮 + 气泡 + 每项一个 label/checkbox」，
 * 连外部点击关闭的 effect 都各写一遍，此处统一。
 */
import React, { useEffect, useRef, useState } from 'react';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { BUTTON } from '../toolbox-shared';

export interface FilterOption {
  value: string;
  label: string;
  count: number;
  color: string;
}

interface FilterDropdownProps {
  options: FilterOption[];
  /** 当前已选中的 value 列表 */
  selected: readonly string[];
  onChange: (next: string[]) => void;
  /** 按钮文案前缀，默认「筛选」 */
  label?: string;
}

export function FilterDropdown({ options, selected, onChange, label = '筛选' }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleValue = (value: string, checked: boolean) => {
    onChange(checked ? [...selected, value] : selected.filter((v) => v !== value));
  };

  return (
    <div style={{ position: 'relative' }} ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          ...BUTTON.secondary,
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
        }}
      >
        <Filter size={16} style={{ color: '#64748b' }} />
        <span>
          {label} ({selected.length})
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      <div
        className={`portal-popup ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
        style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '12px',
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
          padding: '8px',
          zIndex: 50,
          minWidth: '200px',
          visibility: open ? 'visible' : 'hidden',
          transformOrigin: 'top right',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        {options.map((opt) => (
          <label
            key={opt.value}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 8px',
              cursor: 'pointer',
              borderRadius: '4px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={(e) => toggleValue(opt.value, e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: opt.color }} />
            <span style={{ fontSize: '13px', color: '#334155', flex: 1 }}>{opt.label}</span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{opt.count}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
