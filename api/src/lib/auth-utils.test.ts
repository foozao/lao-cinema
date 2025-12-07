/**
 * Authentication Utilities Tests
 * 
 * Tests password hashing, session tokens, and validation utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  getSessionExpiration,
  isValidEmail,
  isValidPassword,
  validatePassword,
  generateOAuthState,
  verifyOAuthState,
} from './auth-utils.js';

describe('Auth Utilities', () => {
  // =============================================================================
  // PASSWORD HASHING
  // =============================================================================

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'mySecurePassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).toContain('.'); // Format: salt.hash
      expect(hash.split('.')).toHaveLength(2);
    });

    it('should generate different hashes for same password (due to random salt)', async () => {
      const password = 'mySecurePassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty password', async () => {
      const hash = await hashPassword('');
      
      expect(hash).toBeDefined();
      expect(hash).toContain('.');
    });

    it('should handle special characters', async () => {
      const password = 'p@$$w0rd!#$%^&*()';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).toContain('.');
    });

    it('should handle unicode characters', async () => {
      const password = 'ລະຫັດຜ່ານ123'; // Lao text
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).toContain('.');
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'mySecurePassword123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'mySecurePassword123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword('wrongPassword', hash);
      expect(isValid).toBe(false);
    });

    it('should reject similar password', async () => {
      const password = 'mySecurePassword123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword('mySecurePassword124', hash);
      expect(isValid).toBe(false);
    });

    it('should be case sensitive', async () => {
      const password = 'MyPassword';
      const hash = await hashPassword(password);
      
      expect(await verifyPassword('mypassword', hash)).toBe(false);
      expect(await verifyPassword('MYPASSWORD', hash)).toBe(false);
      expect(await verifyPassword('MyPassword', hash)).toBe(true);
    });

    it('should handle empty password verification', async () => {
      const hash = await hashPassword('');
      
      expect(await verifyPassword('', hash)).toBe(true);
      expect(await verifyPassword('a', hash)).toBe(false);
    });
  });

  // =============================================================================
  // SESSION TOKEN GENERATION
  // =============================================================================

  describe('generateSessionToken', () => {
    it('should generate a 64-character hex string', () => {
      const token = generateSessionToken();
      
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSessionToken());
      }
      
      expect(tokens.size).toBe(100);
    });
  });

  describe('getSessionExpiration', () => {
    it('should default to 30 days', () => {
      const now = Date.now();
      const expiration = getSessionExpiration();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      
      expect(expiration.getTime()).toBeGreaterThanOrEqual(now + thirtyDays - 1000);
      expect(expiration.getTime()).toBeLessThanOrEqual(now + thirtyDays + 1000);
    });

    it('should accept custom duration', () => {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      const expiration = getSessionExpiration(oneHour);
      
      expect(expiration.getTime()).toBeGreaterThanOrEqual(now + oneHour - 1000);
      expect(expiration.getTime()).toBeLessThanOrEqual(now + oneHour + 1000);
    });

    it('should return a Date object', () => {
      const expiration = getSessionExpiration();
      expect(expiration).toBeInstanceOf(Date);
    });
  });

  // =============================================================================
  // VALIDATION
  // =============================================================================

  describe('isValidEmail', () => {
    it('should accept valid email formats', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('user.name@example.com')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
      expect(isValidEmail('user@subdomain.example.com')).toBe(true);
      expect(isValidEmail('user123@example.co.uk')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user@.com')).toBe(false);
      expect(isValidEmail('user @example.com')).toBe(false); // Space
    });
  });

  describe('isValidPassword', () => {
    it('should accept password with 8+ characters', () => {
      expect(isValidPassword('12345678')).toBe(true);
      expect(isValidPassword('password')).toBe(true);
      expect(isValidPassword('a very long password with spaces')).toBe(true);
    });

    it('should reject password with less than 8 characters', () => {
      expect(isValidPassword('')).toBe(false);
      expect(isValidPassword('1234567')).toBe(false);
      expect(isValidPassword('short')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should return valid for 8+ character password', () => {
      const result = validatePassword('password123');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid with error message for short password', () => {
      const result = validatePassword('short');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('8 characters');
    });

    it('should return invalid for empty password', () => {
      const result = validatePassword('');
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // OAUTH STATE MANAGEMENT
  // =============================================================================

  describe('generateOAuthState', () => {
    it('should generate a 64-character hex string', () => {
      const state = generateOAuthState();
      
      expect(state).toHaveLength(64);
      expect(state).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate unique states', () => {
      const states = new Set<string>();
      for (let i = 0; i < 100; i++) {
        states.add(generateOAuthState());
      }
      
      expect(states.size).toBe(100);
    });
  });

  describe('verifyOAuthState', () => {
    it('should verify matching states', () => {
      const state = generateOAuthState();
      expect(verifyOAuthState(state, state)).toBe(true);
    });

    it('should reject non-matching states', () => {
      const state1 = generateOAuthState();
      const state2 = generateOAuthState();
      expect(verifyOAuthState(state1, state2)).toBe(false);
    });

    it('should be timing-safe (constant time comparison)', () => {
      // This test verifies the function works; actual timing safety
      // is ensured by crypto.timingSafeEqual internally
      const state = 'a'.repeat(64);
      const similar = 'a'.repeat(63) + 'b';
      expect(verifyOAuthState(state, similar)).toBe(false);
    });
  });
});
