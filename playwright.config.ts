import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir:  './tests',
  timeout:  60_000,
  retries:  0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  // Serial so describe blocks don't race each other and Web Lock contention is impossible
  workers: 1,
  use: {
    baseURL:            'http://localhost:3000',
    trace:              'retain-on-failure',
    video:              'retain-on-failure',
    actionTimeout:      15_000,
    navigationTimeout:  30_000,
  },
  projects: [
    {
      name: 'chromium',
      use:  { ...devices['Desktop Chrome'] },
    },
  ],
  // Uncomment to auto-start dev server:
  // webServer: {
  //   command:            'npm run dev',
  //   url:                'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout:            120_000,
  // },
});
