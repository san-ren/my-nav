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

// 1. 环境判断
const isGitHubPages = process.env.DEPLOY_TARGET === 'github';
const myBase = isGitHubPages ? '/my-nav' : '/';
const mySite = 'https://san-ren.github.io';

export default defineConfig({
  site: mySite,
  base: myBase,
  output: 'static',

  adapter: node({
    mode: 'standalone',
  }),

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
    keystatic(), 
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
    plugins: [basicSsl()],
    server: {
      watch: {
        usePolling: true,
        interval: 1000,
      },
    }
  }
});