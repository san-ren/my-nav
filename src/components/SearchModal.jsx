import React, { useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import { Search, X, Command, ExternalLink } from 'lucide-react';

// 动态获取 nav-groups 文件夹下的所有分组数据
const navFiles = import.meta.glob('../content/nav-groups/*.json', { eager: true });
// 处理可能的 default 导出
const navResources = Object.values(navFiles).map((file) => file.default || file);

export default function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // --- 修复：适配 nav-groups 数据结构的扁平化逻辑 ---
  // nav-groups 目录下每个 JSON 文件就是一个 group
  const allLinks = navResources.flatMap(group => {
    const groupName = group.name || '未命名分组';
    const pageName = group.pageName || 'home';
    const links = [];
    
    // 1. 处理分组直属资源
    if (group.resources && group.resources.length > 0) {
      group.resources.forEach((item, idx) => {
        if (item.name && item.url) {
          links.push({
            ...item,
            sectionName: groupName,
            pageName: pageName,
            category: '',
            tabName: '',
            resourceId: `top-${groupName}-${idx}`
          });
        }
      });
    }
    
    // 2. 处理分类下的资源
    if (group.categories && group.categories.length > 0) {
      group.categories.forEach((cat, catIdx) => {
        const catName = cat.name || '';
        
        // 2.1 处理分类直属资源
        if (cat.resources && cat.resources.length > 0) {
          cat.resources.forEach((item, idx) => {
            if (item.name && item.url) {
              links.push({
                ...item,
                sectionName: groupName,
                pageName: pageName,
                category: catName,
                tabName: '',
                resourceId: `cat-${catIdx}-${idx}`,
                categoryIndex: catIdx
              });
            }
          });
        }
        
        // 2.2 处理 tabs 结构
        if (cat.tabs && cat.tabs.length > 0) {
          cat.tabs.forEach((tab, tabIdx) => {
            const tabName = tab.tabName || '';
            if (tab.list && tab.list.length > 0) {
              tab.list.forEach((item, idx) => {
                if (item.name && item.url) {
                  links.push({
                    ...item,
                    sectionName: groupName,
                    pageName: pageName,
                    category: catName,
                    tabName: tabName,
                    resourceId: `tab-${catIdx}-${tabIdx}-${idx}`,
                    categoryIndex: catIdx,
                    tabIndex: tabIdx
                  });
                }
              });
            }
          });
        }
      });
    }
    
    return links;
  });

  // 配置模糊搜索
  const fuse = new Fuse(allLinks, {
    keys: ['name', 'desc', 'category', 'tabName'],
    threshold: 0.4,
  });

  useEffect(() => {
    if (query.length > 0) {
      const res = fuse.search(query);
      setResults(res.slice(0, 8));
      setSelectedIndex(0);
    } else {
      setResults([]);
    }
  }, [query]);

  // 快捷键监听
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') setIsOpen(false);
      
      // 键盘导航
      if (isOpen && results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && results[selectedIndex]) {
          e.preventDefault();
          handleNavigate(results[selectedIndex].item);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isOpen]);

  // 获取当前页面ID
  const getCurrentPageId = () => {
    const path = window.location.pathname;
    // 匹配 /home, /sub1, /sub2 等
    const match = path.match(/\/([^/]+)/);
    return match ? match[1] : 'home';
  };

  // 导航到资源位置
  const handleNavigate = (item) => {
    const currentPageId = getCurrentPageId();
    const targetPageId = item.pageName;
    
    // 保存搜索状态到 sessionStorage
    sessionStorage.setItem('searchQuery', query);
    sessionStorage.setItem('searchResults', JSON.stringify(results.map(r => r.item)));
    sessionStorage.setItem('scrollToResource', JSON.stringify(item));
    
    if (currentPageId === targetPageId) {
      // 同一页面，直接滚动
      setIsOpen(false);
      setTimeout(() => {
        scrollToResource(item);
      }, 100);
    } else {
      // 不同页面，跳转并保留状态
      setIsOpen(false);
      window.location.href = `/${targetPageId}`;
    }
  };

  // 滚动到资源位置
  const scrollToResource = (item) => {
    // 方法1: 通过 site-card-wrapper 类名查找
    const cards = document.querySelectorAll('.site-card-wrapper');
    
    for (const card of cards) {
      const nameEl = card.querySelector('h3');
      const cardName = nameEl ? nameEl.textContent.trim() : '';
      
      if (cardName === item.name) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // 高亮效果
        card.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
        setTimeout(() => {
          card.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
        }, 2000);
        return;
      }
    }
    
    // 方法2: 如果方法1失败，尝试通过链接查找
    const links = document.querySelectorAll('a[href*="' + item.url + '"]');
    if (links.length > 0) {
      const card = links[0].closest('.site-card-wrapper');
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
        setTimeout(() => {
          card.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
        }, 2000);
      }
    }
  };

  // 恢复搜索状态
  useEffect(() => {
    const savedQuery = sessionStorage.getItem('searchQuery');
    const scrollToItem = sessionStorage.getItem('scrollToResource');
    
    // 如果有保存的搜索状态，恢复搜索框
    if (savedQuery) {
      setQuery(savedQuery);
      sessionStorage.removeItem('searchQuery');
    }
    
    if (scrollToItem) {
      const item = JSON.parse(scrollToItem);
      // 等待页面加载完成后滚动
      setTimeout(() => {
        scrollToResource(item);
      }, 800);
      sessionStorage.removeItem('scrollToResource');
    }
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl hover:ring-2 hover:ring-blue-500/20 transition-all border border-slate-200 dark:border-slate-700"
      >
        <Search size={16} />
        <span className="hidden sm:inline">搜索...</span>
        <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-sans font-medium text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md">
          <Command size={10} />K
        </kbd>
      </button>

      {isOpen && (
        <>
          {/* 背景遮罩 - 只覆盖内容区域，不覆盖顶栏 */}
          <div 
            className="fixed inset-0 z-[25] bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            style={{ top: '72px' }} // 顶栏高度约 72px
          />
          
          {/* 弹窗容器 */}
          <div 
            className="fixed inset-0 z-[50] flex items-start justify-center pt-[120px] px-4 pointer-events-none"
            onClick={() => setIsOpen(false)}
          >
            <div 
              className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[70vh] flex flex-col pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 搜索输入区 */}
              <div className="flex items-center px-4 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <Search className="text-slate-400 mr-3" size={20} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="输入关键字搜索..."
                  className="flex-1 bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
                />
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              {/* 搜索结果区 */}
              <div className="overflow-y-auto p-2 flex-1" ref={listRef}>
                {results.length > 0 ? (
                  <div className="space-y-1">
                    {results.map((result, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2 p-3 rounded-xl transition-all cursor-pointer group ${
                          selectedIndex === index ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigate(result.item);
                        }}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                          <span className="font-bold text-sm truncate">{result.item.name}</span>
                          <div className="flex items-center gap-2 text-[11px] opacity-70">
                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-slate-200/50 dark:bg-slate-700/50 text-[10px]">
                              {result.item.pageName}
                            </span>
                            <span className="truncate">{result.item.sectionName}</span>
                            {result.item.category && (
                              <>
                                <span className="shrink-0">/</span>
                                <span className="truncate">{result.item.category}</span>
                              </>
                            )}
                            {result.item.tabName && (
                              <>
                                <span className="shrink-0">/</span>
                                <span className="truncate">{result.item.tabName}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(result.item.url, '_blank');
                          }}
                          className={`shrink-0 p-2 rounded-lg transition-all ${
                            selectedIndex === index 
                              ? 'hover:bg-white/20 text-white' 
                              : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                          }`}
                          title="直接打开链接"
                        >
                          <ExternalLink size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : query ? (
                  <div className="py-12 text-center text-slate-400">无相关结果</div>
                ) : (
                  <div className="py-12 text-center text-slate-400 text-sm">
                    <div className="mb-2">输入名称或描述开始搜索</div>
                    <div className="text-xs opacity-70">点击结果跳转到对应位置，点击右侧图标直接打开链接</div>
                  </div>
                )}
              </div>
              
              {/* 底部提示 */}
              {results.length > 0 && (
                <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 flex items-center justify-between shrink-0">
                  <span>↑↓ 选择 · Enter 跳转</span>
                  <span>点击 <ExternalLink size={10} className="inline" /> 直接打开</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
