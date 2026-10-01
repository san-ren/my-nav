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
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-700/60 hover:text-brand-600 dark:hover:text-brand-400 transition-colors text-left"
      title="分享页面资源"
    >
      <Share2 size={18} className="shrink-0" />
      <span>分享页面</span>
    </button>
  );
}
