/**
 * 动画样式初始化脚本
 * 在页面加载时自动应用用户保存的动画设置
 * 所有动画样式已合并到 src/styles/animations.css，通过 data-anim 属性切换
 */

(function() {
  // 防止重复初始化
  if (window.__animInitialized) return;
  window.__animInitialized = true;

  function initAnimations() {
    // 获取保存的动画设置，如果没有则使用 'default'
    const savedAnim = localStorage.getItem('site-anim') || 'default';
    
    // 设置 data-anim 属性（样式在 animations.css 中已定义）
    document.documentElement.setAttribute('data-anim', savedAnim);
  }

  // 立即执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnimations);
  } else {
    initAnimations();
  }

  // 监听 Astro 页面切换
  document.addEventListener('astro:after-swap', initAnimations);
})();