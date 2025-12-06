/**
 * Anonymous ID Management
 * 
 * Generates and manages stable anonymous IDs for tracking user data
 * before they create an account. Uses localStorage + browser fingerprint.
 */

const STORAGE_KEY = 'lao_cinema_anonymous_id';

/**
 * Simple hash function for browser fingerprinting
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate a random string
 */
function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Create a simple browser fingerprint
 * Not for security - just for creating a stable-ish ID
 */
function createFingerprint(): string {
  if (typeof window === 'undefined') {
    return 'server';
  }
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
  ].join('|');
  
  return simpleHash(fingerprint);
}

/**
 * Get or create anonymous ID
 * Format: anon_{timestamp}_{fingerprint}_{random}
 */
export function getAnonymousId(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  
  // Try to get existing ID from localStorage
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    return existing;
  }
  
  // Generate new ID
  const timestamp = Date.now();
  const fingerprint = createFingerprint();
  const random = randomString(8);
  const anonymousId = `anon_${timestamp}_${fingerprint}_${random}`;
  
  // Store for future use
  localStorage.setItem(STORAGE_KEY, anonymousId);
  
  return anonymousId;
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
