import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@models': resolve(__dirname, 'src/shared/models'),
      '@storage': resolve(__dirname, 'src/shared/storage'),
      '@pipeline': resolve(__dirname, 'src/shared/pipeline'),
      '@schemas': resolve(__dirname, 'src/shared/schemas'),
      '@utils': resolve(__dirname, 'src/shared/utils'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    globals: false,
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/shared/**/*.ts'],
      exclude: ['src/shared/**/*.test.ts'],
    },
  },
});
