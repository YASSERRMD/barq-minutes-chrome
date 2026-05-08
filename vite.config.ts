import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { copyFileSync, mkdirSync, existsSync, cpSync } from 'node:fs';

const root = resolve(__dirname);

function copyExtensionAssets() {
  return {
    name: 'copy-extension-assets',
    closeBundle() {
      const dist = resolve(root, 'dist');
      if (!existsSync(dist)) mkdirSync(dist, { recursive: true });
      copyFileSync(resolve(root, 'manifest.json'), resolve(dist, 'manifest.json'));
      const iconsSrc = resolve(root, 'public', 'icons');
      const iconsDst = resolve(dist, 'public', 'icons');
      if (existsSync(iconsSrc)) {
        mkdirSync(iconsDst, { recursive: true });
        cpSync(iconsSrc, iconsDst, { recursive: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyExtensionAssets()],
  resolve: {
    alias: {
      '@shared': resolve(root, 'src/shared'),
      '@models': resolve(root, 'src/shared/models'),
      '@storage': resolve(root, 'src/shared/storage'),
      '@pipeline': resolve(root, 'src/shared/pipeline'),
      '@schemas': resolve(root, 'src/shared/schemas'),
      '@utils': resolve(root, 'src/shared/utils'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(root, 'index.html'),
        popup: resolve(root, 'src/popup/popup.html'),
        options: resolve(root, 'src/options/options.html'),
        offscreen: resolve(root, 'src/offscreen/offscreen.html'),
        serviceWorker: resolve(root, 'src/background/serviceWorker.ts'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'serviceWorker') return 'src/background/serviceWorker.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  worker: {
    format: 'es',
  },
});
