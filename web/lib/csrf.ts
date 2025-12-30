/**
 * CSRF Token Utilities
 * 
 * Reads CSRF token from cookie and provides it for API requests.
 * Works with double-submit cookie pattern.
 */

import { API_BASE_URL } from './config';

/**
 * Get CSRF token from cookie
 */
export function getCsrfToken(): string | null {
  if (typeof window === 'undefined') return null;

  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  return cookies['csrf_token'] || null;
}

/**
 * Ensure CSRF token exists by making a GET request to the health endpoint
 * This is called automatically before state-changing requests if no token exists
 */
export async function ensureCsrfToken(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  // Check if token already exists
  if (getCsrfToken()) return;
  
  // Make a GET request to trigger CSRF token generation
  try {
    await fetch(`${API_BASE_URL}/../health`, {
      method: 'GET',
      credentials: 'include',
    });
  } catch (error) {
    console.warn('Failed to fetch CSRF token:', error);
  }
}
