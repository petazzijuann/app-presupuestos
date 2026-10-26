import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Build 100% estático -> carpeta `dist` (output de Cloudflare Pages).
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-32.png', 'apple-touch-icon.png', 'brand/*.png'],
      workbox: {
        // woff2 incluido para que las tipografías también funcionen offline.
        globPatterns: ['**/*.{js,css,html,png,ico,webmanifest,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'Presupuestos · Futurislabs',
        short_name: 'Presupuestos',
        description:
          'Presupuestos profesionales para tu oficio: catálogo de precios, PDF con tu logo y envío por WhatsApp. Funciona sin internet.',
        lang: 'es',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#080c14',
        theme_color: '#b2510b',
        categories: ['business', 'productivity', 'finance'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  build: { outDir: 'dist', sourcemap: false },
})
