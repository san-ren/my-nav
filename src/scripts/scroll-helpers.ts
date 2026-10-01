/**
 * 挂载 window.scrollToSection / window.scrollToTab 两个全局方法。
 *
 * 由页面内联 <script> 抽取而来；
 * astro:page-load 的注册仍留在页面里，保持原有触发时机不变。
 */

export function initScrollHelpers() {
  // 增强的滚动到区块函数
  window.scrollToSection = function(sectionId: string) {
    const target = document.getElementById(sectionId);
    if (target) {
      // 显示滚动反馈
      target.classList.add('scroll-target-active');
      setTimeout(() => target.classList.remove('scroll-target-active'), 500);
      
      // 平滑滚动
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // 显示 Toast 提示
      const heading = target.querySelector('h2, h3');
      if (heading && window.toast) {
        const title = heading.textContent?.trim();
        if (title) {
          window.toast.info(`正在跳转: ${title}`);
        }
      }
    }
  };

  // 增强的 Tab 切换函数
  window.scrollToTab = function(uniqueId: string, tabIdx: number) {
    // 隐藏所有 tab pane
    const allPanes = document.querySelectorAll(`[id^="pane-${uniqueId}-"]`);
    allPanes.forEach(pane => {
      pane.classList.add('hidden');
      pane.classList.remove('block');
    });
    
    // 显示目标 tab pane
    const targetPane = document.getElementById(`pane-${uniqueId}-${tabIdx}`);
    if (targetPane) {
      targetPane.classList.remove('hidden');
      targetPane.classList.add('block');
      
      // 重新触发动画
      targetPane.classList.remove('animate-fade-in');
      void targetPane.offsetWidth; // 强制重绘
      targetPane.classList.add('animate-fade-in');
    }
    
    // 更新 tab 按钮状态
    const allBtns = document.querySelectorAll(`[data-target^="pane-${uniqueId}-"]`);
    allBtns.forEach((btn, idx) => {
      if (idx === tabIdx) {
        btn.classList.add('text-brand-600', 'active-tab');
        btn.classList.remove('text-slate-500');
      } else {
        btn.classList.remove('text-brand-600', 'active-tab');
        btn.classList.add('text-slate-500');
      }
    });
  };
}
