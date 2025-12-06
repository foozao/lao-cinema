/**
 * Authentication Utilities
 * 
 * Provides password hashing, session token generation, and user authentication.
 * Designed to be modular and extensible for OAuth providers (Google, Apple).
 */

import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);

// =============================================================================
// PASSWORD HASHING
// =============================================================================

/**
 * Hash a password using scrypt with a random salt
 * @param password - Plain text password
 * @returns Hashed password in format: salt.hash
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}.${derivedKey.toString('hex')}`;
}

/**
 * Verify a password against a hash
 * @param password - Plain text password
 * @param hash - Hashed password in format: salt.hash
 * @returns True if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, storedHash] = hash.split('.');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return storedHash === derivedKey.toString('hex');
}

// =============================================================================
// SESSION TOKEN GENERATION
// =============================================================================

/**
 * Generate a secure random session token
 * @returns 64-character hex string
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calculate session expiration timestamp
 * @param durationMs - Duration in milliseconds (default: 30 days)
 * @returns Date object for expiration
 */
export function getSessionExpiration(durationMs: number = 30 * 24 * 60 * 60 * 1000): Date {
  return new Date(Date.now() + durationMs);
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Requirements: At least 8 characters
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

/**
 * Validate password strength with detailed feedback
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  // Optional: Add more requirements
  // if (!/[A-Z]/.test(password)) {
  //   errors.push('Password must contain at least one uppercase letter');
  // }
  // if (!/[a-z]/.test(password)) {
  //   errors.push('Password must contain at least one lowercase letter');
  // }
  // if (!/[0-9]/.test(password)) {
  //   errors.push('Password must contain at least one number');
  // }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// OAUTH PROVIDER INTERFACE (For Future Implementation)
// =============================================================================

/**
 * OAuth provider interface
 * Implement this interface for each OAuth provider (Google, Apple, etc.)
 */
export interface OAuthProvider {
  name: 'google' | 'apple';
  
  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(redirectUri: string, state: string): string;
  
  /**
   * Exchange authorization code for tokens
   */
  exchangeCodeForTokens(code: string, redirectUri: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
  }>;
  
  /**
   * Get user info from OAuth provider
   */
  getUserInfo(accessToken: string): Promise<{
    providerId: string;
    email: string;
    name?: string;
    picture?: string;
  }>;
}

/**
 * OAuth state management (for CSRF protection)
 */
export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify OAuth state
 */
export function verifyOAuthState(state: string, expectedState: string): boolean {
  return crypto.timingSafeEqual(
    Buffer.from(state),
    Buffer.from(expectedState)
  );
}
