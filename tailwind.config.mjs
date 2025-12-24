/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      // 1. 颜色配置
      colors: {
        brand: {
          50: 'rgb(var(--color-primary-light) / <alpha-value>)',
          100: 'rgb(var(--color-primary-hover) / <alpha-value>)',
          600: 'rgb(var(--color-primary) / <alpha-value>)',
        },
        sidebar: {
          hover: 'rgb(var(--sidebar-hover-bg) / <alpha-value>)',
          'sub-hover': 'rgb(var(--sidebar-sub-hover-bg) / <alpha-value>)',
        }
      },
      // 2. 间距配置
      spacing: {
        'sidebar': 'var(--sidebar-width)', 
      },
      // 3. 圆角配置
      borderRadius: {
        'card': 'var(--card-radius)',
      }, // 🔴 修复点：这里原来少了一个 }, 来闭合 borderRadius 对象

      // 4. 字体大小配置 (它必须是 extend 的直接子属性)
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