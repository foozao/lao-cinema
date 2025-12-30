/**
 * CSRF Token Utilities
 * 
 * Reads CSRF token from cookie and provides it for API requests.
 * Works with double-submit cookie pattern.
 */

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
