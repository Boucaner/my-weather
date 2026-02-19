import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'My Weather',
        short_name: 'My Weather',
        description: 'Life-first weather intelligence',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
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
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            // Cache weather API calls for 15 minutes
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather-api',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 900 // 15 min
              },
              networkTimeoutSeconds: 5
            }
          },
          {
            // Cache geocoding calls for 30 days
            urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'geocode-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 2592000 // 30 days
              }
            }
          },
          {
            // Cache NWS alerts for 5 minutes
            urlPattern: /^https:\/\/api\.weather\.gov\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'nws-alerts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 300 // 5 min
              },
              networkTimeoutSeconds: 5
            }
          },
          {
            // Cache map tiles
            urlPattern: /^https:\/\/.*basemaps\.cartocdn\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 86400 // 1 day
              }
            }
          },
          {
            // Cache radar tiles briefly
            urlPattern: /^https:\/\/tilecache\.rainviewer\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'radar-tiles',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 600 // 10 min
              }
            }
          }
        ]
      }
    })
  ]
});
