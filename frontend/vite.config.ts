import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: 5173,
    // Mismo proxy que Nginx: /api/* -> backend (lo usa "arrastrar al escritorio").
    proxy: { '/api': { target: process.env.VITE_API_URL ?? 'http://localhost:3000', changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') } },
  },
  preview: { port: 4173 },
})
