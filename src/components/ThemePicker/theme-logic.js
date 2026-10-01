/**
 * theme-logic.js
 * 负责 ThemePicker 的所有交互逻辑、IndexedDB 存取和状态同步
 */

// === 依赖（均已拆到 ./logic/ 下） ===
import { getImage, hexToRgb, removeImage, saveImage } from './logic/storage.js';
import { setupFontSection } from './logic/fonts.js';
import { setupBackupSection } from './logic/backup.js';

// === 核心初始化函数 ===
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


  // --- I. 本地字体加载逻辑（实现见 ./logic/fonts.js） ---
  setupFontSection();

  // --- J. 导入导出逻辑（实现见 ./logic/backup.js） ---
  setupBackupSection();
}