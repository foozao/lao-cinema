import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Lao Cinema e2e tests
 * 
 * Tests run against a test database (lao_cinema_test) to avoid polluting dev data.
 * The API server must be configured with TEST_DATABASE_URL before running tests.
 */

export default defineConfig({
  testDir: './e2e',
  
  fullyParallel: false,
  
  forbidOnly: !!process.env.CI,
  
  retries: process.env.CI ? 2 : 1,
  
  workers: 1,
  
  reporter: process.env.CI ? 'github' : 'html',
  
  use: {
    baseURL: 'http://localhost:3010',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Uncomment to test on more browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // Mobile viewports
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  webServer: [
    {
      command: 'cd ../api && PORT=3011 DATABASE_URL=postgresql://laocinema:laocinema_dev@localhost:5432/lao_cinema_test CORS_ORIGIN=http://localhost:3010 npm run dev',
      url: 'http://localhost:3011/health',
      reuseExistingServer: false,
      timeout: 120 * 1000,
      env: {
        PORT: '3011',
        DATABASE_URL: 'postgresql://laocinema:laocinema_dev@localhost:5432/lao_cinema_test',
        CORS_ORIGIN: 'http://localhost:3010',
      },
    },
    {
      command: 'PORT=3010 NEXT_PUBLIC_API_URL=http://localhost:3011/api NEXT_BUILD_DIR=.next-e2e npm run dev',
      url: 'http://localhost:3010',
      reuseExistingServer: false,
      timeout: 120 * 1000,
      env: {
        PORT: '3010',
        NEXT_PUBLIC_API_URL: 'http://localhost:3011/api',
        NEXT_BUILD_DIR: '.next-e2e',
      },
    },
  ],
});
