/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  
  // 1. Theme 配置
  theme: {
    extend: {
      // (1) 颜色配置
      colors: {
        brand: {
          DEFAULT: 'rgb(var(--color-brand-rgb) / <alpha-value>)',
          50:  'rgb(var(--color-brand-rgb) / 0.05)',
          100: 'rgb(var(--color-brand-rgb) / 0.1)',
          200: 'rgb(var(--color-brand-rgb) / 0.2)',
          300: 'rgb(var(--color-brand-rgb) / 0.3)',
          400: 'rgb(var(--color-brand-rgb) / 0.6)',
          500: 'rgb(var(--color-brand-rgb) / 0.8)',
          600: 'rgb(var(--color-brand-rgb) / 1.0)',
          700: 'rgb(var(--color-brand-rgb) / 0.9)', 
          800: 'rgb(var(--color-brand-rgb) / 0.95)',
          900: 'rgb(var(--color-brand-rgb) / 1.0)',
        },
      },
      
      // (2) 布局配置
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
      },

      // 🔥 覆盖 Tailwind 内置字体类名，根治子组件私自使用 font-sans 等类名导致的覆盖问题
      fontFamily: {
        sans: ['var(--custom-font2-family)', 'var(--custom-font-family)', 'sans-serif'],
        body: ['var(--custom-font2-family)', 'var(--custom-font-family)', 'sans-serif'],
        heading: ['var(--custom-font2-family)', 'var(--custom-font-family)', 'sans-serif'],
      },

      // (3) Typography 配置
      typography: {
        DEFAULT: {
          css: {
            // 🔥 关键：禁用 prose 对代码块的默认样式
            'code::before': { content: '""' }, 
            'code::after': { content: '""' },
            'pre': false,    
            'code': false,   
            
            // 优化链接样式
            'a': {
              color: '#3182ce',
              '&:hover': {
                color: '#2c5282',
              },
            },
          },
        },
      }, // <-- typography 结束
    }, // <-- extend 结束
  }, // <-- theme 结束 (你的原代码这里少了这个括号！)

  // 2. 插件配置 (必须在 theme 外面)
  plugins: [
    require('@tailwindcss/typography'),
  ],
}; // <-- export default 结束