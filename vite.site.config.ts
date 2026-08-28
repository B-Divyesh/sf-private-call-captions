import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: 'site',
  publicDir: '../public',
  build: {
    outDir: '../dist/site', emptyOutDir: true, target: 'es2022',
    rollupOptions: { input: {
      main: resolve(__dirname, 'site/index.html'),
      demo: resolve(__dirname, 'site/demo/index.html'),
      privacy: resolve(__dirname, 'site/privacy/index.html'),
      terms: resolve(__dirname, 'site/terms/index.html'),
      notFound: resolve(__dirname, 'site/404.html'),
    } },
  },
});
