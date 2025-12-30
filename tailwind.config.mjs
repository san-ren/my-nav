/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      // 1. 颜色配置：核心修复点
      colors: {
        brand: {
          // 让 Tailwind 使用 CSS 变量，并支持 opacity (<alpha-value>)
          DEFAULT: 'rgb(var(--color-brand-rgb) / <alpha-value>)',
          
          // 自动生成色阶 (不用 hex，全部用透明度模拟深浅，实现“无限制颜色”)
          50:  'rgb(var(--color-brand-rgb) / 0.05)',
          100: 'rgb(var(--color-brand-rgb) / 0.1)',
          200: 'rgb(var(--color-brand-rgb) / 0.2)',
          300: 'rgb(var(--color-brand-rgb) / 0.3)',
          400: 'rgb(var(--color-brand-rgb) / 0.6)',
          500: 'rgb(var(--color-brand-rgb) / 0.8)',
          600: 'rgb(var(--color-brand-rgb) / 1.0)', // 主色
          700: 'rgb(var(--color-brand-rgb) / 0.9)', 
          800: 'rgb(var(--color-brand-rgb) / 0.95)',
          900: 'rgb(var(--color-brand-rgb) / 1.0)',
        },
      },
      
      // 2. 布局配置
      spacing: {
        'sidebar': 'var(--sidebar-width)',
      },
      borderRadius: {
        'card': 'var(--card-radius)',
      },
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