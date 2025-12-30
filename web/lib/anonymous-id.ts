/**
 * Anonymous ID Management
 * 
 * Manages cryptographically signed anonymous IDs from the server.
 * IDs are generated server-side and validated on each request.
 */

import { API_BASE_URL } from './config';

const STORAGE_KEY = 'lao_cinema_anonymous_id';

/**
 * Request a new signed anonymous ID from the server
 */
async function requestAnonymousId(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/anonymous-id`, {
    method: 'POST',
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to generate anonymous ID');
  }
  
  const data = await response.json();
  return data.anonymousId;
}

/**
 * Get or create signed anonymous ID
 * 
 * Returns a cryptographically signed ID from the server.
 * IDs are cached in localStorage for 90 days.
 */
export async function getAnonymousId(): Promise<string> {
  if (typeof window === 'undefined') {
    return '';
  }
  
  // Try to get existing ID from localStorage
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    // TODO: Could validate expiration here, but server will reject expired IDs anyway
    return existing;
  }
  
  // Request new signed ID from server
  try {
    const signedId = await requestAnonymousId();
    
    // Store for future use
    localStorage.setItem(STORAGE_KEY, signedId);
    
    return signedId;
  } catch (error) {
    console.error('Failed to get anonymous ID:', error);
    // Return empty string - calling code should handle gracefully
    return '';
  }
}

/**
 * Synchronous version for contexts that can't use async
 * Returns cached ID or empty string if not yet generated
 */
export function getAnonymousIdSync(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  
  return localStorage.getItem(STORAGE_KEY) || '';
}

/**
 * Clear anonymous ID from storage
 * Called after data migration to authenticated account
 */
export function clearAnonymousId(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if anonymous ID exists
 */
export function hasAnonymousId(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  return !!localStorage.getItem(STORAGE_KEY);
}
