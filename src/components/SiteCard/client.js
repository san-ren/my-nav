// 图片加载逻辑
function loadOneImage(img) {
  if (img.dataset.loaded === 'true') return;
  const realSrc = img.dataset.lazySrc;
  const sources = img.dataset.sources ? JSON.parse(img.dataset.sources) : null;
  const domain = img.dataset.domain;

  if (domain) {
    const cached = localStorage.getItem('fav-' + domain);
    if (cached) {
      img.src = cached;
      img.dataset.loaded = 'true';
      return;
    }
  }

  const tempImage = new Image();
  tempImage.onload = () => {
    img.src = realSrc;
    img.dataset.loaded = 'true';
    if (domain && !realSrc.includes('favicon.svg')) {
      try { localStorage.setItem('fav-' + domain, realSrc); } catch (e) {}
    }
  };
  tempImage.onerror = () => {
    if (sources) {
      if (realSrc.includes('ico.kucat.cn')) img.src = sources.level2;
      else if (realSrc.includes('/favicon.ico')) img.src = sources.level3;
      else img.dataset.loaded = 'true';
    }
  };
  if (realSrc) tempImage.src = realSrc;
}

function initObserver() {
  const imgs = document.querySelectorAll('img.lazy-icon:not([data-loaded="true"])');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadOneImage(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '200px 0px', threshold: 0.01 });
    imgs.forEach(img => observer.observe(img));
  } else {
    imgs.forEach(img => loadOneImage(img));
  }
}

function loadRestIcons() {
  const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 2000));
  idleCallback(() => {
    const allImgs = document.querySelectorAll('img.lazy-icon:not([data-loaded="true"])');
    allImgs.forEach(img => loadOneImage(img));
  }, { timeout: 5000 });
}

function startLoading() {
  initObserver();
  if (document.readyState === 'complete') { loadRestIcons(); }
  else { window.addEventListener('load', loadRestIcons); }
}

// -------------------------------------------------------------
// 浮窗逻辑
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
  tooltipEl.className = 'portal-popup fixed z-[9999] hidden w-72 p-4 bg-white dark:bg-[#1e2025] rounded-xl shadow-2xl border border-slate-200/60 dark:border-slate-700 pointer-events-none opacity-0 scale-75 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]';
  
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

  wrapper.classList.add('flow-active');
  const source = wrapper.querySelector('.tooltip-source');
  if (!source) return;

  const contentBox = document.getElementById('tooltip-content');
  contentBox.innerHTML = source.innerHTML;

  // --- 修复开始 ---
  // 1. 暂时禁用过渡动画，防止测量到缩放中的尺寸
  tooltipEl.style.transition = 'none';

  // 2. 将浮窗设置为完全可见且无缩放状态 (scale-100)
  tooltipEl.classList.remove('hidden', 'scale-75', 'opacity-0');
  tooltipEl.classList.add('scale-100', 'opacity-0'); // 保持 opacity-0 以防闪烁，但尺寸必须是完全体

  // 3. 在 100% 尺寸下计算准确位置
  updatePosition(wrapper);

  // 4. 准备入场动画：先设置回初始状态 (scale-75)
  tooltipEl.classList.remove('scale-100');
  tooltipEl.classList.add('scale-75');

  // 5. 强制浏览器重绘 (Reflow)，确保上述状态被应用（位置已定，状态为 scale-75）
  void tooltipEl.offsetWidth;

  // 6. 恢复 CSS 过渡效果
  tooltipEl.style.transition = ''; 
  
  // 7. 执行动画到结束状态 (scale-100)
  requestAnimationFrame(() => {
    tooltipEl.classList.remove('opacity-0', 'scale-75');
    tooltipEl.classList.add('opacity-100', 'scale-100');
  });
  // --- 修复结束 ---
}

function hideTooltip(immediate = false) {
  if (!tooltipEl) return;
  if (activeCard) {
    activeCard.classList.remove('flow-active');
  }

  if (immediate) {
      tooltipEl.style.transition = 'none';
      tooltipEl.classList.add('hidden', 'opacity-0', 'scale-75');
      tooltipEl.classList.remove('opacity-100', 'scale-100');
      activeCard = null;
  } else {
    tooltipEl.style.transition = '';
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
  const padding = 12; 
  const sidebarEl = document.getElementById('sidebar');
  const sidebarRight = (sidebarEl && window.innerWidth >= 768) ? sidebarEl.getBoundingClientRect().right : 0;

  let top = rect.top - tooltipRect.height - padding;
  let isTop = true;
  if (top < padding && (rect.bottom + tooltipRect.height + padding < window.innerHeight)) { 
    top = rect.bottom + padding;
    isTop = false;
  }

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
  } else {
    arrow.style.top = '-8px'; arrow.style.bottom = 'auto'; arrow.style.transform = 'rotate(225deg)';
  }
}

// 事件处理器
const handleMouseOver = (e) => {
  if (window.innerWidth < 768) return;
  const wrapper = e.target.closest('.site-card-wrapper');
  if (wrapper) {
    if (activeCard !== wrapper && wrapper.querySelector('.tooltip-source')) {
      if (activeCard) activeCard.classList.remove('flow-active');
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
  const btn = e.target.closest('.info-btn');
  if (btn) {
    e.preventDefault(); e.stopPropagation();
    const wrapper = btn.closest('.site-card-wrapper');
    if (wrapper) {
       if (activeCard === wrapper && !tooltipEl.classList.contains('hidden')) hideTooltip();
       else { 
         if(activeCard) activeCard.classList.remove('flow-active');
         activeCard = wrapper;
         showTooltip(wrapper); 
       }
    }
    return;
  }
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
  startLoading();

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