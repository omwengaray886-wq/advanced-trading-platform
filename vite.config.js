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
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'chart': ['chart.js', 'react-chartjs-2']
        }
      }
    }
  },
  ssr: {
    noExternal: ['react-chartjs-2', 'chart.js']
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
      },
      '/api/sentiment': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/api/ai': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
