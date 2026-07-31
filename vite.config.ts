import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const base = process.env.GITHUB_ACTIONS ? '/3d-creator-hub/' : '/';

export default defineConfig({
  base,
  optimizeDeps: {
    exclude: ['manifold-3d'],
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        keycap: resolve(__dirname, 'keycap/index.html'),
        clicker: resolve(__dirname, 'clicker/index.html'),
        mascot: resolve(__dirname, 'mascot/index.html'),
      },
    },
  },
});
