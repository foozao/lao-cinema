/**
 * Auth Redirect Pattern e2e tests
 * 
 * Tests the auth redirect pattern for features requiring authentication:
 * - User clicks feature button (notify-me, watchlist) while logged out
 * - Modal appears explaining need for auth
 * - User registers or logs in
 * - Returns to original page with action automatically completed
 * - URL parameter cleaned up
 */

import { test, expect } from './fixtures/base';
import { seedTestMovie, seedTestUser, sql } from './helpers/db';
import { isLoggedIn } from './helpers/auth';

test.describe('Auth Redirect - Notify Me', () => {
  test('should auto-subscribe after registration', async ({ page }) => {
    // Seed a movie
    const movie = await seedTestMovie({
      titleEn: 'Coming Soon Movie',
      titleLo: 'ຮູບເງົາທີ່ກຳລັງຈະມາ',
    });

    // Navigate to movie page (unauthenticated)
    await page.goto(`/en/movies/${movie.id}`);

    // Click "Notify Me" button
    await page.click('button:has-text("Notify Me")');

    // Auth modal should appear
    await expect(page.locator('text=Account Required')).toBeVisible();
    await expect(page.locator('text=Create an account or login to get notified')).toBeVisible();

    // Wait for modal to be ready and click register link
    await page.waitForTimeout(500);
    const modal = page.locator('[class*="fixed inset-0 z-50"]');
    const registerLink = modal.locator('a[href*="/register"]');
    await registerLink.click();

    // Should be on register page with redirect parameter
    await expect(page).toHaveURL(/\/register\?redirect=/);
    
    // Fill registration form
    const uniqueEmail = `notify-register-${Date.now()}@example.com`;
    await page.fill('input[id="displayName"]', 'Notify Test User');
    await page.fill('input[id="email"]', uniqueEmail);
    await page.fill('input[id="password"]', 'password123');
    await page.fill('input[id="confirmPassword"]', 'password123');
    
    // Submit registration
    await page.click('button[type="submit"]');
    
    // Wait for redirect back to movie page
    await page.waitForURL(`/en/movies/${movie.id}*`, { timeout: 10000 });
    
    // Wait for user menu to appear (page needs to hydrate)
    await page.waitForSelector('[data-testid="user-menu-trigger"]', { timeout: 5000 });
    
    // Should be logged in
    expect(await isLoggedIn(page)).toBe(true);
    
    // URL should no longer have auto_notify parameter (cleaned up)
    await page.waitForURL(`/en/movies/${movie.id}`, { timeout: 5000 });
    expect(page.url()).not.toContain('auto_notify');
    
    // Notification should be enabled (button shows "Notification Set" state)
    await expect(page.locator('button:has-text("Notification Set")')).toBeVisible();
  });

  test('should auto-subscribe after login', async ({ page }) => {
    // Seed existing user
    const uniqueEmail = `notify-login-${Date.now()}@example.com`;
    await seedTestUser({
      email: uniqueEmail,
      password: 'password123',
      displayName: 'Existing User',
    });

    // Seed a movie
    const movie = await seedTestMovie({
      titleEn: 'Unavailable Movie',
      titleLo: 'ຮູບເງົາທີ່ບໍ່ມີ',
    });

    // Navigate to movie page (unauthenticated)
    await page.goto(`/en/movies/${movie.id}`);

    // Click "Notify Me" button
    await page.click('button:has-text("Notify Me")');

    // Auth modal should appear
    await expect(page.locator('text=Account Required')).toBeVisible();

    // Wait for modal to be ready and click login link
    await page.waitForTimeout(500);
    const modal = page.locator('[class*="fixed inset-0 z-50"]');
    const loginLink = modal.locator('a[href*="/login"]');
    await loginLink.click();

    // Should be on login page with redirect parameter
    await expect(page).toHaveURL(/\/login\?redirect=/);
    
    // Fill login form
    await page.fill('input[id="email"]', uniqueEmail);
    await page.fill('input[id="password"]', 'password123');
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Wait for redirect back to movie page
    await page.waitForURL(`/en/movies/${movie.id}*`, { timeout: 10000 });
    
    // Wait for user menu to appear (page needs to hydrate)
    await page.waitForSelector('[data-testid="user-menu-trigger"]', { timeout: 5000 });
    
    // Should be logged in
    expect(await isLoggedIn(page)).toBe(true);
    
    // URL should no longer have auto_notify parameter (cleaned up)
    // Wait a bit for URL cleanup to happen
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('auto_notify');
    
    // Notification should be enabled
    await expect(page.locator('button:has-text("Notification Set")')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Auth Redirect - Watchlist', () => {
  test('should auto-add to watchlist after registration', async ({ page }) => {
    // Seed a movie with video source (required for watchlist button to appear)
    const movie = await seedTestMovie({
      titleEn: 'Watchlist Test Movie',
      titleLo: 'ຮູບເງົາທົດສອບລາຍການ',
    });
    
    // Add video source so the movie shows as available
    await sql`
      INSERT INTO video_sources (movie_id, url, format, quality)
      VALUES (${movie.id}, 'https://test.com/video.m3u8', 'hls', '1080p')
    `;

    // Navigate to movie page (unauthenticated)
    await page.goto(`/en/movies/${movie.id}`);

    // Click "Add to Watchlist" button
    await page.click('button:has-text("Add to Watchlist")');

    // Auth modal should appear
    await expect(page.locator('text=Account Required')).toBeVisible();
    await expect(page.locator('text=Create an account or login to save movies')).toBeVisible();

    // Wait for modal to be ready and click register link
    await page.waitForTimeout(500);
    const modal = page.locator('[class*="fixed inset-0 z-50"]');
    const registerLink = modal.locator('a[href*="/register"]');
    await registerLink.click();

    // Should be on register page with redirect parameter
    await expect(page).toHaveURL(/\/register\?redirect=/);
    
    // Fill registration form
    const uniqueEmail = `watchlist-register-${Date.now()}@example.com`;
    await page.fill('input[id="displayName"]', 'Watchlist Test User');
    await page.fill('input[id="email"]', uniqueEmail);
    await page.fill('input[id="password"]', 'password123');
    await page.fill('input[id="confirmPassword"]', 'password123');
    
    // Submit registration
    await page.click('button[type="submit"]');
    
    // Wait for redirect back to movie page
    await page.waitForURL(`/en/movies/${movie.id}*`, { timeout: 10000 });
    
    // Wait for user menu to appear (page needs to hydrate)
    await page.waitForSelector('[data-testid="user-menu-trigger"]', { timeout: 5000 });
    
    // Should be logged in
    expect(await isLoggedIn(page)).toBe(true);
    
    // URL should no longer have auto_add_to_watchlist parameter (cleaned up)
    // Wait a bit for URL cleanup to happen
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('auto_add_to_watchlist');
    
    // Movie should be in watchlist (button shows "In Watchlist" state)
    await expect(page.locator('button:has-text("In Watchlist")')).toBeVisible({ timeout: 5000 });
  });

  test('should auto-add to watchlist after login', async ({ page }) => {
    // Seed existing user
    const uniqueEmail = `watchlist-login-${Date.now()}@example.com`;
    await seedTestUser({
      email: uniqueEmail,
      password: 'password123',
      displayName: 'Watchlist Login User',
    });

    // Seed a movie with video source (required for watchlist button to appear)
    const movie = await seedTestMovie({
      titleEn: 'Another Watchlist Movie',
      titleLo: 'ຮູບເງົາລາຍການອື່ນ',
    });
    
    // Add video source so the movie shows as available
    await sql`
      INSERT INTO video_sources (movie_id, url, format, quality)
      VALUES (${movie.id}, 'https://test.com/video.m3u8', 'hls', '1080p')
    `;

    // Navigate to movie page (unauthenticated)
    await page.goto(`/en/movies/${movie.id}`);

    // Click "Add to Watchlist" button
    await page.click('button:has-text("Add to Watchlist")');

    // Auth modal should appear
    await expect(page.locator('text=Account Required')).toBeVisible();

    // Wait for modal to be ready and click login link
    await page.waitForTimeout(500);
    const modal = page.locator('[class*="fixed inset-0 z-50"]');
    const loginLink = modal.locator('a[href*="/login"]');
    await loginLink.click();

    // Should be on login page with redirect parameter
    await expect(page).toHaveURL(/\/login\?redirect=/);
    
    // Fill login form
    await page.fill('input[id="email"]', uniqueEmail);
    await page.fill('input[id="password"]', 'password123');
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Wait for redirect back to movie page
    await page.waitForURL(`/en/movies/${movie.id}*`, { timeout: 10000 });
    
    // Wait for user menu to appear (page needs to hydrate)
    await page.waitForSelector('[data-testid="user-menu-trigger"]', { timeout: 5000 });
    
    // Should be logged in
    expect(await isLoggedIn(page)).toBe(true);
    
    // URL should no longer have auto_add_to_watchlist parameter (cleaned up)
    // Wait a bit for URL cleanup to happen
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('auto_add_to_watchlist');
    
    // Movie should be in watchlist
    await expect(page.locator('button:has-text("In Watchlist")')).toBeVisible({ timeout: 5000 });
  });
});
