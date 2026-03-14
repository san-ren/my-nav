import React from 'react';
import { makePage } from '@keystatic/astro/ui';
import config from '../../keystatic.config';

export default function KeystaticAdmin() {
  // 使用 useMemo 记忆化页面组件，确保在组件渲染周期内生成，解决 React 19 Context 注入问题
  const KeystaticPage = React.useMemo(() => makePage(config), []);

  React.useEffect(() => {
    // 恢复重定向前的 URL
    const savedPath = sessionStorage.getItem('keystatic_spa_path');
    if (savedPath) {
      sessionStorage.removeItem('keystatic_spa_path');
      window.history.replaceState(null, '', savedPath);
    }
  }, []);

  React.useEffect(() => {
    const handleDeleteClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const button = target.closest('button');
      if (!button) return;

      const rawLabel = button.getAttribute('aria-label') || button.getAttribute('title') || button.textContent || '';
      const label = rawLabel.toLowerCase();
      // 更加精准的匹配逻辑：必须是按钮或者具有按钮角色的元素，且包含删除字样
      const isDelete = (label === 'delete' || label === 'remove' || label === '删除') || 
                       (label.includes('delete') && button.classList.contains('IconButton')) ||
                       (button.querySelector('svg[aria-label*="Delete"]') !== null);
                       
      if (!isDelete) return;

      const confirmed = window.confirm('确认删除？此操作不可撤销。');
      if (!confirmed) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('click', handleDeleteClick, true);
    return () => document.removeEventListener('click', handleDeleteClick, true);
  }, []);

  return <KeystaticPage />;
}
