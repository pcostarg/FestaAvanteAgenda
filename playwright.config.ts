import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*playwright-.*\.spec\.ts/,
  timeout: 30000,
  use: {
    channel: 'msedge',
    baseURL: 'http://localhost:4173/FestaAvanteAgenda/',
  },
  webServer: {
    command: 'npm run preview -- --port 4173',
    url: 'http://localhost:4173/FestaAvanteAgenda/',
    reuseExistingServer: true,
    timeout: 15000,
  },
});
