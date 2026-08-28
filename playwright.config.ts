import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser', timeout: 30_000, fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:4173', browserName: 'chromium', viewport: { width: 1280, height: 900 } },
  webServer: { command: 'npm run build:site && npx vite preview --config vite.site.config.ts --host 127.0.0.1 --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
});
