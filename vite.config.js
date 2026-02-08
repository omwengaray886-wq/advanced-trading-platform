import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react-chartjs-2', 'chart.js']
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  server: {
    proxy: {
      '/api/binance': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/api/coingecko': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/api/news': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
