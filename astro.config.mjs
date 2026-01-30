import { defineConfig } from 'astro/config';
import keystatic from '@keystatic/astro';
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import node from "@astrojs/node"; 
import markdoc from "@astrojs/markdoc";
import mdx from '@astrojs/mdx';
import remarkGfm from 'remark-gfm';
import sitemap from '@astrojs/sitemap';
import astroExpressiveCode from 'astro-expressive-code';
import basicSsl from '@vitejs/plugin-basic-ssl';

// 1. 判断当前构建目标
const isGitHubPages = process.env.DEPLOY_TARGET === 'github';

// 2. 动态设置路径
// 注意：'/my-nav' 必须与你的 GitHub 仓库名称完全一致
const myBase = isGitHubPages ? '/my-nav' : '/';
const mySite = 'https://san-ren.github.io'; // 建议一直保留 site 配置，避免 sitemap 生成警告

export default defineConfig({
  // 3. 网站基础信息
  site: mySite,
  base: myBase,

  // 4. 构建模式：静态站点生成
  output: 'static',

  // 5. ✅ 关键修复：根据环境判断是否启用 Node 适配器
  // GitHub Pages 需要纯静态输出（直接在 dist 下生成 index.html）。
  // 启用 node 适配器会导致输出变成 dist/client/index.html，GitHub Pages 找不到入口从而 404。
  // 所以：如果是 GitHub Pages 构建，设为 undefined（禁用适配器）；否则使用 Node 适配器。
  adapter: isGitHubPages ? undefined : node({
    mode: 'standalone',
  }),

  // 6. 集成配置
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
        ui: {
            windowControlsDecoration: 'none', 
        },
        codeBackground: '#1e293b',
        codeForeground: '#e2e8f0',
        borderColor: '#334155',
        frames: {
            editorActiveTabBackground: '#1e293b',
            editorActiveTabForeground: '#e2e8f0',
            frameBoxShadowCssValue: 'none',
        }
      },
      defaultProps: {
        frame: 'code', 
      },
    }),

    tailwind(), 
    react(), 
    keystatic(), 
    markdoc(), 
    mdx({
      remarkPlugins: [remarkGfm],
    }), 
    sitemap()
  ],

  // 7. 开发服务器配置
  server: {
    host: true,
    port: 4321,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }
  },

  // 8. 开发者工具栏
  devToolbar: {
    enabled: false
  },

  // 9. Vite 配置
  vite: {
    plugins: [basicSsl()],
    server: {
      watch: {
        usePolling: true,
        interval: 1000,
      },
    }
  }
});