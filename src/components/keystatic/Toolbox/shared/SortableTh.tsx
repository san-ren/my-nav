/**
 * 可排序表头（含排序图标与 hover 反馈）
 * 两个 Checker 的表格里每个可排序列都重复了这一段 JSX 与 hover 处理。
 */
import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { TABLE } from '../toolbox-shared';

export interface SortableThProps<F extends string> {
  label: string;
  field: F;
  /** 当前排序字段（null 表示未排序） */
  sortField: F | null;
  sortDirection: 'asc' | 'desc';
  onSort: (field: F) => void;
  style?: React.CSSProperties;
}

export function SortableTh<F extends string>({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
  style,
}: SortableThProps<F>) {
  const icon = (() => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} style={{ color: '#94a3b8', marginLeft: '4px' }} />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp size={14} style={{ color: '#2563eb', marginLeft: '4px' }} />;
    }
    return <ArrowDown size={14} style={{ color: '#2563eb', marginLeft: '4px' }} />;
  })();

  return (
    <th
      style={{ ...TABLE.thSortable, ...style }}
      onClick={() => onSort(field)}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
      onMouseLeave={(e) => (e.currentTarget.style.background = '#f8fafc')}
    >
      <span style={{ display: 'flex', alignItems: 'center' }}>
        {label}
        {icon}
      </span>
    </th>
  );
}
