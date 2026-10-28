import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const paquete = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// https://vite.dev/config/
export default defineConfig({
  // La versión sale de package.json y la fecha es la de la compilación (se muestra en "Acerca de")
  define: {
    __VERSION_APP__: JSON.stringify(paquete.version),
    __COMPILADO__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  // Rutas relativas: la app funciona igual en la raíz de un dominio o en una subcarpeta (GitHub Pages).
  base: './',
  plugins: [
    react(),
    VitePWA({
      // El service worker se actualiza solo cuando hay una versión nueva publicada.
      registerType: 'autoUpdate',
      workbox: {
        // Firebase Hosting sirve su propio manejador de acceso en /__/auth/handler (y /__/firebase/init.json).
        // Si el service worker las respondiera con index.html, la ventana de Google quedaría en blanco.
        navigateFallbackDenylist: [/^\/__\//],
      },
      includeAssets: ['apple-touch-icon.png', 'marca/at-monograma-claro.svg'],
      manifest: {
        name: 'Arena',
        short_name: 'Arena',
        description: 'Horas que se deben y se pagan, y horas nocturnas y dominicales por quincena.',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#B9D2D2',
        theme_color: '#B9D2D2',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
