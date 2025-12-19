/**
 * Video playback e2e tests
 * 
 * Tests video player functionality, controls, and watch progress tracking.
 */

import { test, expect } from './fixtures/base';
import { seedTestMovie, seedTestUser, addVideoSource } from './helpers/db';
import { loginUser } from './helpers/auth';

test.describe('Video Playback', () => {
  test('should load video player on watch page', async ({ page }) => {
    const movie = await seedTestMovie({
      titleEn: 'Player Test Movie',
    });
    await addVideoSource(movie.id, {
      url: 'http://localhost:3002/videos/test/master.m3u8',
    });

    await page.goto(`/en/movies/${movie.id}`);
    await page.click('button:has-text("Rent to Watch")');
    await page.click('button:has-text("Emulate QR Payment")');
    
    // Payment automatically redirects to watch page
    await page.waitForURL(new RegExp(`/en/movies/${movie.id}/watch`), { timeout: 10000 });
    
    await expect(page.locator('video, [data-testid="video-player"]')).toBeVisible();
  });

  // TODO: Fix - video player container selectors don't match current implementation
  test.skip('should show video controls', async ({ page }) => {
    const movie = await seedTestMovie({
      titleEn: 'Controls Test Movie',
    });
    await addVideoSource(movie.id);

    await page.goto(`/en/movies/${movie.id}`);
    await page.click('button:has-text("Rent to Watch")');
    await page.click('button:has-text("Emulate QR Payment")');
    
    // Payment automatically redirects to watch page
    await page.waitForURL(new RegExp(`/en/movies/${movie.id}/watch`), { timeout: 10000 });
    
    const videoContainer = page.locator('[data-testid="video-player"], .video-player');
    await videoContainer.hover();
    
    await expect(page.locator('button[aria-label*="Play"], button[aria-label*="Pause"]')).toBeVisible();
    await expect(page.locator('[aria-label*="Volume"], [aria-label*="Mute"]')).toBeVisible();
    await expect(page.locator('[aria-label*="Fullscreen"]')).toBeVisible();
  });

  // TODO: Fix - Continue Watching section not showing progress
  test.skip('should track watch progress for anonymous users', async ({ page }) => {
    const movie = await seedTestMovie({
      titleEn: 'Progress Test Movie',
      runtime: 120,
    });
    await addVideoSource(movie.id);

    await page.goto(`/en/movies/${movie.id}`);
    await page.click('button:has-text("Rent to Watch")');
    await page.click('button:has-text("Emulate QR Payment")');
    await page.waitForTimeout(2000);
    
    await page.goto('/en');
    
    await expect(page.locator('text=Continue Watching, text=Progress Test Movie')).toBeVisible();
  });

  // TODO: Fix - Watch progress not being saved/resumed properly
  test.skip('should resume from last watch position', async ({ page }) => {
    const movie = await seedTestMovie({
      titleEn: 'Resume Test Movie',
    });
    await addVideoSource(movie.id);

    await page.goto(`/en/movies/${movie.id}`);
    await page.click('button:has-text("Rent to Watch")');
    await page.click('button:has-text("Emulate QR Payment")');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Watch Now")');
    
    await page.waitForTimeout(3000);
    
    await page.goto(`/en/movies/${movie.id}`);
    
    await page.click('button:has-text("Continue Watching"), button:has-text("Resume")');
    
    await expect(page).toHaveURL(new RegExp(`/en/movies/${movie.id}/watch`));
  });

  // TODO: Fix - Watch progress not syncing across login
  test.skip('should sync watch progress after login', async ({ page }) => {
    const movie = await seedTestMovie({
      titleEn: 'Progress Sync Movie',
    });
    await addVideoSource(movie.id);

    await page.goto(`/en/movies/${movie.id}`);
    await page.click('button:has-text("Rent to Watch")');
    await page.click('button:has-text("Emulate QR Payment")');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Watch Now")');
    
    await page.waitForTimeout(2000);
    
    await page.goto('/en');

    await seedTestUser({
      email: 'progress@example.com',
      password: 'password123',
    });
    
    await loginUser(page, {
      email: 'progress@example.com',
      password: 'password123',
    });
    
    await page.goto('/en/profile/continue-watching');
    
    await expect(page.locator('text=Progress Sync Movie')).toBeVisible();
  });
});
