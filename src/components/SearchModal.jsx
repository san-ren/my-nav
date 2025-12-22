import React, { useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import { Search, X, Command, CornerDownLeft } from 'lucide-react';

// 动态获取 nav 文件夹下的所有页面数据
const navFiles = import.meta.glob('../data/nav/*.json', { eager: true });
const navResources = Object.values(navFiles);

export default function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // --- 核心修复：适配 Groups 结构的扁平化逻辑 ---
  const allLinks = navResources.flatMap(section =>
    // 1. 遍历 Groups (如果页面没有 groups，就给个空数组防崩)
    (section.groups || []).flatMap(group => 
      // 2. 遍历 Categories
      (group.categories || []).flatMap(cat => {
        // 3. 如果有 tabs 结构
        if (cat.tabs) {
          return cat.tabs.flatMap(tab => 
            (tab.list || []).map(item => ({
              ...item,
              category: cat.name,
              tabName: tab.tabName,
              sectionName: section.name
            }))
          );
        }
        // 4. 如果是普通 list 结构
        return (cat.list || []).map(item => ({
          ...item,
          category: cat.name,
          sectionName: section.name
        }));
      })
    )
  );

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
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isOpen]);

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
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-slate-900/60 backdrop-blur-sm">
          <div 
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center px-4 py-4 border-b border-slate-100 dark:border-slate-800">
              <Search className="text-slate-400 mr-3" size={20} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="输入关键字搜索..."
                className="flex-1 bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
              />
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2" ref={listRef}>
              {results.length > 0 ? (
                <div className="space-y-1">
                  {results.map((result, index) => (
                    <a
                      key={index}
                      href={result.item.url}
                      target="_blank"
                      className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                        selectedIndex === index ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-bold text-sm truncate">{result.item.name}</span>
                        <div className="flex items-center gap-2 text-[11px] opacity-70">
                          <span>{result.item.sectionName}</span>
                          <span>/</span>
                          <span>{result.item.category}</span>
                          {result.item.tabName && (
                            <><span>/</span><span>{result.item.tabName}</span></>
                          )}
                        </div>
                      </div>
                      <CornerDownLeft size={14} className="opacity-40" />
                    </a>
                  ))}
                </div>
              ) : query ? (
                <div className="py-12 text-center text-slate-400">无相关结果</div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-sm">输入名称或描述开始搜索</div>
              )}
            </div>
          </div>
          <div className="fixed inset-0 -z-10" onClick={() => setIsOpen(false)} />
        </div>
      )}
    </>
  );
}