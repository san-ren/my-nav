/**
 * 结果统计条（小圆点 + 文案 + 数量）
 * LinkChecker / GithubChecker 原先各自内联一份，结构完全相同，仅数据不同。
 */
import React from 'react';

export interface StatItem {
  /** 圆点颜色 */
  color: string;
  /** 展示文案 */
  label: string;
  /** 数量 */
  value: number;
}

export function StatsBar({ items }: { items: StatItem[] }) {
  return (
    <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: item.color }} />
          <span style={{ fontSize: '14px', color: '#334155' }}>
            {item.label}: {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
