import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Precache the app shell (JS/CSS/HTML) so the app itself opens
      // with zero connectivity. Actual business data (products, sales,
      // reports, etc.) is cached separately in IndexedDB by src/lib/api.ts
      // — deliberately NOT handled here, since that needs structured
      // per-request logic (offline queueing, idempotency), not a blanket
      // HTTP cache.
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Never let the service worker intercept API calls — those go
        // through axios in src/lib/api.ts, which has its own offline
        // fallback (IndexedDB cache / mutation queue) and needs to see
        // real network errors to trigger it.
        navigateFallbackDenylist: [/^\/api\//],
      },
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Sochebar',
        short_name: 'Sochebar',
        description: 'Bar management system',
        theme_color: '#1a1815',
        background_color: '#1a1815',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
