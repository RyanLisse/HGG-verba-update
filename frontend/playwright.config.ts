import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Only set workers in CI to avoid undefined typing issues
  ...(process.env.CI ? { workers: 1 as const } : {}),
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3025',
    trace: 'on-first-retry',
    viewport: { width: 1366, height: 850 },
    ignoreHTTPSErrors: true,
  },
  webServer: {
    // Use dev server for e2e to avoid next start incompatibility with output: 'export'
    command: 'next dev -p 3025',
    url: 'http://localhost:3025',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
    cwd: __dirname,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
