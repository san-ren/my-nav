// --- START OF FILE astro.config.mjs ---

import { defineConfig } from 'astro/config';
import keystatic from '@keystatic/astro';
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import markdoc from "@astrojs/markdoc";
import mdx from '@astrojs/mdx';
import remarkGfm from 'remark-gfm';
import sitemap from '@astrojs/sitemap';
import astroExpressiveCode from 'astro-expressive-code';

// 1. 智能判断逻辑 (最稳健的方式)
// 只要不是运行 "dev" 命令，我们就默认是在构建生产版本
const isDevCommand = process.argv.includes('dev');

// 2. 强制设置 Base 路径
// 本地开发用 '/'，生产打包强制用 '/my-nav'
const myBase = isDevCommand ? '/' : '/my-nav';
const mySite = 'https://san-ren.github.io';

// 3. 定义集成列表
const integrations = [
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
];

// 4. 动态加载开发环境专用功能
if (isDevCommand) {
  // 4.1 加载 Keystatic (仅本地)
  integrations.push(keystatic());

  // 4.2 🔥🔥 注入智能解析 API (关键修改) 🔥🔥
  // 这段逻辑会将 src/components/keystatic/smart-parse.ts 
  // 临时挂载到 http://localhost:4321/api/smart-parse
  integrations.push({
    name: 'dev-smart-parse-api',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        console.log('🚀 [Dev] 正在注入智能解析 API...');
        injectRoute({
          // 前端访问的 URL 路径 (保持不变)
          pattern: '/api/smart-parse',
          // 实际文件的物理路径 (放在现有的组件目录中)
          entrypoint: './src/components/keystatic/ToolboxField/smart-parse.ts',
          // 🔥🔥 核心修复：必须显式设置为 false，否则在 static 模式下会出错
          prerender: false 
        });
      },
    },
  });

  // 4.3 注入工具箱 API 路由
integrations.push({
  name: 'dev-toolbox-api',
  hooks: {
    'astro:config:setup': ({ injectRoute }) => {
      // GitHub 检测 API
      injectRoute({
        pattern: '/api/github-check',
        entrypoint: './src/components/keystatic/Toolbox/GithubChecker/api/index.ts',
        prerender: false 
      });
      // 链接检测 API
      injectRoute({
        pattern: '/api/link-check',
        entrypoint: './src/components/keystatic/Toolbox/LinkChecker/api/index.ts',
        prerender: false 
      });
      // 批量添加 API
      injectRoute({
        pattern: '/api/batch-add',
        entrypoint: './src/components/keystatic/Toolbox/BatchAdder/api/index.ts',
        prerender: false 
      });
    },
  },
});





}

export default defineConfig({
  site: mySite,
  base: myBase,
  
  // 生产环境 'always'，本地 'ignore'
  trailingSlash: isDevCommand ? 'ignore' : 'always', 
 
  output: 'static',

  // 确保没有 adapter，保证是纯静态构建
  // adapter: node(...), 

  integrations: integrations,

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
    server: {
      watch: {
        usePolling: true,
        interval: 1000,
      },
    }
  }
});