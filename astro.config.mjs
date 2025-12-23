import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";

export default defineConfig({
  integrations: [tailwind(), react()], // 里面只有这两个
  site: 'https://san-ren.github.io',
  base: '/my-nav',
  // 添加这段配置来关闭底部工具栏
  devToolbar: {
    enabled: false
  },
    vite: {
    server: {
      watch: {
        usePolling: true,   // 强制使用轮询机制，解决 Windows 文件系统通知丢失的问题
        interval: 1000,     // 每 1000 毫秒检查一次变动（嫌慢可以改成 500）
      }
    }
  }
});