// src/scripts/ui-layout.js

// 1. 侧边栏切换逻辑 (PC)
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

// 2. 侧边栏切换逻辑 (Mobile) - 补充完整以防报错
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
// 补充关闭逻辑供遮罩层点击使用
window.closeSidebarMobile = () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) {
        sidebar.classList.remove('translate-x-0');
        sidebar.classList.add('-translate-x-full');
    }
    if (overlay) overlay.classList.remove('active');
};


// 3. 顶栏滚动隐藏逻辑
function initHeaderScroll() {
  let lastScrollY = window.scrollY;
  const header = document.getElementById('page-header');
  const threshold = 50;

  // 移除旧监听器防止重复绑定
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
// 4. 暗色模式切换逻辑 (从 Layout.astro 移植)
// ==========================================
function setupThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  // 克隆节点以移除所有旧的事件监听器 (防止 View Transitions 重复绑定)
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  newBtn.addEventListener('click', () => {
    // 切换 class
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // 保存到本地存储
    localStorage.setItem('theme', newTheme);
  });
}

// ==========================================
// 5. 全局初始化入口 (修改 initLayout 函数)
// ==========================================
function initLayout() {
  // 1. 初始化顶栏滚动
  initHeaderScroll();
  
  // 2. 初始化暗色切换 (新增!)
  setupThemeToggle();

  // 3. 初始化侧边栏状态
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