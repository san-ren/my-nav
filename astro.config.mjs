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
// 这样无论 GitHub Actions 里的环境变量有没有生效，都能保证路径正确
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

// 4. 动态加载 Keystatic
// 只在本地开发 (npm run dev) 时加载。
// 生产环境不加载，强制 Keystatic 使用 GitHub Mode (Client-side)。
if (isDevCommand) {
  integrations.push(keystatic());
}

export default defineConfig({
  site: mySite,
  base: myBase,
  
  // 生产环境 'always' (生成文件夹结构)，本地 'ignore' (避免 API 冲突)
  trailingSlash: isDevCommand ? 'ignore' : 'always', 
 
  output: 'static',

  // 彻底移除 adapter，确保是纯静态
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