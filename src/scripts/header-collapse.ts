/**
 * 顶栏响应式折叠：空间不足时把右侧操作区收进三点按钮。
 *
 * 由页面内联 <script> 抽取而来；
 * astro:page-load 的注册仍留在页面里，保持原有触发时机不变。
 */

// 降级为 HTMLElement 以适应 TS 对 style 等属性的类型推断
export function initHeaderCollapse() {
    // 降级为 HTMLElement 以适应 TS 对 style 等属性的类型推断
    const leftGroup = document.getElementById('header-left-group') as HTMLElement;
    const actionsGroup = document.getElementById('header-actions-group') as HTMLElement;
    const triggerBtn = document.getElementById('header-actions-trigger') as HTMLElement;
    const triggerIcon = document.getElementById('header-actions-icon') as HTMLElement;
    const rightContainer = document.getElementById('header-actions-container') as HTMLElement;
    const header = document.getElementById('page-header') as HTMLElement;
    
    if (!leftGroup || !actionsGroup || !triggerBtn || !header) return;
    
    // 桌面无约束下原本的样式组合
    const originalClasses = 'relative flex items-center gap-2 md:gap-3 shrink-0 scale-100 opacity-100 pointer-events-auto origin-right z-auto top-auto right-auto translate-y-0 bg-transparent py-0 px-0 shadow-none border-t-0 p-0';
    // 隐藏状态（收纳到触发按钮左侧看不见的地方）- cubic-bezier 实现Q弹效果
    const collapsedHiddenClasses = 'absolute right-[calc(100%+0.5rem)] top-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-right scale-50 opacity-0 pointer-events-none z-50';
    // 滑出展示状态（完全展开显示在触发按钮左侧）
    const collapsedVisibleClasses = 'absolute right-[calc(100%+0.5rem)] top-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-right scale-100 opacity-100 pointer-events-auto z-50';
    
    const win = window as any;
    if (!win.__headerActionsNaturalWidth) {
       actionsGroup.className = originalClasses;
       win.__headerActionsNaturalWidth = actionsGroup.scrollWidth || 180;
    }
    const actionsWidth = win.__headerActionsNaturalWidth;
    
    function measure() {
       const titleSpan = leftGroup.querySelector('span.truncate') as HTMLElement;
       if (!titleSpan) return;
       
       // 为了获取最真实的文字长度，临时取消限制类的截断
       const oldMax = titleSpan.style.maxWidth;
       const oldOverflow = titleSpan.style.overflow;
       const oldDisplay = titleSpan.style.display;
       titleSpan.style.maxWidth = 'none';
       titleSpan.style.overflow = 'visible';
       titleSpan.style.display = 'inline-block';
       
       const naturalTitleWidth = titleSpan.scrollWidth;
       
       titleSpan.style.maxWidth = oldMax;
       titleSpan.style.overflow = oldOverflow;
       titleSpan.style.display = oldDisplay;
       
       // 左侧整个标题部分按原比例撑开时原本需要占据的分辨率（汉堡菜单40 + icon垫圈36 + 文字长 + 间隙24 = 约加100像素空余）
       const leftNaturalWidth = naturalTitleWidth + 100;
       
       const containerWidth = header.clientWidth;
       // 移动端由于屏幕小，容差小，桌面端保持较大余量
       const paddingAndGap = window.innerWidth < 768 ? 32 : 80; 
       
       // 预判：如果文字天然长度 + 按钮天然长度超过屏幕安全区域则启用折叠机制
       const needsCollapse = leftNaturalWidth + actionsWidth + paddingAndGap > containerWidth;
       
       if (needsCollapse) {
          triggerBtn.classList.remove('hidden');
          triggerBtn.classList.add('flex');
          // 由于折叠后汉堡键(40)+Icon组(36)+三点按键(40)加间隙大约占110-120px
          // 我们给标题留出尽可能多的剩余空间
          titleSpan.style.maxWidth = `${containerWidth - 110}px`;
          
          if (rightContainer.classList.contains('is-open')) {
             actionsGroup.className = collapsedVisibleClasses;
             if(triggerIcon) triggerIcon.style.transform = 'rotate(90deg)';
             triggerBtn.classList.add('bg-brand-50', 'text-brand-600', 'border-brand-200', 'dark:border-brand-700/50');
          } else {
             actionsGroup.className = collapsedHiddenClasses;
             if(triggerIcon) triggerIcon.style.transform = 'rotate(0deg)';
             triggerBtn.classList.remove('bg-brand-50', 'text-brand-600', 'border-brand-200', 'dark:border-brand-700/50');
          }
       } else {
          // 空间足够，禁用折叠
          triggerBtn.classList.remove('flex', 'bg-brand-50', 'text-brand-600', 'border-brand-200', 'dark:border-brand-700/50');
          triggerBtn.classList.add('hidden');
          rightContainer.classList.remove('is-open'); 
          actionsGroup.className = originalClasses;
          titleSpan.style.maxWidth = ''; // 去除自定义限制
          if(triggerIcon) triggerIcon.style.transform = 'rotate(0deg)';
       }
    }
    
    triggerBtn.onclick = (e) => {
       e.stopPropagation();
       rightContainer.classList.toggle('is-open');
       measure();
    };
    
    // 监听外部点击（如果在抽屉外部点击则关闭抽屉）
    document.addEventListener('click', (e) => {
       const target = e.target as Element;
       if (rightContainer.classList.contains('is-open') && !rightContainer.contains(target)) {
          // 不要误关：判断是否点击在那些弹出的深层面板中
          const isFilterPanel = target.closest('.filter-dropdown');
          const isThemePanel = target.closest('#theme-panel');
          if (!isFilterPanel && !isThemePanel) {
            rightContainer.classList.remove('is-open');
            measure();
          }
       }
    });

    if (win.__headerResizeObserver) {
       win.__headerResizeObserver.disconnect();
    }
    win.__headerResizeObserver = new ResizeObserver(() => measure());
    win.__headerResizeObserver.observe(header);
    
    measure();
}
