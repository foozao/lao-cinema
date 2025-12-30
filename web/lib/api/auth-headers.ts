/**
 * Shared utility for building API request headers
 * 
 * Authentication is now handled via HttpOnly cookies (credentials: 'include').
 * Anonymous users are identified via X-Anonymous-Id header.
 */

import { getAnonymousId } from '../anonymous-id';
import { isAuthenticated } from '../auth/api-client';

/**
 * Build headers for API requests
 * 
 * Automatically includes:
 * - Content-Type: application/json
 * - X-Anonymous-Id: {id} (if user is not authenticated)
 * 
 * Note: Session auth is handled via HttpOnly cookies (use credentials: 'include')
 * 
 * @returns Headers object ready for fetch requests
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Only send anonymous ID if not authenticated
  // (authenticated users use HttpOnly cookies automatically)
  if (!isAuthenticated()) {
    const anonymousId = getAnonymousId();
    if (anonymousId) {
      headers['X-Anonymous-Id'] = anonymousId;
    }
  }
  
  return headers;
}
