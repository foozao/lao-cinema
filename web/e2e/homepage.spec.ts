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

  test('should display movies on the homepage', async ({ page, request }) => {
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

    // First, verify the API returns the movies directly (bypasses frontend issues)
    const apiResponse = await request.get('http://localhost:3011/api/homepage/featured');
    expect(apiResponse.ok()).toBe(true);
    const apiData = await apiResponse.json();
    expect(apiData.movies).toHaveLength(2);
    expect(apiData.movies[0].title.en).toBe('Test Movie 1');

    // Now test the frontend
    await page.goto('/en');
    
    // Wait for loading to complete - either movies appear or error state
    await page.waitForLoadState('networkidle');
    
    // Check for movie link or error state
    const hasMovies = await page.locator(`a[href*="/movies/"]`).count() > 0;
    const hasError = await page.locator('text=No films available').isVisible().catch(() => false);
    const hasNetworkError = await page.locator('text=Unable to connect').isVisible().catch(() => false);
    
    // If frontend shows error but API works, there's a frontend issue
    if (!hasMovies && (hasError || hasNetworkError)) {
      console.log('API works but frontend shows error - checking network...');
      // This is useful for debugging frontend/API connection issues
    }
    
    // Verify at least one movie appears
    await expect(page.locator(`a[href*="/movies/"]`).first()).toBeVisible({ timeout: 10000 });
    
    // Verify the specific movie title (use .last() to get desktop layout - .first() gets mobile which is hidden)
    await expect(page.getByText('Test Movie 1').last()).toBeVisible();
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
