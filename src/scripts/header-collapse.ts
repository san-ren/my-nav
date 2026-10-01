/**
 * 顶栏「更多操作」折叠菜单。
 *
 * 状态筛选 / 分享 / 主题三个入口统一收纳进三点按钮弹出的下拉菜单；
 * 由页面内联 <script> 注册（astro:page-load + DOMContentLoaded），
 * 保持原有初始化时机不变。
 */

// 菜单开合只切换这些通用原子类，避免动态拼接的类名被 Tailwind 漏扫
const MENU_OPEN_CLASSES = ['opacity-100', 'visible', 'pointer-events-auto', 'scale-100'];
const MENU_CLOSED_CLASSES = ['opacity-0', 'invisible', 'pointer-events-none', 'scale-95'];
const TRIGGER_ACTIVE_CLASSES = ['bg-brand-50', 'text-brand-600', 'border-brand-200', 'dark:border-brand-700/50'];

export function initHeaderCollapse() {
    const rightContainer = document.getElementById('header-actions-container') as HTMLElement;
    const actionsGroup = document.getElementById('header-actions-group') as HTMLElement;
    const triggerBtn = document.getElementById('header-actions-trigger') as HTMLElement;
    const triggerIcon = document.getElementById('header-actions-icon') as HTMLElement;

    if (!rightContainer || !actionsGroup || !triggerBtn) return;

    function setOpen(open: boolean) {
       rightContainer.classList.toggle('is-open', open);
       actionsGroup.classList.remove(...MENU_OPEN_CLASSES, ...MENU_CLOSED_CLASSES);
       actionsGroup.classList.add(...(open ? MENU_OPEN_CLASSES : MENU_CLOSED_CLASSES));
       TRIGGER_ACTIVE_CLASSES.forEach((cls) => triggerBtn.classList.toggle(cls, open));
       if (triggerIcon) triggerIcon.style.transform = open ? 'rotate(90deg)' : 'rotate(0deg)';
    }

    // 打开分享 / 搜索弹窗时顺手收起菜单
    window.addEventListener('open-share-modal', () => setOpen(false));
    window.addEventListener('open-search-modal', () => setOpen(false));

    triggerBtn.onclick = (e) => {
       e.stopPropagation();
       setOpen(!rightContainer.classList.contains('is-open'));
    };

    // 外部点击关闭菜单；筛选下拉 / 主题面板内部的点击不算「外部」
    document.addEventListener('click', (e) => {
       if (!rightContainer.classList.contains('is-open')) return;
       const target = e.target as Element;
       if (!target || rightContainer.contains(target)) return;
       if (target.closest?.('.filter-dropdown') || target.closest?.('#theme-panel')) return;
       setOpen(false);
    });

    // 初始化（同时复位 SPA 导航后残留的 is-open 标记）
    setOpen(false);
}
