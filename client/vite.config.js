import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fitforge_lime.png', 'fit_forge_logo.png'],
      workbox: {
        importScripts: ['/push-sw.js'],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      manifest: {
        name: 'FitForge',
        short_name: 'FitForge',
        description: 'FitForge is a fitness app that helps you get fit with your friends and family.',
        theme_color: '#080808',
        background_color: '#080808',
        display: 'standalone',
        icons: [
          {
            src: '/fitforge_lime.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/fitforge_lime.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/api/fatsecret/token': {
        target: 'https://oauth.fatsecret.com/connect/token',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fatsecret\/token/, '')
      },
      '/api/fatsecret/rest': {
        target: 'https://platform.fatsecret.com/rest/server.api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fatsecret\/rest/, '')
      }
    }
  }
})
