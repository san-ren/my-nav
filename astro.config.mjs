import { defineConfig } from 'astro/config';

import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
// ❌ 移除 Node Adapter，因为 GitHub Pages 是纯静态托管，不能运行 Node 服务
// import node from "@astrojs/node"; 
import markdoc from "@astrojs/markdoc";
import mdx from '@astrojs/mdx';
import remarkGfm from 'remark-gfm';
import sitemap from '@astrojs/sitemap';
import astroExpressiveCode from 'astro-expressive-code';
import basicSsl from '@vitejs/plugin-basic-ssl';

// 1. 环境判断
const isGitHubPages = process.env.DEPLOY_TARGET === 'github';
const myBase = isGitHubPages ? '/my-nav' : '/';
const mySite = 'https://san-ren.github.io';

export default defineConfig({
  site: mySite,
  base: myBase,
  
  // ✅ 强制静态输出，适配 GitHub Pages
  output: 'static',

  // ❌ 移除 adapter，让 Astro 默认生成纯 HTML/CSS/JS 文件
  // adapter: node({ mode: 'standalone' }),

  integrations: [
    astroExpressiveCode({
      themes: ['dracula', 'github-light'],
      themeCssSelector: (theme) => `html.${theme.name === 'dracula' ? 'dark' : 'light'}`,
      frames: {
        showCopyToClipboardButton: true,
        showFileName: false,
        frameStyle: 'box',
      },
      styleOverrides: {
        ui: { windowControlsDecoration: 'none' },
        codeBackground: '#1e293b',
        codeForeground: '#e2e8f0',
        borderColor: '#334155',
        frames: {
            editorActiveTabBackground: '#1e293b',
            editorActiveTabForeground: '#e2e8f0',
            frameBoxShadowCssValue: 'none',
        }
      },
      defaultProps: { frame: 'code' },
    }),
    tailwind(), 
    react(), 

    markdoc(), 
    mdx({ remarkPlugins: [remarkGfm] }), 
    sitemap()
  ],

  server: {
    host: true,
    port: 4321,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }
  },

  devToolbar: { enabled: false },

  vite: {
    // ✅ 保持 basicSsl 用于本地模拟 GitHub 模式的 HTTPS 环境
    plugins: [basicSsl()],
    server: {
      watch: {
        usePolling: true,
        interval: 1000,
      },
    }
  }
});