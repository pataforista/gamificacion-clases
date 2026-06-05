import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'MedClass Pro: Gamificación Médica',
        short_name: 'MedClass Pro',
        description: 'Herramienta de gamificación para clases con dados 3D y RPG',
        theme_color: '#060608',
        background_color: '#060608',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  build: {
    // The dedicated "Dado" tab bundles rpg-dice-roller + mathjs (~635kB). That
    // chunk is lazy-loaded, so a larger size there is expected and acceptable.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Split heavy libraries into separate, cacheable vendor chunks so the
        // initial app code and third-party code can be downloaded in parallel
        // and cached independently across deploys.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // Split libraries shared across the initial render into stable,
          // separately-cacheable chunks. Everything else (e.g. the heavy
          // rpg-dice-roller + mathjs, used only by the lazy "Dado" tab) is left
          // for Rollup to keep inside its on-demand async chunk.
          if (id.includes('gsap')) return 'vendor-gsap';
          if (id.includes('motion') || id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'vendor-react';
        },
      },
    },
  },
})
