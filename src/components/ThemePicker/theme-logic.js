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


  // --- D. 动画切换逻辑 ---
  const animBtns = document.querySelectorAll('.anim-btn');
  const updateAnimBtns = (name) => {
    animBtns.forEach(b => {
      const active = b.dataset.anim === name;
      b.classList.toggle('bg-brand-50', active);
      b.classList.toggle('text-brand-600', active);
      b.classList.toggle('border-brand-500', active);
      b.classList.toggle('dark:bg-brand-900/20', active);
      
      b.classList.toggle('border-slate-200', !active);
      b.classList.toggle('dark:border-gray-700', !active);
    });
  };
  
  const currentAnim = localStorage.getItem('site-anim') || 'fade-up';
  updateAnimBtns(currentAnim);

  window.setAnim = function(name) { // 挂载到 window 方便调试，或直接使用局部函数
    document.documentElement.setAttribute('data-anim', name);
    localStorage.setItem('site-anim', name);
    updateAnimBtns(name);
  };
  animBtns.forEach(b => b.onclick = () => window.setAnim(b.dataset.anim));


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


  // --- H. 导入导出逻辑 ---
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.onclick = async () => {
      const config = {
        theme: localStorage.getItem('theme'),
        brandColor: localStorage.getItem('brand-color'),
        bgBlur: localStorage.getItem('bg-blur'),
        siteAnim: localStorage.getItem('site-anim'),
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