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
const myBase = isGitHubPages ? '/my-nav' : '/';
const mySite = isGitHubPages ? 'https://san-ren.github.io' : undefined;

export default defineConfig({
  // 3. 网站基础信息
  site: mySite,
  base: myBase,

  // 4. 构建模式：静态站点生成
  output: 'static',

  // 5. ❌ 适配器冲突修正：
  // 如果是 output: 'static' (GitHub Pages)，不需要 node adapter。
  // 只有当你 output: 'server' 时才需要它。所以我先注释掉了。
  // adapter: node({
  //   mode: 'standalone',
  // }),

  // 6. 集成配置
  integrations: [
    // Expressive Code 必须在 Tailwind 之前
    astroExpressiveCode({
      // 1. 设置更清晰的主题 (推荐 dracula 或 github-dark)
      themes: ['dracula', 'github-light'],
      themeCssSelector: (theme) => `html.${theme.name === 'dracula' ? 'dark' : 'light'}`,
      
      // 2. 强制一直显示顶栏 (这样复制按钮位置就固定了)
      frames: {
        showCopyToClipboardButton: true, // 开启复制
        showFileName: false, // 如果你不想显示文件名，可以关掉
        // 🔥 关键：强制渲染编辑器窗口框架 (即使没有文件名)
        // 默认是 'auto' (只有多行或有文件名才显示)，改成 'always' 哪怕一行代码也会有顶栏
        frameStyle: 'box', // 或者保持默认，主要靠下面的配置
      },
      
      styleOverrides: {
        // 3. 去掉 Mac 风格的红黄绿点
        // 将按钮颜色设为透明，或者直接隐藏
        ui: {
            // 这会隐藏那三个点
            windowControlsDecoration: 'none', 
        },
        
        // 4. 自定义颜色 (解决"看不清"的问题)
        // 强制设置代码背景色和字体颜色，覆盖主题默认值
        codeBackground: '#1e293b', // 深蓝灰色 (Slate-800)
        codeForeground: '#e2e8f0', // 浅灰色文字
        borderColor: '#334155',    // 边框颜色
        
        // 顶栏样式
        frames: {
            editorActiveTabBackground: '#1e293b', // 顶栏背景与代码一致
            editorActiveTabForeground: '#e2e8f0',
            frameBoxShadowCssValue: 'none', // 去掉阴影，看起来更扁平
        }
      },
      
      // 补充配置：确保单行代码也有顶栏
      // Expressive Code 默认行为：如果代码很少，它可能就不渲染 Frame
      // 我们可以通过默认属性强制它
      defaultProps: {
        // 让所有代码块默认都带有一个空的 title，从而触发顶栏渲染
        // 或者使用 `frame="code"` 属性
        frame: 'code', 
      },
    }),

    tailwind(), 
    react(), 
    keystatic(), 
    markdoc(), 
    mdx({
      // 这里的写法是正确的
      remarkPlugins: [remarkGfm],
    }), 
    
    sitemap()
  ],

  // 7. ✅ 修正开发服务器配置 (原 devOptions 错误)
  // Astro 将开发服务器配置统一放在这里
  server: {
    host: true,      // 监听所有 IP (0.0.0.0)，允许局域网访问
    port: 4321,      // 端口
    
    // 允许跨域，解决手机访问 API 问题
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }
  },

  // 8. 开发者工具栏 (可选)
  devToolbar: {
    enabled: false
  },

  // 9. Vite 底层配置
  vite: {
    plugins: [basicSsl()],
    server: {
      // 解决某些系统下文件修改不刷新的问题
      watch: {
        usePolling: true,
        interval: 1000,
      },
      // 注意：allowedHosts 是 Vite 5+ 的新特性，如果报错请删除下面这一行
      // 或者是 allowedHosts: ['.ngrok-free.app'] 这种数组形式
      // 如果没有特定的 Host 报错，这行可以不写
      // allowedHosts: true, 
    }
  }
});