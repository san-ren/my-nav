// -------------------------------------------------------------
// 悬浮效果管理（PC端 hover 和手机端点击共用）
// -------------------------------------------------------------

function applyHoverEffects(wrapper) {
  wrapper.classList.add('flow-active');
  // 手机端额外添加 mobile-hover 类
  if (window.innerWidth < 768) {
    wrapper.classList.add('mobile-hover');
  }

  // 检测描述是否超出宽度
  const descWrapper = wrapper.querySelector('.desc-wrapper');
  const descText = wrapper.querySelector('.desc-text');
  if (descWrapper && descText) {
    descWrapper.classList.remove('is-overflowing');
    
    // 利用 getBoundingClientRect 或解除样式获取真实无截断的文字长度
    const oldMaxWidth = descText.style.maxWidth;
    const oldOverflow = descText.style.overflow;
    const oldTextOverflow = descText.style.textOverflow;
    
    descText.style.maxWidth = 'none';
    descText.style.overflow = 'visible';
    descText.style.textOverflow = 'clip';
    
    // 强制浏览器回流刷新测量
    const realTextWidth = descText.scrollWidth;
    const containerWidth = descWrapper.clientWidth;
    
    descText.style.maxWidth = oldMaxWidth;
    descText.style.overflow = oldOverflow;
    descText.style.textOverflow = oldTextOverflow;
    
    // 考虑到小数点误差与微小的截断隐患，给 2px 的容差
    if (realTextWidth > containerWidth + 2) {
      descWrapper.classList.add('is-overflowing');
      
      const scrollDistance = realTextWidth - containerWidth + 8; // 额外补充8px空间避免边缘紧贴
      // 改良公式：使得速度始终为恒定 30px/s 左右，但保障最低时间为 1.5 秒，且最多不超过 8 秒
      const duration = Math.min(8, Math.max(1.5, scrollDistance / 30));
      
      descText.style.setProperty('--scroll-dist', `-${scrollDistance}px`);
      descText.style.setProperty('--scroll-dur', `${duration}s`);
    }
  }
}

function removeHoverEffects(wrapper) {
  wrapper.classList.remove('flow-active');
  wrapper.classList.remove('mobile-hover');

  // 移除描述溢出状态
  const descWrapper = wrapper.querySelector('.desc-wrapper');
  if (descWrapper) {
    descWrapper.classList.remove('is-overflowing');
  }
}

// -------------------------------------------------------------
// 浮窗逻辑（保留）
// -------------------------------------------------------------
let tooltipEl = null;
let hideTimer = null;
let activeCard = null;

function createTooltipDOM() {
  if (document.getElementById('global-detail-tooltip')) {
    tooltipEl = document.getElementById('global-detail-tooltip');
    return;
  }
  tooltipEl = document.createElement('div');
  tooltipEl.id = 'global-detail-tooltip';
  tooltipEl.className = 'portal-popup fixed z-[9999] hidden w-72 p-4 bg-white dark:bg-[#1e2025] rounded-xl shadow-2xl border border-slate-200/60 dark:border-slate-700 pointer-events-none opacity-0 scale-75';
  
  const arrow = document.createElement('div');
  arrow.className = 'tooltip-arrow-el absolute w-4 h-4 border-r border-b border-slate-200 dark:border-slate-700 rotate-45 bg-white dark:bg-[#1e2025] z-0';
  tooltipEl.appendChild(arrow);
  
  const content = document.createElement('div');
  content.id = 'tooltip-content';
  content.className = 'relative z-10';
  tooltipEl.appendChild(content);
  document.body.appendChild(tooltipEl);
}

function showTooltip(wrapper) {
  if (!tooltipEl) createTooltipDOM();
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }

  applyHoverEffects(wrapper);
  const source = wrapper.querySelector('.tooltip-source');
  if (!source) return;

  const contentBox = document.getElementById('tooltip-content');
  contentBox.innerHTML = source.innerHTML;

  // 0. 真正触发图片加载 (实现严格懒加载，解决首屏 500+ 网络请求卡顿)
  const lazyImages = contentBox.querySelectorAll('img[data-src]');
  lazyImages.forEach(img => {
    img.src = img.getAttribute('data-src');
    img.removeAttribute('data-src');
  });

  // 1. 禁用过渡
  tooltipEl.classList.add('no-transition');

  // 2. 设置为 scale-100（完整尺寸）用于准确测量位置
  tooltipEl.classList.remove('hidden', 'opacity-0', 'opacity-100', 'scale-75', 'scale-100');
  tooltipEl.classList.add('opacity-0', 'scale-100');

  // 3. 在完整尺寸下计算位置
  updatePosition(wrapper);

  // 4. 设置回动画起始状态 scale-75
  tooltipEl.classList.remove('scale-100');
  tooltipEl.classList.add('scale-75');

  // 5. 强制重绘，确保起始状态已应用
  void tooltipEl.offsetWidth;

  // 6. 恢复过渡
  tooltipEl.classList.remove('no-transition');

  // 7. 执行动画
  tooltipEl.classList.remove('opacity-0', 'scale-75');
  tooltipEl.classList.add('opacity-100', 'scale-100');
}

function hideTooltip(immediate = false) {
  if (!tooltipEl) return;
  if (activeCard) {
    removeHoverEffects(activeCard);
  }

  if (immediate) {
    tooltipEl.classList.add('no-transition');
    tooltipEl.classList.add('hidden', 'opacity-0', 'scale-75');
    tooltipEl.classList.remove('opacity-100', 'scale-100');
    tooltipEl.classList.remove('no-transition');
    activeCard = null;
  } else {
    tooltipEl.classList.remove('opacity-100', 'scale-100');
    tooltipEl.classList.add('opacity-0', 'scale-75');
    
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (tooltipEl && tooltipEl.classList.contains('opacity-0')) {
        tooltipEl.classList.add('hidden');
        activeCard = null;
      }
      hideTimer = null;
    }, 300);
  }
}

function updatePosition(wrapper) {
  if (!tooltipEl) return;
  const rect = wrapper.getBoundingClientRect();
  const tooltipRect = tooltipEl.getBoundingClientRect();
  const padding = 20; 
  const sidebarEl = document.getElementById('sidebar');
  const sidebarRight = (sidebarEl && window.innerWidth >= 768) ? sidebarEl.getBoundingClientRect().right : 0;

  // 优先向上渲染（卡片上方）
  let top = rect.top - tooltipRect.height - padding;
  let isTop = true;
  
  // 只有当上方空间完全不足时才向下渲染
  if (top < padding) { 
    top = rect.bottom + padding;
    isTop = false;
  }

  // 设置 transform-origin，使缩放/扩展从底部开始（向上扩展）
  tooltipEl.style.transformOrigin = isTop ? 'bottom center' : 'top center';
  
  let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
  
  const minLeft = sidebarRight + padding;
  if (left < minLeft) left = minLeft;
  
  if (left + tooltipRect.width > window.innerWidth - padding) {
    left = window.innerWidth - tooltipRect.width - padding;
  }

  let arrowLeft = rect.left + (rect.width / 2) - left - 8;
  arrowLeft = Math.max(12, Math.min(tooltipRect.width - 28, arrowLeft));

  tooltipEl.style.top = `${top}px`;
  tooltipEl.style.left = `${left}px`;
  
  const arrow = tooltipEl.querySelector('.tooltip-arrow-el');
  arrow.style.left = `${arrowLeft}px`;
  if (isTop) {
    arrow.style.bottom = '-8px'; arrow.style.top = 'auto'; arrow.style.transform = 'rotate(45deg)';
    arrow.className = 'tooltip-arrow-el absolute w-4 h-4 border-r border-b border-slate-200 dark:border-slate-700 rotate-45 bg-white dark:bg-[#1e2025] z-0';
  } else {
    arrow.style.top = '-8px'; arrow.style.bottom = 'auto'; arrow.style.transform = 'rotate(225deg)';
    arrow.className = 'tooltip-arrow-el absolute w-4 h-4 border-r border-b border-slate-200 dark:border-slate-700 rotate-45 bg-white dark:bg-[#1e2025] z-0';
  }
}

// 事件处理器
const handleMouseOver = (e) => {
  if (document.documentElement.classList.contains('mobile-device')) return;
  
  const wrapper = e.target.closest('.site-card-wrapper');
  if (wrapper) {
    if (activeCard !== wrapper && wrapper.querySelector('.tooltip-source')) {
      if (activeCard) removeHoverEffects(activeCard);
      activeCard = wrapper;
      showTooltip(wrapper);
    }
  } else {
    if (activeCard) {
      const isTooltip = e.target.closest('#global-detail-tooltip');
      if (!isTooltip) hideTooltip();
    }
  }
};

const handleClick = (e) => {
  // 检查是否点击了详情按钮 (无论是移动端还是桌面端)
  const btn = e.target.closest('.info-btn');
  if (btn) {
    e.preventDefault(); e.stopPropagation();
    const wrapper = btn.closest('.site-card-wrapper');
    if (wrapper) {
       // 如果当前卡片已激活且浮窗显示中，则关闭
       if (activeCard === wrapper && tooltipEl && !tooltipEl.classList.contains('hidden')) {
         hideTooltip();
       } else { 
         if(activeCard) removeHoverEffects(activeCard);
         activeCard = wrapper;
         showTooltip(wrapper); 
       }
    }
    return;
  }
  
  // 点击空白处关闭浮窗
  if (tooltipEl && !tooltipEl.classList.contains('hidden')) {
    if (!e.target.closest('.site-card-wrapper') && !e.target.closest('#global-detail-tooltip')) {
      hideTooltip();
    }
  }
};

const handleScroll = () => { if (activeCard) hideTooltip(true); };
const handleDocMouseLeave = () => { if (activeCard) hideTooltip(true); };
const handleWindowBlur = () => { if (activeCard) hideTooltip(true); };

export function initSiteCard() {
  createTooltipDOM();

  // 清理旧监听器
  document.body.removeEventListener('mouseover', handleMouseOver);
  document.body.removeEventListener('click', handleClick);
  document.removeEventListener('mouseleave', handleDocMouseLeave);
  window.removeEventListener('scroll', handleScroll, { capture: true });
  window.removeEventListener('touchmove', handleScroll);
  window.removeEventListener('blur', handleWindowBlur);

  // 添加新监听器
  document.body.addEventListener('mouseover', handleMouseOver);
  document.body.addEventListener('click', handleClick);
  document.addEventListener('mouseleave', handleDocMouseLeave);
  window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
  window.addEventListener('touchmove', handleScroll, { passive: true });
  window.addEventListener('blur', handleWindowBlur);
}
