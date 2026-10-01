/**
 * 主题配置的导出 / 导入（含背景图的 IndexedDB 读写）
 *
 * 由 theme-logic.js 的「J. 导入导出逻辑」整段抽出。
 */
import { base64ToBlob, blobToBase64, getImage, removeImage, saveImage } from './storage.js';

export function setupBackupSection() {
  // --- J. 导入导出逻辑 ---
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.onclick = async () => {
      const config = {
        theme: localStorage.getItem('theme'),
        brandColor: localStorage.getItem('brand-color'),
        bgBlur: localStorage.getItem('bg-blur'),
        siteAnim: localStorage.getItem('site-anim'),
        fontFamily: localStorage.getItem('site-font-family'),
        fontName: localStorage.getItem('site-font-name'),
        font2Family: localStorage.getItem('site-font2-family'),
        font2Name: localStorage.getItem('site-font2-name'),
        fontSize: localStorage.getItem('site-font-size'),
        fontWeight: localStorage.getItem('site-font-weight'),
        bgImage: null
      };

      try {
        const blob = await getImage();
        if (blob) {
          config.bgImage = await blobToBase64(blob);
        }
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config));
        const dlNode = document.createElement('a');
        dlNode.setAttribute("href", dataStr);
        dlNode.setAttribute("download", "my-nav-config.json");
        document.body.appendChild(dlNode);
        dlNode.click();
        dlNode.remove();
      } catch (e) {
        alert('导出失败: ' + e.message);
      }
    };
  }

  const importInput = document.getElementById('import-config');
  if (importInput) {
    importInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const config = JSON.parse(event.target.result);
          
          if (config.theme) localStorage.setItem('theme', config.theme);
          if (config.brandColor) localStorage.setItem('brand-color', config.brandColor);
          if (config.bgBlur) localStorage.setItem('bg-blur', config.bgBlur);
          if (config.siteAnim) localStorage.setItem('site-anim', config.siteAnim);
          if (config.fontFamily) localStorage.setItem('site-font-family', config.fontFamily);
          if (config.fontName) localStorage.setItem('site-font-name', config.fontName);
          if (config.font2Family) localStorage.setItem('site-font2-family', config.font2Family);
          if (config.font2Name) localStorage.setItem('site-font2-name', config.font2Name);
          if (config.fontSize) localStorage.setItem('site-font-size', config.fontSize);
          if (config.fontWeight) localStorage.setItem('site-font-weight', config.fontWeight);

          if (config.bgImage) {
            const blob = await base64ToBlob(config.bgImage);
            await saveImage(blob);
          } else {
            // 如果配置文件里没有背景，是否要移除当前的？原逻辑是移除
            await removeImage();
          }

          alert('导入成功，即将刷新');
          location.reload();
        } catch (err) {
          alert('文件格式错误');
          console.error(err);
        }
      };
      reader.readAsText(file);
    };
  }
}
