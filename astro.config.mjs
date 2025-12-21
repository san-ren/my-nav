import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import keystatic from '@keystatic/astro';

export default defineConfig({
  integrations: [tailwind(), react(), keystatic()],
  
  // 1. 你的 GitHub Pages 完整域名
  site: 'https://san-ren.github.io',
  
  // 2. 关键！必须加上你的仓库名作为后缀
  base: '/my-nav', 
});