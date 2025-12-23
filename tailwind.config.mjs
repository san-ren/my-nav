/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      // 1. 颜色配置 (找回你的 Logo 颜色)
      colors: {
        brand: {
          50: 'rgb(var(--color-primary-light) / <alpha-value>)',
          100: 'rgb(var(--color-primary-hover) / <alpha-value>)',
          600: 'rgb(var(--color-primary) / <alpha-value>)', // 👈 Logo 背景全靠它
        },
        sidebar: {
          hover: 'rgb(var(--sidebar-hover-bg) / <alpha-value>)',
          'sub-hover': 'rgb(var(--sidebar-sub-hover-bg) / <alpha-value>)',
        }
      },
      // 2. 间距配置 (保持侧边栏宽度正常)
      spacing: {
        'sidebar': 'var(--sidebar-width)', 
      },
      // 3. 圆角配置
      borderRadius: {
        'card': 'var(--card-radius)',
      // ✅ 新增：字体大小配置
      fontSize: {
        'sidebar-link': 'var(--sidebar-font-link)',
        'sidebar-group': 'var(--sidebar-font-group)',
        'sidebar-cat': 'var(--sidebar-font-cat)',
        'sidebar-tab': 'var(--sidebar-font-tab)',
      }
    },
  },
  plugins: [],
}