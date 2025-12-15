/**
 * Video playback e2e tests
 * 
 * Tests video player functionality, controls, and watch progress tracking.
 * 
 * TODO: These tests are skipped pending video source setup and HLS streaming configuration
 */

import { test, expect } from './fixtures/base';
import { seedTestMovie, seedTestUser, addVideoSource } from './helpers/db';
import { loginUser } from './helpers/auth';

test.describe.skip('Video Playback', () => {
  test('should load video player on watch page', async ({ page }) => {
    const movie = await seedTestMovie({
      id: 200,
      titleEn: 'Player Test Movie',
    });
    await addVideoSource(movie.id, {
      url: 'http://localhost:3002/videos/test/master.m3u8',
    });

    await page.goto(`/en/movies/${movie.id}`);
    await page.click('button:has-text("Rent")');
    await page.click('button:has-text("Credit Card"), button:has-text("Confirm")');
    await page.click('button:has-text("Watch Now")');
    
    await expect(page.locator('video, [data-testid="video-player"]')).toBeVisible();
  });

  test('should show video controls', async ({ page }) => {
    const movie = await seedTestMovie({
      id: 201,
      titleEn: 'Controls Test Movie',
    });
    await addVideoSource(movie.id);

    await page.goto(`/en/movies/${movie.id}`);
    await page.click('button:has-text("Rent")');
    await page.click('button:has-text("Credit Card"), button:has-text("Confirm")');
    await page.click('button:has-text("Watch Now")');
    
    const videoContainer = page.locator('[data-testid="video-player"], .video-player');
    await videoContainer.hover();
    
    await expect(page.locator('button[aria-label*="Play"], button[aria-label*="Pause"]')).toBeVisible();
    await expect(page.locator('[aria-label*="Volume"], [aria-label*="Mute"]')).toBeVisible();
    await expect(page.locator('[aria-label*="Fullscreen"]')).toBeVisible();
  });

  test('should track watch progress for anonymous users', async ({ page }) => {
    const movie = await seedTestMovie({
      id: 202,
      titleEn: 'Progress Test Movie',
      runtime: 120,
    });
    await addVideoSource(movie.id);

    await page.goto(`/en/movies/${movie.id}`);
    await page.click('button:has-text("Rent")');
    await page.click('button:has-text("Credit Card"), button:has-text("Confirm")');
    
    await page.goto('/en');
    
    await expect(page.locator('text=Continue Watching, text=Progress Test Movie')).toBeVisible();
  });

  test('should resume from last watch position', async ({ page }) => {
    const movie = await seedTestMovie({
      id: 203,
      titleEn: 'Resume Test Movie',
    });
    await addVideoSource(movie.id);

    await page.goto(`/en/movies/${movie.id}`);
    await page.click('button:has-text("Rent")');
    await page.click('button:has-text("Credit Card"), button:has-text("Confirm")');
    await page.click('button:has-text("Watch Now")');
    
    await page.waitForTimeout(3000);
    
    await page.goto(`/en/movies/${movie.id}`);
    
    await page.click('button:has-text("Continue Watching"), button:has-text("Resume")');
    
    await expect(page).toHaveURL(new RegExp(`/en/movies/${movie.id}/watch`));
  });

  test('should sync watch progress after login', async ({ page }) => {
    const movie = await seedTestMovie({
      id: 204,
      titleEn: 'Progress Sync Movie',
    });
    await addVideoSource(movie.id);

    await page.goto(`/en/movies/${movie.id}`);
    await page.click('button:has-text("Rent")');
    await page.click('button:has-text("Credit Card"), button:has-text("Confirm")');
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
