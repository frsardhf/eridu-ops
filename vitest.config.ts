import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    // Pure-function tests only (lib/utils); no DOM environment needed.
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
