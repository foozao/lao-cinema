/**
 * Homepage e2e tests
 * 
 * Tests basic navigation, language switching, and movie browsing.
 */

import { test, expect } from './fixtures/base';
import { seedTestMovie, seedTestGenre, featureMovie } from './helpers/db';

test.describe('Homepage', () => {
  test('should load the homepage successfully', async ({ page }) => {
    await page.goto('/en');
    
    await expect(page).toHaveTitle(/Lao Cinema/);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });

  test('should switch between English and Lao languages', async ({ page }) => {
    await page.goto('/en');
    
    await expect(page).toHaveURL(/\/en/);
    
    // Wait for cinematic loader to complete and page to be interactive
    await page.waitForSelector('[data-testid="language-toggle"]', { state: 'visible', timeout: 10000 });
    
    const languageToggle = page.locator('[data-testid="language-toggle"]');
    await languageToggle.click();
    
    await expect(page).toHaveURL(/\/lo/);
    
    await languageToggle.click();
    
    await expect(page).toHaveURL(/\/en/);
  });

  test('should display movies on the homepage', async ({ page }) => {
    const movie1 = await seedTestMovie({
      titleEn: 'Test Movie 1',
      titleLo: 'ຮູບເງົາທົດສອບ 1',
    });
    const movie2 = await seedTestMovie({
      titleEn: 'Test Movie 2',
      titleLo: 'ຮູບເງົາທົດສອບ 2',
    });
    
    // Feature the movies so they appear on homepage
    await featureMovie(movie1.id, 0);
    await featureMovie(movie2.id, 1);

    await page.goto('/en');
    
    await expect(page.getByText('Test Movie 1')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to movie detail page when clicking a movie', async ({ page }) => {
    const movie = await seedTestMovie({
      titleEn: 'Clickable Movie',
      titleLo: 'ຮູບເງົາທີ່ຄລິກໄດ້',
    });
    
    // Feature the movie so it appears on homepage
    await featureMovie(movie.id);

    await page.goto('/en');
    
    // Wait for movie card to appear, then click it
    await page.waitForSelector(`a[href*="/movies/${movie.id}"]`);
    await page.click(`a[href*="/movies/${movie.id}"]`);
    
    await expect(page).toHaveURL(new RegExp(`/en/movies/${movie.id}`));
    await expect(page.getByRole('heading', { name: /Clickable Movie/i })).toBeVisible();
  });

  test.skip('should search for movies', async ({ page }) => {
    // TODO: Implement search functionality on homepage
    // This test is skipped until search feature is implemented
    await seedTestMovie({
      titleEn: 'The Matrix',
      titleLo: 'ແມດທຣິກ',
    });
    await seedTestMovie({
      titleEn: 'Inception',
      titleLo: 'ອິນເຊັບຊັນ',
    });

    await page.goto('/en');
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Matrix');
      
      await expect(page.locator('text=The Matrix')).toBeVisible();
    }
  });
});
