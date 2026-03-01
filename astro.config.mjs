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

// 1. 智能判断逻辑
const isDevCommand = process.argv.includes('dev');

// 2. 强制设置 Base 路径
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

  // 4.2 注入智能解析 API (仅开发环境)
  integrations.push({
    name: 'dev-smart-parse-api',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        console.log('🚀 [Dev] 正在注入智能解析 API...');
        injectRoute({
          pattern: '/api/smart-parse',
          entrypoint: './src/components/keystatic/ToolboxField/smart-parse.ts',
          prerender: false 
        });
      },
    },
  });

  // 4.3 注入工具箱 API 路由 (仅开发环境)
  integrations.push({
    name: 'dev-toolbox-api',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        injectRoute({
          pattern: '/api/github-check',
          entrypoint: './src/components/keystatic/Toolbox/GithubChecker/api/index.ts',
          prerender: false 
        });
        injectRoute({
          pattern: '/api/link-check',
          entrypoint: './src/components/keystatic/Toolbox/LinkChecker/api/index.ts',
          prerender: false 
        });
        injectRoute({
          pattern: '/api/batch-add',
          entrypoint: './src/components/keystatic/Toolbox/BatchAdder/api/index.ts',
          prerender: false 
        });
        injectRoute({
        pattern: '/api/resource-mover',
        entrypoint: './src/components/keystatic/Toolbox/ResourceMover/api/index.ts',
        prerender: false 
        });
      },
    },
  });
}

// 5. Vite 构建优化配置
const viteConfig = {
  server: {
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
  build: {
    rollupOptions: {
      output: {
        // 手动分割代码块，优化加载性能
        manualChunks: (id) => {
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('lucide-react')) {
            return 'lucide-icons';
          }
          if (id.includes('fuse.js')) {
            return 'fuse-search';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
};

export default defineConfig({
  site: mySite,
  base: myBase,
  trailingSlash: isDevCommand ? 'ignore' : 'always', 
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
  compressHTML: true,
  vite: viteConfig
});
