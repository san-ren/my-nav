/**
 * 页面区块定位监听：把当前视口内占比最大的锚点 id 写到 window.__ACTIVE_SHARE_ID__。
index.astro 与 [id].astro 共用。
 *
 * 由页面内联 <script> 抽取而来；
 * astro:page-load 的注册仍留在页面里，保持原有触发时机不变。
 */

export function initShareObserver() {
    const targets = document.querySelectorAll('.share-observe-target');
    if (!targets.length) return;

    // 获取当前在视口内的元素
    const observer = new IntersectionObserver((entries) => {
      // 找出当前可见比例最大的元素
      let maxRatio = 0;
      let activeId = null;
      
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio;
          activeId = entry.target.id;
        }
      });
      
      if (activeId) {
        (window as any).__ACTIVE_SHARE_ID__ = activeId;
      }
    }, {
      rootMargin: '-10% 0px -40% 0px', // 关注偏上半部分的屏幕
      threshold: [0, 0.25, 0.5, 0.75, 1]
    });

    targets.forEach(el => observer.observe(el));
    
    // 如果没有被覆盖时设置默认第一个为 active
    if (!(window as any).__ACTIVE_SHARE_ID__ && targets[0]) {
      (window as any).__ACTIVE_SHARE_ID__ = targets[0].id;
    }
}
