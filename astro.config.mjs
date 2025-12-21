import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  // 关键在这里！必须把 tailwind() 和 react() 放进去
  integrations: [
    tailwind(), 
    react()
  ],
});