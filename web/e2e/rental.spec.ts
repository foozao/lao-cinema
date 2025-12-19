/**
 * Rental flow e2e tests
 * 
 * Tests movie rental, payment modal, watch access, and rental expiration.
 * Current implementation: $5.00 fixed price, 24-hour rental duration
 */

import { test, expect } from './fixtures/base';
import { seedTestMovie, seedTestUser, addVideoSource } from './helpers/db';
import { loginUser } from './helpers/auth';

test.describe('Movie Rentals', () => {
  test('should show rent button for non-rented movie', async ({ page }) => {
    const movie = await seedTestMovie({
      titleEn: 'Rental Test Movie',
    });
    await addVideoSource(movie.id);

    await page.goto(`/en/movies/${movie.id}`);
    
    // Should show rent button (payment modal opens on click)
    await expect(page.locator('button:has-text("Rent to Watch")')).toBeVisible();
  });

  test('should open payment modal when clicking rent button (anonymous user)', async ({ page }) => {
    const movie = await seedTestMovie({
      titleEn: 'Payment Modal Test',
    });
    await addVideoSource(movie.id);

    await page.goto(`/en/movies/${movie.id}`);
    
    await page.click('button:has-text("Rent to Watch")');
    
    // Payment modal should open
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('[role="dialog"] >> text=/Payment Modal Test/i').first()).toBeVisible();
  });

  test('should complete rental and enable watch button (anonymous)', async ({ page }) => {
    const movie = await seedTestMovie({
      titleEn: 'Watch Access Test',
    });
    await addVideoSource(movie.id);

    await page.goto(`/en/movies/${movie.id}`);
    
    await page.click('button:has-text("Rent to Watch")');
    
    // Complete demo payment
    await page.click('button:has-text("Emulate QR Payment")');
    
    // Wait for payment to process
    await page.waitForTimeout(2000);
    
    // Watch button should appear
    await expect(page.locator('button:has-text("Watch Now")').first()).toBeVisible();
  });

  test('should allow watching rented movie', async ({ page }) => {
    const movie = await seedTestMovie({
      titleEn: 'Playback Test',
    });
    await addVideoSource(movie.id);

    await page.goto(`/en/movies/${movie.id}`);
    
    await page.click('button:has-text("Rent to Watch")');
    await page.click('button:has-text("Emulate QR Payment")');
    
    // Payment automatically redirects to watch page
    await page.waitForURL(new RegExp(`/en/movies/${movie.id}/watch`), { timeout: 10000 });
    
    await expect(page.locator('video, [data-testid="video-player"]')).toBeVisible();
  });

  test('should sync rental across login (anonymous to authenticated)', async ({ page }) => {
    const movie = await seedTestMovie({
      titleEn: 'Sync Test Movie',
    });
    await addVideoSource(movie.id);

    // Rent as anonymous user
    await page.goto(`/en/movies/${movie.id}`);
    await page.click('button:has-text("Rent to Watch")');
    await page.click('button:has-text("Emulate QR Payment")');
    
    // Wait for redirect to watch page (confirms rental worked)
    await page.waitForURL(new RegExp(`/en/movies/${movie.id}/watch`), { timeout: 10000 });

    // Create a user and login
    await seedTestUser({
      email: 'sync@example.com',
      password: 'password123',
    });
    
    await loginUser(page, {
      email: 'sync@example.com',
      password: 'password123',
    });
    
    // Go back to movie page - should still show Watch Now (rental migrated)
    await page.goto(`/en/movies/${movie.id}`);
    
    await expect(page.locator('button:has-text("Watch Now")').first()).toBeVisible();
  });

  test('should redirect to movie page if rental expired when accessing watch page', async ({ page }) => {
    const movie = await seedTestMovie({
      titleEn: 'Expired Rental Movie',
    });
    await addVideoSource(movie.id);

    // Simulate accessing watch page with expired rental param
    await page.goto(`/en/movies/${movie.id}/watch?rental=expired`);
    
    // Should redirect to movie page (watch page redirects when no valid rental)
    await page.waitForURL(new RegExp(`/en/movies/${movie.id}[^/]*$`), { timeout: 10000 });
    
    // Payment modal should open with expired message
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('[role="dialog"] >> text=/has expired/i')).toBeVisible();
  });

  // TODO: Fix - rental expiration text not appearing on page after payment
  test.skip('should show rental status and expiration time', async ({ page }) => {
    const movie = await seedTestMovie({
      titleEn: 'Rental Status Test',
    });
    await addVideoSource(movie.id);

    await page.goto(`/en/movies/${movie.id}`);
    await page.click('button:has-text("Rent to Watch")');
    await page.click('button:has-text("Emulate QR Payment")');
    await page.waitForTimeout(2000);
    
    // Reload page to see updated rental status
    await page.reload();
    
    // Should show rental expiration (24 hours from now)
    await expect(page.locator('text=/expires.*in/i, text=/24.*hours/i, text=/23.*hours/i')).toBeVisible();
  });
});
