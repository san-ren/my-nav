/**
 * 字体设置区块：本地字体列表 / 字体云拉取 / 搜索过滤 / 字号字重
 *
 * 由 theme-logic.js 的「I. 本地字体加载逻辑」整段抽出；
 * 该段只依赖 DOM 与 localStorage，自成闭环，所以原样搬移即可。
 */
export function setupFontSection() {
  // --- I. 本地字体加载逻辑 ---
  const fontDropdownContainer = document.getElementById('font-dropdown-container');
  const fontBtn = document.getElementById('custom-font-btn');
  const fontSelectedText = document.getElementById('custom-font-selected-text');
  const fontMenu = document.getElementById('custom-font-menu');
  const localFontsList = document.getElementById('local-fonts-list');
  const fontFetchTrigger = document.getElementById('font-fetch-trigger');
  const fontStatus = document.getElementById('font-loading-status');
  const fontSearchInput = document.getElementById('font-search-input');
  
  const font2DropdownContainer = document.getElementById('font2-dropdown-container');
  const font2Btn = document.getElementById('custom-font2-btn');
  const font2SelectedText = document.getElementById('custom-font2-selected-text');
  const font2Menu = document.getElementById('custom-font2-menu');
  const localFonts2List = document.getElementById('local-fonts2-list');
  const font2FetchTrigger = document.getElementById('font2-fetch-trigger');
  const font2SearchInput = document.getElementById('font2-search-input');
  
  const fontSizeRange = document.getElementById('font-size-range');
  const fontSizeVal = document.getElementById('font-size-val');
  
  const fontWeightRange = document.getElementById('font-weight-range');
  const fontWeightVal = document.getElementById('font-weight-val');

  // 初始化加载已保存的数据
  const savedFontFamily = localStorage.getItem('site-font-family') || 'default';
  const savedFont2Family = localStorage.getItem('site-font2-family') || 'none';
  const savedFontSize = localStorage.getItem('site-font-size') || '1.0';
  const savedFontWeight = localStorage.getItem('site-font-weight') || '700';
  
  // 自定义下拉面板的 UI 更新辅助函数
  function updateSelectedFontUI() {
    const val1 = localStorage.getItem('site-font-family') || 'default';
    const name1 = localStorage.getItem('site-font-name') || '默认系统字体 (Default)';
    const val2 = localStorage.getItem('site-font2-family') || 'none';
    const name2 = localStorage.getItem('site-font2-name') || '无 (完全使用上述主字体)';
    
    // 更新主字体 UI
    if (fontSelectedText) {
      fontSelectedText.textContent = name1;
      fontSelectedText.style.fontFamily = val1 !== 'default' ? `"${val1}"` : '';
    }
    if (localFontsList) {
      localFontsList.querySelectorAll('.font-option').forEach(opt => {
         const icon = opt.querySelector('.check-icon');
         if (icon) {
            if (opt.dataset.value === val1) {
               icon.classList.remove('hidden');
               opt.classList.add('bg-slate-50', 'dark:bg-gray-700', 'text-brand-600');
               opt.classList.remove('text-slate-700', 'dark:text-slate-300');
            } else {
               icon.classList.add('hidden');
               opt.classList.remove('bg-slate-50', 'dark:bg-gray-700', 'text-brand-600');
               opt.classList.add('text-slate-700', 'dark:text-slate-300');
            }
         }
      });
    }

    // 更新副字体 UI
    if (font2SelectedText) {
      font2SelectedText.textContent = name2;
      font2SelectedText.style.fontFamily = val2 !== 'none' ? `"${val2}"` : '';
    }
    if (localFonts2List) {
      localFonts2List.querySelectorAll('.font2-option').forEach(opt => {
         const icon = opt.querySelector('.check-icon2');
         if (icon) {
            if (opt.dataset.value === val2) {
               icon.classList.remove('hidden');
               opt.classList.add('bg-slate-50', 'dark:bg-gray-700', 'text-brand-600');
               opt.classList.remove('text-slate-700', 'dark:text-slate-300');
            } else {
               icon.classList.add('hidden');
               opt.classList.remove('bg-slate-50', 'dark:bg-gray-700', 'text-brand-600');
               opt.classList.add('text-slate-700', 'dark:text-slate-300');
            }
         }
      });
    }
  }

  function toggleMenu(menuToToggle, forceClose = false) {
    if (!menuToToggle) return;
    const isExpanded = menuToToggle.classList.contains('opacity-100');
    if (isExpanded || forceClose) {
      menuToToggle.classList.remove('opacity-100', 'visible', 'scale-100');
      menuToToggle.classList.add('opacity-0', 'invisible', 'scale-95');
    } else {
      // 打开此菜单前，关闭另一个
      if (menuToToggle === fontMenu) toggleMenu(font2Menu, true);
      if (menuToToggle === font2Menu) toggleMenu(fontMenu, true);
      
      menuToToggle.classList.remove('opacity-0', 'invisible', 'scale-95');
      menuToToggle.classList.add('opacity-100', 'visible', 'scale-100');
      
      // Focus 相应的搜索框
      setTimeout(() => {
        if (menuToToggle === fontMenu && fontSearchInput) fontSearchInput.focus();
        if (menuToToggle === font2Menu && font2SearchInput) font2SearchInput.focus();
      }, 50);
    }
  }

  function bindFontOptionEvents() {
    // 绑定主字体选项事件
    if (localFontsList) {
      localFontsList.querySelectorAll('.font-option').forEach(opt => {
        opt.onclick = (e) => {
          e.stopPropagation();
          localStorage.setItem('site-font-family', opt.dataset.value);
          localStorage.setItem('site-font-name', opt.dataset.name);
          updateSelectedFontUI();
          applyFontSettings();
          toggleMenu(fontMenu, true);
        };
      });
    }
    
    // 绑定副(英数)字体选项事件
    if (localFonts2List) {
      localFonts2List.querySelectorAll('.font2-option').forEach(opt => {
        opt.onclick = (e) => {
          e.stopPropagation();
          localStorage.setItem('site-font2-family', opt.dataset.value);
          localStorage.setItem('site-font2-name', opt.dataset.name);
          updateSelectedFontUI();
          applyFontSettings();
          toggleMenu(font2Menu, true);
        };
      });
    }
  }

  // --- 搜索过滤功能 ---
  function implementSearchFilter(inputEl, listContainerSelector, optionSelector) {
    if (!inputEl) return;
    inputEl.oninput = (e) => {
      const kw = e.target.value.toLowerCase().trim();
      const listContainer = document.getElementById(listContainerSelector);
      if (!listContainer) return;
      const options = listContainer.querySelectorAll(optionSelector);
      
      options.forEach(opt => {
         // 不允许过滤掉顶部的固定的默认项 fallback
         if (opt.dataset.value === 'default' || opt.dataset.value === 'none') return;
         const name = opt.dataset.name ? opt.dataset.name.toLowerCase() : '';
         const rawFamily = opt.dataset.value ? opt.dataset.value.toLowerCase() : '';
         if (!kw || name.includes(kw) || rawFamily.includes(kw)) {
             opt.classList.remove('hidden');
         } else {
             opt.classList.add('hidden');
         }
      });
    };
  }

  // 1. 初始化绑定
  setTimeout(() => {
    updateSelectedFontUI();
    bindFontOptionEvents();
    implementSearchFilter(fontSearchInput, 'local-fonts-list', '.font-option');
    implementSearchFilter(font2SearchInput, 'local-fonts2-list', '.font2-option');
  }, 0);

  // 2. 交互绑定
  if (fontBtn) fontBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); toggleMenu(fontMenu); };
  if (font2Btn) font2Btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); toggleMenu(font2Menu); };

  // 停止搜索框阻止冒泡
  if (fontSearchInput) fontSearchInput.onclick = e => e.stopPropagation();
  if (font2SearchInput) font2SearchInput.onclick = e => e.stopPropagation();

  // 点击外部收起
  document.addEventListener('click', (e) => {
    if (fontMenu && fontMenu.classList.contains('visible') && fontDropdownContainer && !fontDropdownContainer.contains(e.target)) {
      toggleMenu(fontMenu, true);
    }
    if (font2Menu && font2Menu.classList.contains('visible') && font2DropdownContainer && !font2DropdownContainer.contains(e.target)) {
      toggleMenu(font2Menu, true);
    }
  });


  // 3. 点击加载本地字体及其汉化聚合逻辑
  let fontsLoaded = false;
  
  async function fetchAndRenderFonts() {
      if (fontsLoaded || !('queryLocalFonts' in window)) return;
      try {
        if (fontStatus) {
          fontStatus.classList.remove('hidden');
          fontStatus.textContent = '请求中...';
        }
        if (fontFetchTrigger) fontFetchTrigger.textContent = '读取中...';
        if (font2FetchTrigger) font2FetchTrigger.textContent = '读取中...';

        const fonts = await window.queryLocalFonts();
        fontsLoaded = true;

        const familyMap = new Map();
        fonts.forEach(f => {
           if (!familyMap.has(f.family)) {
               let disp = f.fullName || f.family;
               const famLower = f.family.toLowerCase();
               if (famLower.includes('microsoft yahei')) disp = '微软雅黑';
               if (famLower === 'simsun' || famLower === 'nsimsun') disp = '宋体';
               if (famLower === 'simhei') disp = '黑体';
               if (famLower === 'kaiti') disp = '楷体';
               if (famLower === 'fangsong') disp = '仿宋';
               if (famLower === 'dengxian') disp = '等线';
               if (famLower === 'malgun gothic') disp = 'Malgun Gothic';
               familyMap.set(f.family, disp);
           } else {
               const existingDisp = familyMap.get(f.family);
               if (f.fullName && f.fullName.length < existingDisp.length && !f.fullName.toLowerCase().includes('light') && !f.fullName.toLowerCase().includes('bold')) {
                   familyMap.set(f.family, f.fullName);
               }
           }
        });
        
        const sortedFamilies = Array.from(familyMap.entries()).sort((a,b) => a[1].localeCompare(b[1], 'zh-CN'));

        // 渲染主字体列表
        if (localFontsList) {
          // 清除原有子集中由用户点击触发的所有列表元素，保留最顶部的 default 选项和 title，重新填充
          const defaultEls = Array.from(localFontsList.children).slice(0, 2); 
          localFontsList.innerHTML = '';
          defaultEls.forEach(el => localFontsList.appendChild(el));

          sortedFamilies.forEach(([family, dispName]) => {
            const li = document.createElement('li');
            li.className = 'font-option px-3 py-2 hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer text-slate-700 dark:text-slate-300 flex items-center justify-between border-b border-gray-50 dark:border-gray-800/50 last:border-0';
            li.dataset.value = family;
            li.dataset.name = dispName;
            li.style.fontFamily = `"${family}"`; 
            li.innerHTML = `
              <span class="truncate pr-2">${dispName} <span class="text-[10px] text-slate-400 font-sans ml-1 opacity-60">(${family})</span></span>
              <span class="check-icon hidden text-brand-500 font-bold shrink-0">✔</span>
            `;
            localFontsList.appendChild(li);
          });
        }
        
        // 同步渲染副字体列表
        if (localFonts2List) {
          const defaultEls2 = Array.from(localFonts2List.children).slice(0, 2); 
          localFonts2List.innerHTML = '';
          defaultEls2.forEach(el => localFonts2List.appendChild(el));

          sortedFamilies.forEach(([family, dispName]) => {
            const li = document.createElement('li');
            li.className = 'font2-option px-3 py-2 hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer text-slate-700 dark:text-slate-300 flex items-center justify-between border-b border-gray-50 dark:border-gray-800/50 last:border-0';
            li.dataset.value = family;
            li.dataset.name = dispName;
            li.style.fontFamily = `"${family}"`; 
            li.innerHTML = `
              <span class="truncate pr-2">${dispName} <span class="text-[10px] text-slate-400 font-sans ml-1 opacity-60">(${family})</span></span>
              <span class="check-icon2 hidden text-brand-500 font-bold shrink-0">✔</span>
            `;
            localFonts2List.appendChild(li);
          });
        }
        
        // 重新绑定下拉框选项的所有事件与搜索重置
        bindFontOptionEvents();
        updateSelectedFontUI();
        
        if (fontStatus) fontStatus.classList.add('hidden');
        if (fontFetchTrigger) fontFetchTrigger.classList.add('hidden');
        if (font2FetchTrigger) font2FetchTrigger.classList.add('hidden');

      } catch (err) {
        console.warn('读取本地字体被拒或失败:', err);
        if (fontStatus) fontStatus.textContent = '获取失败或被拒';
        if (fontFetchTrigger) fontFetchTrigger.textContent = '获取系统文字失败..';
        if (font2FetchTrigger) font2FetchTrigger.textContent = '获取系统文字失败..';
        fontsLoaded = true; 
      }
  }

  // 将主副拉取按钮映射到核心共享函数
  if (fontFetchTrigger) fontFetchTrigger.onclick = (e) => { e.stopPropagation(); fetchAndRenderFonts(); };
  if (font2FetchTrigger) font2FetchTrigger.onclick = (e) => { e.stopPropagation(); fetchAndRenderFonts(); };


  if (fontSizeRange) {
    fontSizeRange.oninput = (e) => {
      const val = parseFloat(e.target.value).toFixed(2);
      if (fontSizeVal) fontSizeVal.textContent = `${val}x`;
      localStorage.setItem('site-font-size', val);
      applyFontSettings();
    };
  }

  if (fontWeightRange) {
    fontWeightRange.oninput = (e) => {
      const val = e.target.value;
      if (fontWeightVal) fontWeightVal.textContent = val;
      localStorage.setItem('site-font-weight', val);
      applyFontSettings();
    };
  }

  // 执行最终样式覆写
  function applyFontSettings() {
    const root = document.documentElement;
    const ff1 = localStorage.getItem('site-font-family') || 'default';
    const ff2 = localStorage.getItem('site-font2-family') || 'none';
    const fs = localStorage.getItem('site-font-size') || '1.0';
    const fw = localStorage.getItem('site-font-weight') || '700';

    if (ff1 !== 'default' && ff1 !== '') {
      root.style.setProperty('--custom-font-family', `"${ff1}", system-ui, sans-serif`);
    } else {
      root.style.removeProperty('--custom-font-family');
    }

    if (ff2 !== 'none' && ff2 !== '') {
      root.style.setProperty('--custom-font2-family', `"${ff2}"`);
    } else {
      root.style.removeProperty('--custom-font2-family');
    }

    root.style.setProperty('--custom-font-size-ratio', fs);
    root.style.setProperty('--custom-font-title-weight', fw);
  }

  // 默认应用一次
  applyFontSettings();
}
