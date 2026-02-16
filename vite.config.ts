import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import type { PreRenderedAsset } from 'rollup'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  base: '/',
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff'
    }
  },
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo: PreRenderedAsset) => {
          const fileName = typeof assetInfo.source === 'string' ? assetInfo.source : 'asset';
          const extType = fileName.split('.').at(1) ?? 'unknown';
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `assets/img/[name]-[hash][extname]`;
          }
          return `assets/${extType}/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
  }
})
