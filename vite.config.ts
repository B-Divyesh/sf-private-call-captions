import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2022', rollupOptions: { input: { main: 'index.html', caption: 'caption.html', privacy: 'privacy/index.html', terms: 'terms/index.html' } } },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] }
});
