import React, { useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
// 注意：这里引入的是 navResources，因为我们改用了多页面结构
import { navResources } from '../data/nav.json';
import { Search, X, Command, CornerDownLeft } from 'lucide-react';

export default function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0); // 增加键盘上下选择功能
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // 核心逻辑：数据扁平化
  // 将 "页面 -> 分类 -> 链接" 三层结构拍扁成一层，方便 Fuse 搜索
  const allLinks = navResources.flatMap(section => 
    section.categories.flatMap(cat => 
      cat.list.map(item => ({
        ...item,
        category: cat.name,       // 保留分类名 (如: 前端框架)
        sectionName: section.name // 保留页面名 (如: 开发专区)
      }))
    )
  );

  // 配置模糊搜索
  const fuse = new Fuse(allLinks, {
    keys: ['name', 'desc', 'url', 'category', 'sectionName'], // 增加搜索权重
    threshold: 0.3, // 0.0 精确匹配，1.0 任意匹配，0.3 比较自然
    includeMatches: true,
  });

  // 快捷键监听
  useEffect(() => {
    const handleKeydown = (e) => {
      // 打开搜索: Cmd+K 或 Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      // 关闭搜索: Escape
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
      
      // 只有在打开状态下才监听上下键
      if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1 < results.length ? prev + 1 : prev));
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 >= 0 ? prev - 1 : 0));
        }
        if (e.key === 'Enter' && results.length > 0) {
          window.open(results[selectedIndex].url, '_blank');
        }
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isOpen, results, selectedIndex]);

  // 打开时自动聚焦，并重置选中项
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSelectedIndex(0);
    }
    // 搜索逻辑
    if (query) {
      const searchRes = fuse.search(query).map(r => r.item);
      setResults(searchRes);
      setSelectedIndex(0); // 搜索变动时重置选中第一项
    } else {
      setResults([]);
    }
  }, [isOpen, query]);

  // 1. 未打开状态下的触发按钮
  if (!isOpen) return (
    <button 
      onClick={() => setIsOpen(true)} 
      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
    >
      <Search size={14} />
      <span className="hidden sm:inline">搜索</span>
      <div className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-mono bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-gray-400">
        <Command size={10} />
        <span>K</span>
      </div>
    </button>
  );

  // 2. 打开状态下的模态框
  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" 
      onClick={() => setIsOpen(false)}
    >
      <div 
        className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden ring-1 ring-gray-900/5 dark:ring-white/10 flex flex-col max-h-[70vh]" 
        onClick={e => e.stopPropagation()}
      >
        {/* 顶部输入框 */}
        <div className="flex items-center border-b border-gray-100 dark:border-gray-800 p-4">
          <Search className="text-blue-500 mr-3" size={20} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent outline-none text-lg text-gray-800 dark:text-gray-100 placeholder-gray-400"
            placeholder="搜索网站、开发工具或设计资源..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button 
            onClick={() => setIsOpen(false)} 
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="text-gray-400" size={20} />
          </button>
        </div>

        {/* 结果列表 */}
        <div className="overflow-y-auto p-2" ref={listRef}>
          {results.length === 0 && query ? (
            <div className="py-12 text-center text-gray-500">
              <p>未找到 "{query}" 相关结果</p>
            </div>
          ) : (
            <div className="space-y-1">
              {(query ? results : allLinks.slice(0, 5)).map((item, idx) => (
                <a 
                  key={idx} 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`flex items-center p-3 rounded-lg group transition-colors cursor-pointer ${
                    idx === selectedIndex 
                      ? 'bg-blue-50 dark:bg-blue-900/20' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  {/* 图标/Favicon (可选，这里用简单的圆圈代替，或者你可以复用 SiteCard 的 Logo 逻辑) */}
                  <div className={`mr-4 flex h-8 w-8 items-center justify-center rounded-full border ${
                     idx === selectedIndex ? 'border-blue-200 bg-white dark:border-blue-800 dark:bg-gray-800' : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                  }`}>
                     <img 
                        src={`https://www.google.com/s2/favicons?domain=${new URL(item.url).hostname}&sz=32`} 
                        className="w-4 h-4" 
                        loading="lazy"
                        onError={(e) => e.target.style.display='none'}
                     />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className={`font-medium truncate ${
                        idx === selectedIndex ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {item.name}
                      </h4>
                      {/* 显示所属板块和分类 */}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">
                        {item.sectionName} · {item.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {item.desc || item.url}
                    </p>
                  </div>

                  {/* 选中时的回车提示 */}
                  {idx === selectedIndex && (
                    <CornerDownLeft className="text-gray-400 ml-3" size={16} />
                  )}
                </a>
              ))}
            </div>
          )}
          
          {/* 底部提示 */}
          {!query && (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-gray-400">
                支持拼音、中文、英文搜索 <br/>
                按 <kbd className="font-sans bg-gray-100 dark:bg-gray-800 px-1 rounded">↑</kbd> <kbd className="font-sans bg-gray-100 dark:bg-gray-800 px-1 rounded">↓</kbd> 切换，<kbd className="font-sans bg-gray-100 dark:bg-gray-800 px-1 rounded">Enter</kbd> 访问
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}