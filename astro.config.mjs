import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";

export default defineConfig({
  integrations: [tailwind(), react()],
  site: 'https://san-ren.github.io',
  base: '/my-nav',
  devOptions: {
    host: '0.0.0.0',
    port: 4321,
  },
  // 这些配置项应该在顶层，而不是在devOptions内部
  devToolbar: {
    enabled: false
  },
  vite: {
    server: {
      watch: {
        usePolling: true,
        interval: 1000,
      }
    }
  }
});