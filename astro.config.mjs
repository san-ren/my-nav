// --- START OF FILE astro.config.mjs ---

import { defineConfig } from 'astro/config';
import keystatic from '@keystatic/astro';
import node from '@astrojs/node';
import react from "@astrojs/react";
import markdoc from "@astrojs/markdoc";
import mdx from '@astrojs/mdx';
import remarkGfm from 'remark-gfm';
import sitemap from '@astrojs/sitemap';
import astroExpressiveCode from 'astro-expressive-code';
import tailwindcss from '@tailwindcss/vite';

// 1. 部署目标（由 package.json 的 cross-env DEPLOY_TARGET= 注入）
//    github (默认) : 纯静态 + base=/my-nav  → GitHub Pages。无法使用在线后台（GH Pages 不能跑 Node）。
//    root          : 纯静态 + base=/        → 自有域名根路径。
//    admin         : 接 @astrojs/node 适配器，只有 /api/keystatic 走 SSR → 部署到 Node 宿主后可用在线后台。
const deployTarget = process.env.DEPLOY_TARGET || 'github';
const isAdminTarget = deployTarget === 'admin';
const isDevCommand = process.argv.includes('dev');

// 2. base / site
const myBase = (isDevCommand || deployTarget !== 'github') ? '/' : '/my-nav';
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
  react(), 
  markdoc(), 
  mdx({ remarkPlugins: [remarkGfm] }), 
  sitemap()
];

// 4. admin 目标：挂上 Node 适配器，并把 Keystatic 的 SSR API 路由放进生产构建
if (isAdminTarget) {
  integrations.push({
    // 注意：这里故意不注册 keystatic() 全量集成，因为它会注入 /keystatic/[...params]，
    // 与本项目自定义的 src/pages/keystatic/[...params].astro 路由冲突。
    // 项目自己已有 SPA 外壳页面（含删除二次确认等增强），所以只需补上后端 API 即可。
    name: 'keystatic-admin-api',
    hooks: {
      'astro:config:setup': ({ injectRoute, updateConfig }) => {
        console.log('🔑 [Admin] 正在注入 Keystatic API 路由 (SSR)...');
        // keystatic() 内置的虚拟模块provide，缺了它 internal/keystatic-api.js 无法解析配置
        updateConfig({
          vite: {
            plugins: [{
              name: 'keystatic-virtual-config',
              resolveId(id) {
                if (id === 'virtual:keystatic-config') {
                  return this.resolve('./keystatic.config', './a');
                }
                return null;
              },
            }],
            optimizeDeps: { entries: ['keystatic.config.*', '.astro/keystatic-imports.js'] },
          },
        });
        injectRoute({
          pattern: '/api/keystatic/[...params]',
          entrypoint: '@keystatic/astro/internal/keystatic-api.js',
          prerender: false,
        });
      },
    },
  });
}

// 5. 动态加载开发环境专用功能 (Toolbox 依赖本地文件系统，因此只在 dev 下可用)
if (isDevCommand) {
  // 5.0 在启动信息里补上后台地址，省得每次手敲 /keystatic
  integrations.push({
    name: 'dev-url-hints',
    hooks: {
      'astro:server:start': ({ address }) => {
        const port = address?.port ?? 4321;
        // 用 setTimeout 而不是 logger：logger 会把多行 message 折叠掉，
        // 而延迟一个 tick 能保证这块提示排在 Astro 自己那组 URL 之后。
        setTimeout(() => {
          const rows = [
            ['📝 Keystatic 后台  (本地 local 模式)', `http://localhost:${port}/keystatic`],
            ['🧰 Toolbox 工具箱 (仅 dev 可用)', `http://localhost:${port}/toolbox`],
          ];
          const width = Math.max(...rows.map(([l]) => [...l].reduce((n, c) => n + (c.charCodeAt(0) < 128 ? 1 : 2), 0)));
          console.log('');
          for (const [label, url] of rows) {
            const w = [...label].reduce((n, c) => n + (c.charCodeAt(0) < 128 ? 1 : 2), 0);
            console.log(`  ┃ ${label}${' '.repeat(width - w)}  ${url}`);
          }
          console.log('');
        }, 0);
      },
    },
  });

  // 5.1 加载 Keystatic (仅本地)
  integrations.push(keystatic());

  // 5.2 注入智能解析 API (仅开发环境)
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

  // 5.3 注入工具箱 API 路由 (仅开发环境)
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

// 6. Vite 构建优化配置
const viteConfig = {
  plugins: [tailwindcss()],
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
  // admin 目标下才挂适配器（必须放在这里，放进 integrations 里 Astro 识别不到）
  adapter: isAdminTarget ? node({ mode: 'standalone' }) : undefined,
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
