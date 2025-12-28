import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";

// 1. 判断当前构建目标
// 如果运行的是 npm run build:gh，环境变量就是 github
const isGitHubPages = process.env.DEPLOY_TARGET === 'github';

// 2. 动态设置路径
// GitHub Pages 用 /my-nav，其他平台（如 PinMe/本地）用 /
const myBase = isGitHubPages ? '/my-nav' : '/';
const mySite = isGitHubPages ? 'https://san-ren.github.io' : undefined;

export default defineConfig({
  integrations: [tailwind(), react()],
  site: mySite,
  base: myBase, // ✅ 这里变成了动态的
  
  // 保留你原本的开发配置
  devOptions: {
    host: '0.0.0.0',
    port: 4321,
  },
  devToolbar: {
    enabled: false
  },
  vite: {
    server: {
      watch: {
        usePolling: true,
        interval: 1000,
      }
    }
  }
});