import React, { useEffect, useState } from 'react';
import { Share2 } from 'lucide-react';

export default function GlobalShareButton() {
    // 这个组件在 Astro 编译时可能会面临 Island 孤立问题
    // 为了更稳妥地触发全局事件，我们直接把代码行内化写在下方

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        if (!window.__PAGE_SHARE_TREE__) return;
        window.dispatchEvent(
          new CustomEvent('open-share-modal', {
            detail: {
              tree: window.__PAGE_SHARE_TREE__,
              title: window.__PAGE_SHARE_TITLE__ || '资源推荐',
              activeId: window.__ACTIVE_SHARE_ID__ || null
            }
          })
        );
      }}
      className="p-2 text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 bg-white/50 dark:bg-gray-800/50 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-lg shadow-sm border border-gray-200/50 dark:border-gray-700/50 shrink-0 transition-all duration-200"
      title="分享页面资源"
    >
      <Share2 size={20} />
    </button>
  );
}
