/**
 * Authentication helpers for e2e tests
 * 
 * Utilities for logging in, registering users, and managing auth state in tests.
 */

import { Page } from '@playwright/test';

export async function registerUser(
  page: Page,
  data: {
    email: string;
    password: string;
    displayName: string;
  }
) {
  await page.goto('/en/register');
  
  await page.fill('input[id="displayName"]', data.displayName);
  await page.fill('input[id="email"]', data.email);
  await page.fill('input[id="password"]', data.password);
  await page.fill('input[id="confirmPassword"]', data.password);
  
  await page.click('button[type="submit"]');
  
  // Wait for either success (user menu appears) or error message
  try {
    // Wait for user menu to appear (indicates successful registration)
    await page.waitForSelector('[data-testid="user-menu-trigger"]', { timeout: 10000 });
  } catch (error) {
    // Check if there's an error message on the page
    const errorMsg = await page.locator('.text-red-800').textContent().catch(() => null);
    if (errorMsg) {
      throw new Error(`Registration failed: ${errorMsg}`);
    }
    throw error;
  }
}

export async function loginUser(
  page: Page,
  data: {
    email: string;
    password: string;
  }
) {
  await page.goto('/en/login');
  
  await page.fill('input[id="email"]', data.email);
  await page.fill('input[id="password"]', data.password);
  
  await page.click('button[type="submit"]');
  
  // Wait for user menu to appear (indicates successful login)
  await page.waitForSelector('[data-testid="user-menu-trigger"]', { timeout: 10000 });
}

export async function logoutUser(page: Page) {
  await page.click('[data-testid="user-menu-trigger"]');
  await page.click('[data-testid="logout-button"]');
  
  await page.waitForURL(/\/(en|lo)\/?$/);
}

export async function getAuthToken(page: Page): Promise<string | null> {
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(c => c.name === 'session_token');
  return sessionCookie?.value || null;
}

export async function isLoggedIn(page: Page): Promise<boolean> {
  const userMenuTrigger = page.locator('[data-testid="user-menu-trigger"]');
  return await userMenuTrigger.isVisible();
}
