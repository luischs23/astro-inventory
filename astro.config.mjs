// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind'; 
import vercel from '@astrojs/vercel'; 

// https://astro.build/config
export default defineConfig({
  integrations: [react(), tailwind()],
  prefetch: {
    defaultStrategy: 'hover', // o 'tap' para móviles
    prefetchAll: true // precarga todos los enlaces
  },
  output: 'server', // Esto es importante para SSR
  adapter: vercel(),
});
