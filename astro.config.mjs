// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind'; 

// https://astro.build/config
export default defineConfig({
  integrations: [react(), tailwind()],
  prefetch: {
    defaultStrategy: 'hover', // o 'tap' para móviles
    prefetchAll: true // precarga todos los enlaces
  },
});
