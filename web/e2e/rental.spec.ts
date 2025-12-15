/**
 * Rental flow e2e tests
 * 
 * Tests movie rental, payment modal, watch access, and rental expiration.
 * 
 * TODO: These tests are skipped pending payment modal and video source setup
 */

import { test, expect } from './fixtures/base';
import { seedTestMovie, seedTestUser, addVideoSource } from './helpers/db';
import { loginUser } from './helpers/auth';

test.describe.skip('Movie Rentals', () => {
  test('should show rent button for non-rented movie', async ({ page }) => {
    const movie = await seedTestMovie({
      id: 100,
      titleEn: 'Rental Test Movie',
      rentalPrice: 3.99,
      rentalDuration: 48,
    });

    await page.goto(`/en/movies/${movie.id}`);
    
    await expect(page.locator('button:has-text("Rent")')).toBeVisible();
    await expect(page.locator('text=/\\$3\\.99/i')).toBeVisible();
    await expect(page.locator('text=/48.*hours/i')).toBeVisible();
  });

  test('should open payment modal when clicking rent button (anonymous user)', async ({ page }) => {
    const movie = await seedTestMovie({
      id: 101,
      titleEn: 'Payment Modal Test',
      rentalPrice: 2.99,
    });

    await page.goto(`/en/movies/${movie.id}`);
    
    await page.click('button:has-text("Rent")');
    
    await expect(page.locator('text=/Payment.*Method/i, text=/Rent.*Movie/i')).toBeVisible();
    await expect(page.locator('text=/\\$2\\.99/i')).toBeVisible();
  });

  test('should complete rental and enable watch button (anonymous)', async ({ page }) => {
    const movie = await seedTestMovie({
      id: 102,
      titleEn: 'Watch Access Test',
    });
    await addVideoSource(movie.id);

    await page.goto(`/en/movies/${movie.id}`);
    
    await page.click('button:has-text("Rent")');
    
    await page.click('button:has-text("Credit Card"), button:has-text("Confirm")');
    
    await expect(page.locator('button:has-text("Watch Now")')).toBeVisible();
    
    await expect(page.locator('button:has-text("Rent")')).not.toBeVisible();
  });

  test('should allow watching rented movie', async ({ page }) => {
    const movie = await seedTestMovie({
      id: 103,
      titleEn: 'Playback Test',
    });
    await addVideoSource(movie.id);

    await page.goto(`/en/movies/${movie.id}`);
    
    await page.click('button:has-text("Rent")');
    await page.click('button:has-text("Credit Card"), button:has-text("Confirm")');
    
    await page.click('button:has-text("Watch Now")');
    
    await expect(page).toHaveURL(new RegExp(`/en/movies/${movie.id}/watch`));
    
    await expect(page.locator('video, [data-testid="video-player"]')).toBeVisible();
  });

  test('should sync rental across login (anonymous to authenticated)', async ({ page }) => {
    const movie = await seedTestMovie({
      id: 104,
      titleEn: 'Sync Test Movie',
    });
    await addVideoSource(movie.id);

    await page.goto(`/en/movies/${movie.id}`);
    await page.click('button:has-text("Rent")');
    await page.click('button:has-text("Credit Card"), button:has-text("Confirm")');
    
    await expect(page.locator('button:has-text("Watch Now")')).toBeVisible();

    await seedTestUser({
      email: 'sync@example.com',
      password: 'password123',
    });
    
    await loginUser(page, {
      email: 'sync@example.com',
      password: 'password123',
    });
    
    await page.goto(`/en/movies/${movie.id}`);
    
    await expect(page.locator('button:has-text("Watch Now")')).toBeVisible();
  });

  test('should redirect to movie page if rental expired when accessing watch page', async ({ page }) => {
    const movie = await seedTestMovie({
      id: 105,
      titleEn: 'Expired Rental Movie',
    });
    await addVideoSource(movie.id);

    await page.goto(`/en/movies/${movie.id}/watch?rental=expired`);
    
    await expect(page).toHaveURL(new RegExp(`/en/movies/${movie.id}\\?rental=expired`));
    
    await expect(page.locator('text=/rental.*expired/i')).toBeVisible();
  });

  test('should show rental status and expiration time', async ({ page }) => {
    const movie = await seedTestMovie({
      id: 106,
      titleEn: 'Rental Status Test',
      rentalDuration: 48,
    });
    await addVideoSource(movie.id);

    await page.goto(`/en/movies/${movie.id}`);
    await page.click('button:has-text("Rent")');
    await page.click('button:has-text("Credit Card"), button:has-text("Confirm")');
    
    await expect(page.locator('text=/expires.*in/i, text=/48.*hours/i')).toBeVisible();
  });
});
