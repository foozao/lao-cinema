/**
 * Base test fixture with automatic database cleanup
 * 
 * Extends Playwright's test with database cleanup before each test.
 * Import this instead of @playwright/test in your test files.
 */

import { test as base } from '@playwright/test';
import { cleanDatabase, closeDatabase } from '../helpers/db';

export const test = base.extend({
  page: async ({ page }, use) => {
    await cleanDatabase();
    
    // Skip cinematic loader for all tests to prevent timeouts
    // Set sessionStorage before any navigation
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem('lao-cinema-loader-seen', 'true');
      } catch {
        // Ignore if sessionStorage is unavailable
      }
    });
    
    await use(page);
  },
});

export { expect } from '@playwright/test';

test.afterAll(async () => {
  await closeDatabase();
});
