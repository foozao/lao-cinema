/**
 * Authentication e2e tests
 * 
 * Tests user registration, login, logout, and profile management.
 */

import { test, expect } from './fixtures/base';
import { seedTestUser } from './helpers/db';
import { registerUser, loginUser, logoutUser, isLoggedIn } from './helpers/auth';

test.describe('Authentication', () => {
  test('should register a new user', async ({ page }) => {
    const uniqueEmail = `newuser-${Date.now()}@example.com`;
    await registerUser(page, {
      email: uniqueEmail,
      password: 'password123',
      displayName: 'New User',
    });
    
    expect(await isLoggedIn(page)).toBe(true);
    
    // Click user menu to open dropdown
    await page.click('[data-testid="user-menu-trigger"]');
    
    // Check display name appears in dropdown
    await expect(page.locator('text=New User')).toBeVisible();
  });

  test('should login with existing user', async ({ page }) => {
    const uniqueEmail = `existing-${Date.now()}@example.com`;
    await seedTestUser({
      email: uniqueEmail,
      password: 'password123',
      displayName: 'Existing User',
    });

    await loginUser(page, {
      email: uniqueEmail,
      password: 'password123',
    });
    
    expect(await isLoggedIn(page)).toBe(true);
    
    // Click user menu to open dropdown
    await page.click('[data-testid="user-menu-trigger"]');
    
    // Check display name appears in dropdown
    await expect(page.locator('text=Existing User')).toBeVisible();
  });

  test('should reject invalid login credentials', async ({ page }) => {
    const uniqueEmail = `user-${Date.now()}@example.com`;
    await seedTestUser({
      email: uniqueEmail,
      password: 'correctpassword',
    });

    await page.goto('/en/login');
    
    await page.fill('input[id="email"]', uniqueEmail);
    await page.fill('input[id="password"]', 'wrongpassword');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('[data-testid="form-error"]')).toContainText('Invalid email or password');
  });

  test('should logout successfully', async ({ page }) => {
    const uniqueEmail = `logout-${Date.now()}@example.com`;
    await seedTestUser({
      email: uniqueEmail,
      password: 'password123',
      displayName: 'Logout User',
    });

    await loginUser(page, {
      email: uniqueEmail,
      password: 'password123',
    });
    
    expect(await isLoggedIn(page)).toBe(true);
    
    await logoutUser(page);
    
    expect(await isLoggedIn(page)).toBe(false);
  });

  test('should redirect to login page when accessing protected routes', async ({ page }) => {
    await page.goto('/en/profile');
    
    await expect(page).toHaveURL(/\/login/);
  });

  test('should access profile page when logged in', async ({ page }) => {
    const uniqueEmail = `profile-${Date.now()}@example.com`;
    await seedTestUser({
      email: uniqueEmail,
      password: 'password123',
      displayName: 'Profile User',
    });

    await loginUser(page, {
      email: uniqueEmail,
      password: 'password123',
    });
    
    await page.goto('/en/profile');
    
    await expect(page).toHaveURL(/\/en\/profile/);
    // Check for profile content (more specific than just h1)
    await expect(page.locator('main h1, h1.text-3xl')).toContainText(/Profile|Dashboard/i);
  });

  test('should display validation errors for invalid registration', async ({ page }) => {
    await page.goto('/en/register');
    
    // Fill with passwords that don't match (frontend validation)
    const uniqueEmail = `test-${Date.now()}@example.com`;
    await page.fill('input[id="displayName"]', 'Test User');
    await page.fill('input[id="email"]', uniqueEmail);
    await page.fill('input[id="password"]', 'password123');
    await page.fill('input[id="confirmPassword"]', 'differentpassword');
    
    await page.click('button[type="submit"]');
    
    // Check for password mismatch error
    await expect(page.locator('[data-testid="form-error"]')).toBeVisible();
  });
});
