import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";

export default defineConfig({
  integrations: [tailwind(), react()], // 里面只有这两个
  site: 'https://san-ren.github.io',
  base: '/my-nav',
});