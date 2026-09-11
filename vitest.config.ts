import { defineConfig } from 'vitest/config';
import path from 'node:path';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    // Pure calculations run in Node; component specs opt into jsdom.
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
