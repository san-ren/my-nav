import { defineConfig } from 'astro/config';
import keystatic from '@keystatic/astro';
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import markdoc from "@astrojs/markdoc";
import mdx from '@astrojs/mdx';
import remarkGfm from 'remark-gfm';
import sitemap from '@astrojs/sitemap';
import astroExpressiveCode from 'astro-expressive-code';

// 1. 智能判断当前环境
const isDevCommand = process.argv.includes('dev');
const isGitHubPages = process.env.DEPLOY_TARGET === 'github';

// 2. 动态 Base 路径
const myBase = isGitHubPages ? '/my-nav' : '/';
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

// 4. 动态加载 Keystatic (本地开发专用)
if (isDevCommand) {
  integrations.push(keystatic());
}

export default defineConfig({
  site: mySite,
  base: myBase,
  
  // ✅ 5. 关键修改：trailingSlash 也需要动态判断！
  // - 线上 (GitHub Pages): 'always' -> 生成 /folder/index.html 结构，必须有斜杠
  // - 本地 (Dev): 'ignore' -> 不强制加斜杠，防止破坏 Keystatic 的 API 请求
  trailingSlash: isGitHubPages ? 'always' : 'ignore', 
 
  output: 'static',

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