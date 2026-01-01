/**
 * CSRF Token Utilities
 * 
 * Fetches CSRF token from API and stores in memory.
 * Required for cross-origin requests where cookies can't be read via document.cookie.
 */

import { API_BASE_URL } from './config';

// In-memory token cache (survives page navigation but not refresh)
let cachedToken: string | null = null;

/**
 * Get CSRF token from memory cache
 */
export function getCsrfToken(): string | null {
  return cachedToken;
}

/**
 * Set CSRF token in memory cache
 */
export function setCsrfToken(token: string): void {
  cachedToken = token;
}

/**
 * Clear CSRF token from memory cache
 */
export function clearCsrfToken(): void {
  cachedToken = null;
}

/**
 * Fetch CSRF token from API and store in memory
 * This is called automatically before state-changing requests if no token exists
 */
export async function ensureCsrfToken(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  // Check if token already exists in memory
  if (cachedToken) return;
  
  // Fetch token from API (returns token in response body)
  try {
    const response = await fetch(`${API_BASE_URL}/csrf`, {
      method: 'GET',
      credentials: 'include',
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.token) {
        cachedToken = data.token;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch CSRF token:', error);
  }
}
