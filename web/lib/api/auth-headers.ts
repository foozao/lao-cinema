/**
 * Shared utility for building API request headers
 * 
 * Authentication is now handled via HttpOnly cookies (credentials: 'include').
 * Anonymous users are identified via X-Anonymous-Id header.
 */

import { getAnonymousIdSync, getAnonymousId } from '../anonymous-id';
import { isAuthenticated } from '../auth/api-client';
import { getCsrfToken } from '../csrf';

/**
 * Build headers for API requests
 * 
 * Automatically includes:
 * - Content-Type: application/json
 * - X-CSRF-Token: {token} (if available)
 * - X-Anonymous-Id: {id} (if user is not authenticated and ID is cached)
 * 
 * Note: Session auth is handled via HttpOnly cookies (use credentials: 'include')
 * Note: Anonymous ID must be initialized before using this function
 * 
 * @returns Headers object ready for fetch requests
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add CSRF token for state-changing requests
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  
  // Only send anonymous ID if not authenticated
  // (authenticated users use HttpOnly cookies automatically)
  if (!isAuthenticated()) {
    const anonymousId = getAnonymousIdSync();
    if (anonymousId) {
      headers['X-Anonymous-Id'] = anonymousId;
    }
  }
  
  return headers;
}

/**
 * Async version that ensures anonymous ID is fetched if not cached
 * 
 * Use this for API calls that need to guarantee the anonymous ID exists.
 * Falls back to sync version if ID is already cached.
 */
export async function getAuthHeadersAsync(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add CSRF token for state-changing requests
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  
  // Only send anonymous ID if not authenticated
  if (!isAuthenticated()) {
    // Use async version to ensure ID is fetched if not cached
    const anonymousId = await getAnonymousId();
    if (anonymousId) {
      headers['X-Anonymous-Id'] = anonymousId;
    }
  }
  
  return headers;
}
