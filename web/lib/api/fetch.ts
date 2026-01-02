/**
 * Centralized API Fetch Helper
 * 
 * Handles:
 * - CSRF token management (automatically fetched for state-changing requests)
 * - Auth headers (session cookie + anonymous ID)
 * - Consistent error handling
 * 
 * Use this for all API calls to ensure consistent behavior.
 */

import { API_BASE_URL } from '@/lib/config';
import { getCsrfToken, ensureCsrfToken } from '@/lib/csrf';
import { getAuthHeadersAsync } from './auth-headers';

// =============================================================================
// TYPES
// =============================================================================

export interface ApiFetchOptions extends Omit<RequestInit, 'headers'> {
  /**
   * Skip automatic auth headers (session cookie is still sent via credentials: 'include')
   * Use for public endpoints that don't need X-Anonymous-Id header
   */
  skipAuthHeaders?: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Methods that require CSRF protection
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// =============================================================================
// MAIN FETCH FUNCTION
// =============================================================================

/**
 * Make an API request with automatic CSRF and auth handling
 * 
 * @param endpoint - API endpoint (e.g., '/movies', '/rentals/123')
 * @param options - Fetch options (method, body, etc.)
 * @returns Parsed JSON response
 * @throws ApiError on non-2xx responses
 * 
 * @example
 * // GET request
 * const movies = await apiFetch<{ movies: Movie[] }>('/movies');
 * 
 * @example
 * // POST request with body
 * const rental = await apiFetch<{ rental: Rental }>('/rentals/123', {
 *   method: 'POST',
 *   body: JSON.stringify({ transactionId: 'abc' }),
 * });
 */
export async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { skipAuthHeaders, ...fetchOptions } = options;
  const method = (fetchOptions.method?.toUpperCase() || 'GET');
  
  // Build headers
  const headers: Record<string, string> = {};
  
  // Add Content-Type for requests with body
  if (fetchOptions.body && typeof fetchOptions.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }
  
  // Add auth headers (includes X-Anonymous-Id for dual-mode endpoints)
  if (!skipAuthHeaders) {
    const authHeaders = await getAuthHeadersAsync();
    Object.assign(headers, authHeaders);
  }
  
  // Add CSRF token for state-changing requests
  if (STATE_CHANGING_METHODS.has(method)) {
    await ensureCsrfToken();
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
    credentials: 'include', // Send HttpOnly cookies
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(
      error.message || error.error || `API request failed: ${response.statusText}`,
      response.status,
      error.code,
      error
    );
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/**
 * Make an API request that returns void (for DELETE, etc.)
 * Doesn't throw on empty response body
 */
export async function apiFetchVoid(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<void> {
  const { skipAuthHeaders, ...fetchOptions } = options;
  const method = (fetchOptions.method?.toUpperCase() || 'GET');
  
  // Build headers
  const headers: Record<string, string> = {};
  
  // Add Content-Type for requests with body
  if (fetchOptions.body && typeof fetchOptions.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }
  
  // Add auth headers
  if (!skipAuthHeaders) {
    const authHeaders = await getAuthHeadersAsync();
    Object.assign(headers, authHeaders);
  }
  
  // Add CSRF token for state-changing requests
  if (STATE_CHANGING_METHODS.has(method)) {
    await ensureCsrfToken();
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(
      error.message || error.error || `API request failed: ${response.statusText}`,
      response.status,
      error.code,
      error
    );
  }
}
