/**
 * theme-logic.js
 * 负责 ThemePicker 的所有交互逻辑、IndexedDB 存取和状态同步
 */

// === 1. IndexedDB 工具函数 (保持原逻辑) ===
const DB_NAME = 'MyNavDB';
const STORE_NAME = 'settings';
let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

async function saveImage(blob) {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, 'bg-image');
  } catch (e) { console.error('Save image failed', e); }
}

async function getImage() {
  try {
    const db = await getDB();
    return new Promise(resolve => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get('bg-image');
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = () => resolve(null);
    });
  } catch (e) { return null; }
}

async function removeImage() {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete('bg-image');
  } catch (e) { console.error('Remove image failed', e); }
}

// === 2. 辅助工具函数 ===
const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
};

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

const base64ToBlob = async (base64) => (await fetch(base64)).blob();


// === 3. 核心初始化函数 ===
export async function initThemePicker() {
  const container = document.getElementById('theme-picker-container');
  const btn = document.getElementById('theme-btn');
  const panel = document.getElementById('theme-panel');

  // 如果找不到核心元素，直接退出（可能是组件未渲染）
  if (!btn || !panel) return;

  // --- A. 异步加载背景图 (原文件中的独立 IIFE) ---
  // 这部分逻辑从原文件 lines 21-22 提取
  (async function loadBg() {
    try {
      const blob = await getImage();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const current = document.documentElement.style.getPropertyValue('--bg-image');
        // 只有当前 CSS 变量为空或 none 时才覆盖，避免闪烁
        if (!current || current === 'none' || current === '') {
          document.documentElement.style.setProperty('--bg-image', `url(${url})`);
        }
        
        // 更新预览区域
        const area = document.getElementById('bg-preview-area');
        const img = document.getElementById('bg-preview-img');
        if (area && img) {
          area.classList.remove('hidden');
          img.src = url;
        }
      }
    } catch (e) { console.error('Load BG failed', e); }
  })();

  // --- B. 面板开关逻辑 ---
  let isPanelOpen = false;
  function togglePanel(forceState) {
    isPanelOpen = forceState !== undefined ? forceState : !isPanelOpen;
    // 切换 CSS class 实现动画显隐
    panel.classList.toggle('invisible', !isPanelOpen);
    panel.classList.toggle('opacity-0', !isPanelOpen);
    panel.classList.toggle('scale-95', !isPanelOpen);
    panel.classList.toggle('visible', isPanelOpen);
    panel.classList.toggle('opacity-100', isPanelOpen);
    panel.classList.toggle('scale-100', isPanelOpen);

    // [互斥逻辑] 打开自身时，强制关闭另一个下拉框 (ResourceFilter)
    if (isPanelOpen) {
      const filterToggle = document.getElementById('resource-filter-toggle');
      if (filterToggle && filterToggle.checked) {
        // 利用 click() 触发其自身的关闭事件逻辑，保持完整生命周期
        filterToggle.click();
      }
    }
  }

  // 绑定点击事件
  // 先移除旧的监听器防止重复绑定 (如果 init 被多次调用)
  btn.onclick = (e) => {
    e.stopPropagation();
    togglePanel();
  };

  const closeHandler = (e) => {
    if (isPanelOpen && container && !container.contains(e.target)) {
      togglePanel(false);
    }
  };
  document.removeEventListener('click', closeHandler);
  document.addEventListener('click', closeHandler);


  // --- C. 颜色设置逻辑 ---
  const colorPicker = document.getElementById('custom-color-picker');
  const hexInput = document.getElementById('hex-input');
  const savedColor = localStorage.getItem('brand-color') || '#4F46E5';
  
  // 初始化输入框值
  if (colorPicker) colorPicker.value = savedColor;
  if (hexInput) hexInput.value = savedColor;

  function setBrandColor(hex) {
    if (!/^#[0-9A-F]{6}$/i.test(hex)) return;
    const rgb = hexToRgb(hex);
    document.documentElement.style.setProperty('--color-brand-rgb', rgb);
    localStorage.setItem('brand-color', hex);
    
    if (colorPicker) colorPicker.value = hex;
    if (hexInput) hexInput.value = hex;
    updatePresetUI(hex);
  }

  function updatePresetUI(hex) {
    document.querySelectorAll('.preset-color-btn').forEach(b => {
      const isSelected = b.dataset.color.toLowerCase() === hex.toLowerCase();
      b.innerHTML = isSelected ? '✔' : '';
      b.style.color = 'white';
      b.style.fontWeight = 'bold';
    });
  }

  // 绑定颜色输入事件
  if (colorPicker) colorPicker.oninput = e => setBrandColor(e.target.value);
  if (hexInput) hexInput.oninput = e => {
    let v = e.target.value;
    if (!v.startsWith('#')) v = '#' + v;
    if (v.length === 7) setBrandColor(v);
  };

  // 生成预设颜色按钮
  const presets = ['#4F46E5', '#DB2777', '#7C3AED', '#2563EB', '#059669', '#DC2626', '#D97706', '#000000'];
  const presetContainer = document.getElementById('preset-colors');
  if (presetContainer && presetContainer.children.length === 0) {
    presets.forEach(color => {
      const b = document.createElement('button');
      b.className = 'preset-color-btn w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 border border-black/10 text-[10px]';
      b.style.backgroundColor = color;
      b.dataset.color = color;
      b.onclick = () => setBrandColor(color);
      presetContainer.appendChild(b);
    });
    updatePresetUI(savedColor);
  }


  // --- D. 动画切换逻辑 (由 AnimSection 组件处理) ---
  // 监听动画切换事件，更新 data-anim 属性供 CSS 使用
  window.addEventListener('animation-changed', (e) => {
    const { animId } = e.detail;
    document.documentElement.setAttribute('data-anim', animId);
  });
  
  // 初始化时应用保存的动画属性，默认使用 'default'
  const currentAnim = localStorage.getItem('site-anim') || 'default';
  document.documentElement.setAttribute('data-anim', currentAnim);


  // --- E. 模式切换逻辑 ---
  const modeBtns = document.querySelectorAll('.mode-btn');
  function updateModeUI(t) {
    modeBtns.forEach(b => {
      const active = b.dataset.mode === t;
      b.classList.toggle('bg-white', active);
      b.classList.toggle('dark:bg-gray-600', active);
      b.classList.toggle('text-brand-600', active);
      b.classList.toggle('text-slate-500', !active);
    });
  }
  
  const savedThemeMode = localStorage.getItem('theme') || 'auto';
  updateModeUI(savedThemeMode);

  function setTheme(t) {
    const root = document.documentElement;
    if (t === 'auto') {
      localStorage.removeItem('theme');
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) root.classList.add('dark');
      else root.classList.remove('dark');
    } else {
      root.classList.toggle('dark', t === 'dark');
      localStorage.setItem('theme', t);
    }
    updateModeUI(t);
  }
  modeBtns.forEach(b => b.onclick = () => setTheme(b.dataset.mode));


  // --- F. 模糊设置逻辑 ---
  const blurRange = document.getElementById('blur-range');
  const blurVal = document.getElementById('blur-val');
  const savedBlur = localStorage.getItem('bg-blur') || 0;
  
  if (blurRange) blurRange.value = savedBlur;
  if (blurVal) blurVal.textContent = `${savedBlur}px`;

  if (blurRange) {
    blurRange.oninput = (e) => {
      const px = e.target.value;
      document.documentElement.style.setProperty('--bg-blur', `${px}px`);
      if (blurVal) blurVal.textContent = `${px}px`;
      localStorage.setItem('bg-blur', px);
    };
  }


  // --- G. 背景上传逻辑 ---
  const bgUpload = document.getElementById('bg-upload');
  const bgPreviewArea = document.getElementById('bg-preview-area');
  const bgPreviewImg = document.getElementById('bg-preview-img');
  const bgRemoveBtn = document.getElementById('bg-remove-btn');

  // 检查 CSS 变量中是否有现有背景
  const currentBgVar = getComputedStyle(document.documentElement).getPropertyValue('--bg-image').trim();
  if (currentBgVar && currentBgVar !== 'none' && currentBgVar !== '') {
    // 简单的正则提取 url(...) 中的内容
    const urlMatch = currentBgVar.match(/url\(["']?(.*?)["']?\)/);
    if (urlMatch && urlMatch[1]) {
        if (bgPreviewArea) bgPreviewArea.classList.remove('hidden');
        if (bgPreviewImg) bgPreviewImg.src = urlMatch[1];
    }
  }

  if (bgUpload) {
    bgUpload.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const url = URL.createObjectURL(file);
      document.documentElement.style.setProperty('--bg-image', `url(${url})`);
      
      if (bgPreviewArea) bgPreviewArea.classList.remove('hidden');
      if (bgPreviewImg) bgPreviewImg.src = url;
      
      try { await saveImage(file); } catch (err) { console.error(err); }
    };
  }

  if (bgRemoveBtn) {
    bgRemoveBtn.onclick = async () => {
      document.documentElement.style.setProperty('--bg-image', 'none');
      if (bgPreviewArea) bgPreviewArea.classList.add('hidden');
      if (bgUpload) bgUpload.value = ''; // 清空 input 防止重复上传同一文件不触发 onchange
      await removeImage();
    };
  }


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

  // --- J. 导入导出逻辑 ---
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.onclick = async () => {
      const config = {
        theme: localStorage.getItem('theme'),
        brandColor: localStorage.getItem('brand-color'),
        bgBlur: localStorage.getItem('bg-blur'),
        siteAnim: localStorage.getItem('site-anim'),
        fontFamily: localStorage.getItem('site-font-family'),
        fontName: localStorage.getItem('site-font-name'),
        font2Family: localStorage.getItem('site-font2-family'),
        font2Name: localStorage.getItem('site-font2-name'),
        fontSize: localStorage.getItem('site-font-size'),
        fontWeight: localStorage.getItem('site-font-weight'),
        bgImage: null
      };

      try {
        const blob = await getImage();
        if (blob) {
          config.bgImage = await blobToBase64(blob);
        }
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config));
        const dlNode = document.createElement('a');
        dlNode.setAttribute("href", dataStr);
        dlNode.setAttribute("download", "my-nav-config.json");
        document.body.appendChild(dlNode);
        dlNode.click();
        dlNode.remove();
      } catch (e) {
        alert('导出失败: ' + e.message);
      }
    };
  }

  const importInput = document.getElementById('import-config');
  if (importInput) {
    importInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const config = JSON.parse(event.target.result);
          
          if (config.theme) localStorage.setItem('theme', config.theme);
          if (config.brandColor) localStorage.setItem('brand-color', config.brandColor);
          if (config.bgBlur) localStorage.setItem('bg-blur', config.bgBlur);
          if (config.siteAnim) localStorage.setItem('site-anim', config.siteAnim);
          if (config.fontFamily) localStorage.setItem('site-font-family', config.fontFamily);
          if (config.fontName) localStorage.setItem('site-font-name', config.fontName);
          if (config.font2Family) localStorage.setItem('site-font2-family', config.font2Family);
          if (config.font2Name) localStorage.setItem('site-font2-name', config.font2Name);
          if (config.fontSize) localStorage.setItem('site-font-size', config.fontSize);
          if (config.fontWeight) localStorage.setItem('site-font-weight', config.fontWeight);

          if (config.bgImage) {
            const blob = await base64ToBlob(config.bgImage);
            await saveImage(blob);
          } else {
            // 如果配置文件里没有背景，是否要移除当前的？原逻辑是移除
            await removeImage();
          }

          alert('导入成功，即将刷新');
          location.reload();
        } catch (err) {
          alert('文件格式错误');
          console.error(err);
        }
      };
      reader.readAsText(file);
    };
  }
}