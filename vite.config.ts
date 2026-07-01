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
  // Pre-bundle three + its addon entry points up front. Without this, the lazy
  // /chibi3d route's deep imports (GLTFLoader) get discovered mid-session and
  // trigger Vite to re-optimize + full-reload, which churns dev-server memory/CPU.
  optimizeDeps: {
    include: [
      'three',
      'three/examples/jsm/loaders/GLTFLoader.js',
      'three/examples/jsm/controls/OrbitControls.js'
    ]
  },
  base: '/',
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff'
    },
    proxy: {
      '/api/inventory': {
        target: 'http://localhost:5001',
        rewrite: (path: string) => path.replace(/^\/api/, '')
      },
      '/api/bond100': {
        target: 'http://localhost:5002',
        rewrite: (path: string) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo: PreRenderedAsset) => {
          // Classify by the asset's file name; `source` is the file CONTENT and
          // using it produced content-derived directory names for CSS chunks
          // (fatal ENAMETOOLONG once a chunk's first rule got long enough).
          const fileName = assetInfo.names?.[0] ?? 'asset';
          const extType = fileName.split('.').pop() ?? 'unknown';
          if (/^(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(extType)) {
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
