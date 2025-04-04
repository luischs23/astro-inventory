// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind'; 
import vercel from '@astrojs/vercel'; 
import pwa from "@vite-pwa/astro";

// https://astro.build/config
export default defineConfig({
  integrations: [
    pwa({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Astro Inventory',
        short_name: 'Inventory',
        description: 'Gestor de inventario con Astro',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/logo_any.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo_any.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/logo_maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    }),
  
    react(), tailwind()],
  prefetch: {
    defaultStrategy: 'hover', // o 'tap' para móviles
    prefetchAll: true // precarga todos los enlaces
  },
  output: 'server', // Esto es importante para SSR
  adapter: vercel(),
});
