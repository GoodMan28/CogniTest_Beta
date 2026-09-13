import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // Must come before '/api' below — Vite matches proxy entries in
      // declaration order, and '/api' would otherwise swallow every demo
      // request and forward it to the legacy Express backend instead.
      '/api/v2/demo': {
        target: 'http://localhost:8000',
        changeOrigin: false,
      },
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})
