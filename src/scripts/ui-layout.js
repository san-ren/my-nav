// src/scripts/ui-layout.js

// ==========================================
// 1. 侧边栏切换逻辑 (PC)
// ==========================================
window.toggleSidebarPC = () => {
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.querySelector('main');
  const header = document.getElementById('page-header');
  
  if (sidebar && mainContent && header) {
    window.isPCOpen = !window.isPCOpen;
    if (window.isPCOpen) {
      sidebar.style.marginLeft = '0px'; 
      mainContent.style.marginLeft = 'var(--sidebar-width)';
      header.style.width = 'calc(100% - var(--sidebar-width))';
    } else {
      sidebar.style.marginLeft = 'calc(var(--sidebar-width) * -1)';
      mainContent.style.marginLeft = '0px';
      header.style.width = '100%';
    }
  }
};

// ==========================================
// 2. 侧边栏切换逻辑 (Mobile)
// ==========================================
window.toggleSidebarMobile = () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && overlay) {
        const isOpen = sidebar.classList.contains('translate-x-0');
        if (isOpen) {
            sidebar.classList.remove('translate-x-0');
            sidebar.classList.add('-translate-x-full');
            overlay.classList.remove('active');
        } else {
            sidebar.classList.remove('-translate-x-full');
            sidebar.classList.add('translate-x-0');
            overlay.classList.add('active');
        }
    }
};

window.closeSidebarMobile = () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) {
        sidebar.classList.remove('translate-x-0');
        sidebar.classList.add('-translate-x-full');
    }
    if (overlay) overlay.classList.remove('active');
};

// ==========================================
// 3. 顶栏滚动隐藏逻辑
// ==========================================
function initHeaderScroll() {
  let lastScrollY = window.scrollY;
  const header = document.getElementById('page-header');
  const threshold = 50;

  window.removeEventListener('scroll', handleScroll);
  
  function handleScroll() {
    if (!header) return;
    const currentScrollY = window.scrollY;
    if (currentScrollY <= 0) {
      header.style.transform = 'translateY(0)';
      lastScrollY = currentScrollY;
      return;
    }
    if (Math.abs(currentScrollY - lastScrollY) < 5) return;
    
    if (currentScrollY > lastScrollY && currentScrollY > threshold) {
       header.style.transform = 'translateY(-100%)';
    } else {
      header.style.transform = 'translateY(0)';
    }
    lastScrollY = currentScrollY;
  }
  
  window.addEventListener('scroll', handleScroll, { passive: true });
}

// ==========================================
// 4. 暗色模式切换逻辑
// ==========================================
function setupThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  newBtn.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    localStorage.setItem('theme', newTheme);
  });
}

// ==========================================
// 5. Tab 切换逻辑
// ==========================================
function initTabs() {
  const containers = document.querySelectorAll('.tab-nav-container');
  containers.forEach(container => {
    const indicator = container.querySelector('.tab-indicator');
    const btns = container.querySelectorAll('.tab-btn');
    if (!indicator || btns.length === 0) return;
    
    const moveIndicator = (targetBtn) => {
      if (!targetBtn) return;
      indicator.style.left = `${targetBtn.offsetLeft}px`;
      indicator.style.width = `${targetBtn.offsetWidth}px`;
      indicator.style.opacity = '1'; 
    };
    
    const activeBtn = container.querySelector('.active-tab') || btns[0];
    setTimeout(() => { if(activeBtn) moveIndicator(activeBtn); }, 50);

    btns.forEach(btn => {
      btn.addEventListener('mouseenter', () => moveIndicator(btn));
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        btns.forEach(b => {
          b.classList.remove('active-tab', 'text-brand-600', 'bg-white', 'dark:bg-gray-700', 'shadow-sm');
          b.classList.add('text-slate-500');
        });
        btn.classList.add('active-tab', 'text-brand-600'); 
        btn.classList.remove('text-slate-500');
        moveIndicator(btn);
        const group = container.closest('.category-group');
        const targetId = btn.getAttribute('data-target');
        group.querySelectorAll('.tab-pane').forEach(p => {
          p.classList.add('hidden');
          p.classList.remove('animate-fade-in'); 
        });
        const targetPane = document.getElementById(targetId);
        if(targetPane) {
          targetPane.classList.remove('hidden');
          void targetPane.offsetWidth;
          targetPane.classList.add('animate-fade-in');
        }
      });
    });
    container.addEventListener('mouseleave', () => {
      const currentActive = container.querySelector('.active-tab');
      if (currentActive) moveIndicator(currentActive);
    });
  });
}

// ==========================================
// 6. 资源筛选开关逻辑
// ==========================================
function initResourceFilter() {
  const filterToggle = document.getElementById('resource-filter-toggle');
  const dropdown = document.querySelector('.filter-dropdown');
  const showStaleCheckbox = document.getElementById('show-stale');
  const showFailedCheckbox = document.getElementById('show-failed');
  
  if (!filterToggle || !dropdown) return;

  // 点击筛选按钮切换下拉菜单
  filterToggle.addEventListener('change', () => {
    if (filterToggle.checked) {
      dropdown.classList.remove('opacity-0', 'invisible');
      dropdown.classList.add('opacity-100', 'visible');
    } else {
      dropdown.classList.add('opacity-0', 'invisible');
      dropdown.classList.remove('opacity-100', 'visible');
    }
  });

  // 点击外部关闭下拉菜单
  document.addEventListener('click', (e) => {
    const container = document.querySelector('.resource-filter-container');
    if (container && !container.contains(e.target)) {
      filterToggle.checked = false;
      dropdown.classList.add('opacity-0', 'invisible');
      dropdown.classList.remove('opacity-100', 'visible');
    }
  });

  // 长期未更新资源显隐
  if (showStaleCheckbox) {
    showStaleCheckbox.addEventListener('change', () => {
      const staleCards = document.querySelectorAll('[data-status="stale"]');
      staleCards.forEach(card => {
        if (showStaleCheckbox.checked) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });
  }

  // 失效资源显隐
  if (showFailedCheckbox) {
    showFailedCheckbox.addEventListener('change', () => {
      const failedCards = document.querySelectorAll('[data-status="failed"]');
      failedCards.forEach(card => {
        if (showFailedCheckbox.checked) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });
  }

  // 初始状态：隐藏失效资源
  const failedCards = document.querySelectorAll('[data-status="failed"]');
  failedCards.forEach(card => card.classList.add('hidden'));
}

// ==========================================
// 7. 全局初始化入口
// ==========================================
function initLayout() {
  // 1. 初始化顶栏滚动
  initHeaderScroll();
  
  // 2. 初始化暗色切换
  setupThemeToggle();

  // 3. 初始化 Tab 切换
  initTabs();

  // 4. 初始化资源筛选
  initResourceFilter();

  // 5. 初始化侧边栏状态
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.querySelector('main');
  const header = document.getElementById('page-header');
  const overlay = document.getElementById('sidebar-overlay');
  
  if(overlay) {
      overlay.onclick = window.closeSidebarMobile;
  }

  if(sidebar && mainContent && header) {
      if (window.innerWidth >= 768) {
        // PC 初始化
        sidebar.style.marginLeft = '0px';
        mainContent.style.marginLeft = 'var(--sidebar-width)';
        header.style.width = 'calc(100% - var(--sidebar-width))'; 
        sidebar.classList.remove('-translate-x-full');
        sidebar.classList.add('translate-x-0');
        if (overlay) overlay.classList.remove('active');
        window.isPCOpen = true;
      } else {
        // Mobile 初始化
        sidebar.style.marginLeft = '';
        mainContent.style.marginLeft = '0px';
        header.style.width = '100%';
        if (sidebar.classList.contains('translate-x-0')) {
           sidebar.classList.remove('translate-x-0');
           sidebar.classList.add('-translate-x-full');
        }
        if (overlay) overlay.classList.remove('active');
      }
  }
}

// 立即执行
initLayout();

// Astro 页面切换后重新执行
document.addEventListener('astro:after-swap', initLayout);

// 窗口大小改变时重置
let resizeTimer;
window.addEventListener('resize', () => {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(initLayout, 200);
});
