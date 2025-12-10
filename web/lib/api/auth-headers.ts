/**
 * Shared utility for building authenticated API request headers
 * 
 * Handles both authenticated users (with session tokens) and anonymous users
 * (with anonymous IDs) for dual-mode API support.
 */

import { getAnonymousId } from '../anonymous-id';
import { getRawSessionToken } from '../auth/api-client';

/**
 * Build headers for authenticated API requests
 * 
 * Automatically includes:
 * - Content-Type: application/json
 * - Authorization: Bearer {token} (if user is logged in)
 * - X-Anonymous-Id: {id} (if user is anonymous)
 * 
 * @returns Headers object ready for fetch requests
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  const token = getRawSessionToken();
  if (token) {
    // Authenticated user - send session token
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    // Anonymous user - send anonymous ID
    const anonymousId = getAnonymousId();
    if (anonymousId) {
      headers['X-Anonymous-Id'] = anonymousId;
    }
  }
  
  return headers;
}
