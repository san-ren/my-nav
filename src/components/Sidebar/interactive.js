// =======================================================
// 1. 悬浮菜单逻辑 (Tooltip)
// =======================================================
let tooltipEl = null;
let hideTimer = null; 
let currentBtn = null;

function createTooltipDOM() {
  if (document.getElementById('sidebar-float-menu')) { 
    tooltipEl = document.getElementById('sidebar-float-menu');
    return; 
  }
  tooltipEl = document.createElement('div');
  tooltipEl.id = 'sidebar-float-menu';
  // ...保持原有的 style 设置，或者建议写入 CSS 文件...
  tooltipEl.style.cssText = `position: fixed; z-index: 9999; display: none;
    min-width: 180px; max-width: 260px; padding: 16px; background: rgba(255, 255, 255, 0.95); border-radius: 16px; box-shadow: 0 10px 40px -10px rgba(0,0,0,0.15);
    border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(16px); opacity: 0; transform: translateX(-10px); transition: opacity 0.2s ease, transform 0.2s ease; pointer-events: auto;`;
  
  if (document.documentElement.classList.contains('dark')) { 
    tooltipEl.style.backgroundColor = 'rgba(17, 24, 39, 0.95)'; 
    tooltipEl.style.borderColor = 'rgba(51, 65, 85, 0.5)'; 
  }
  
  document.body.appendChild(tooltipEl);
  tooltipEl.addEventListener('mouseenter', () => { if (hideTimer) clearTimeout(hideTimer); });
  tooltipEl.addEventListener('mouseleave', () => { hideTooltip(); });
}

function showTooltip(btn, content) {
  if (window.innerWidth < 768) return;
  createTooltipDOM();
  if (hideTimer) clearTimeout(hideTimer);
  if (currentBtn === btn && tooltipEl.style.display === 'block') return;
  
  tooltipEl.innerHTML = content;
  const rect = btn.getBoundingClientRect();
  const top = Math.max(10, Math.min(window.innerHeight - 200, rect.top));
  const left = rect.right + 10;
  
  tooltipEl.style.top = `${top}px`;
  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.display = 'block';
  void tooltipEl.offsetWidth;
  tooltipEl.style.opacity = '1';
  tooltipEl.style.transform = 'translateX(0)';
  currentBtn = btn;
}

function hideTooltipImmediate() { 
  if (!tooltipEl) return; 
  if (hideTimer) clearTimeout(hideTimer); 
  tooltipEl.style.display = 'none'; 
  tooltipEl.style.opacity = '0'; 
  currentBtn = null;
}

function hideTooltip() { 
  if (!tooltipEl) return; 
  hideTimer = setTimeout(() => { 
    tooltipEl.style.opacity = '0'; 
    tooltipEl.style.transform = 'translateX(-10px)'; 
    setTimeout(() => { 
      if (tooltipEl.style.opacity === '0') { 
        tooltipEl.style.display = 'none'; 
        currentBtn = null; 
      } 
    }, 200); 
  }, 100);
}

// =======================================================
// 2. 辅助功能 (滚动与折叠)
// 注意：我们需要把这些挂载到 window 对象上，因为 HTML 里可能有 onclick 调用
// =======================================================
export function initGlobalHelpers() {
  window.scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const offsetTop = el.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({ top: offsetTop, behavior: "smooth" });
      if(window.closeSidebarMobile) window.closeSidebarMobile();
    }
  };

  window.scrollToTab = (id, idx) => {
    const menu = document.getElementById('sidebar-float-menu');
    if(menu) menu.style.display = 'none';
    
    // 调用 scrollToSection
    window.scrollToSection(`cat-${id}`);
    
    setTimeout(() => {
       const g = document.getElementById(`cat-${id}`);
       if(g) { 
         const b = g.querySelectorAll('.tab-btn')[idx]; 
         if(b) b.click();
         const catBtn = g.querySelector('.sidebar-cat-btn');
         if(catBtn && catBtn.classList.contains('has-sub-menu')) {
            const arrow = catBtn.querySelector('svg');
            const targetId = catBtn.getAttribute('data-target');
            const subMenu = document.getElementById(targetId);
            if (subMenu && subMenu.classList.contains('grid-rows-[0fr]')) {
              subMenu.classList.remove('grid-rows-[0fr]'); 
              subMenu.classList.add('grid-rows-[1fr]');
              if(arrow) arrow.style.transform = 'rotate(90deg)';
            }
         }
       }
    }, 300);
  };
}

// =======================================================
// 3. 事件绑定
// =======================================================
function bindHoverEvents() {
  const btns = document.querySelectorAll('.has-sub-menu');
  btns.forEach(btn => {
    if (btn._hasBindHover) return;
    btn._hasBindHover = true;
    const wrapper = btn.closest('.sidebar-item-container');
    const source = wrapper ? wrapper.querySelector('.sidebar-tooltip-source') : null;
    if (source) {
      btn.addEventListener('mouseenter', () => { showTooltip(btn, source.innerHTML); });
      btn.addEventListener('mouseleave', () => { hideTooltip(); });
    }
  });
}

function handleCollapse(e) {
  const btn = e.target.closest('.has-sub-menu');
  if (!btn) return;
  e.preventDefault(); e.stopPropagation();
  const targetId = btn.getAttribute('data-target');
  const subMenu = document.getElementById(targetId);
  const arrow = btn.querySelector('svg');
  if (subMenu) {
    if (subMenu.classList.contains('grid-rows-[0fr]')) {
      subMenu.classList.remove('grid-rows-[0fr]'); subMenu.classList.add('grid-rows-[1fr]');
      if (arrow) arrow.style.transform = 'rotate(90deg)';
    } else {
      subMenu.classList.remove('grid-rows-[1fr]'); subMenu.classList.add('grid-rows-[0fr]');
      if (arrow) arrow.style.transform = 'rotate(0deg)';
    }
  }
}

export function initInteractive() {
  createTooltipDOM();
  bindHoverEvents();
  initGlobalHelpers(); // 注册 window 函数

  document.removeEventListener('click', handleCollapse);
  document.addEventListener('click', handleCollapse);

  const sidebarNav = document.getElementById('sidebar-nav');
  if (sidebarNav) sidebarNav.addEventListener('scroll', () => hideTooltipImmediate(), { passive: true });
}