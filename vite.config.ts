import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Rutas relativas: la app funciona igual en la raíz de un dominio o en una subcarpeta (GitHub Pages).
  base: './',
  plugins: [
    react(),
    VitePWA({
      // El service worker se actualiza solo cuando hay una versión nueva publicada.
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      // la tipografía (woff2) también se guarda para que la app se vea igual sin internet
      workbox: { globPatterns: ['**/*.{js,css,html,woff2}'] },
      manifest: {
        name: 'Banco de horas',
        short_name: 'Banco de horas',
        description: 'Horas que se deben y se pagan, y horas nocturnas y dominicales por quincena.',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#163300',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
