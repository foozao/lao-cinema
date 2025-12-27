import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkRateLimit,
  recordAttempt,
  resetRateLimit,
  clearAllRateLimits,
  RATE_LIMITS,
} from './rate-limiter.js';

describe('Rate Limiter', () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  afterEach(() => {
    clearAllRateLimits();
  });

  describe('Login Rate Limiting', () => {
    const identifier = '192.168.1.1';
    const config = RATE_LIMITS.LOGIN;

    it('should allow attempts within limit', () => {
      for (let i = 0; i < config.maxAttempts; i++) {
        const result = checkRateLimit('login', identifier, config);
        expect(result.allowed).toBe(true);
        recordAttempt('login', identifier, config);
      }
    });

    it('should block after exceeding max attempts', () => {
      for (let i = 0; i < config.maxAttempts; i++) {
        recordAttempt('login', identifier, config);
      }

      const result = checkRateLimit('login', identifier, config);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeInstanceOf(Date);
    });

    it('should reset after successful login', () => {
      for (let i = 0; i < 3; i++) {
        recordAttempt('login', identifier, config);
      }

      resetRateLimit('login', identifier);

      const result = checkRateLimit('login', identifier, config);
      expect(result.allowed).toBe(true);
    });

    it('should allow attempts after expiration', () => {
      vi.useFakeTimers();
      const now = new Date('2024-01-01T00:00:00Z');
      vi.setSystemTime(now);

      for (let i = 0; i < config.maxAttempts; i++) {
        recordAttempt('login', identifier, config);
      }

      let result = checkRateLimit('login', identifier, config);
      expect(result.allowed).toBe(false);

      vi.setSystemTime(new Date(now.getTime() + (config.windowMinutes + 1) * 60 * 1000));

      result = checkRateLimit('login', identifier, config);
      expect(result.allowed).toBe(true);

      vi.useRealTimers();
    });

    it('should track different IPs independently', () => {
      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';

      for (let i = 0; i < config.maxAttempts; i++) {
        recordAttempt('login', ip1, config);
      }

      const result1 = checkRateLimit('login', ip1, config);
      expect(result1.allowed).toBe(false);

      const result2 = checkRateLimit('login', ip2, config);
      expect(result2.allowed).toBe(true);
    });
  });

  describe('Forgot Password Rate Limiting', () => {
    const identifier = '10.0.0.1';
    const config = RATE_LIMITS.FORGOT_PASSWORD;

    it('should allow attempts within limit', () => {
      for (let i = 0; i < config.maxAttempts; i++) {
        const result = checkRateLimit('forgot-password', identifier, config);
        expect(result.allowed).toBe(true);
        recordAttempt('forgot-password', identifier, config);
      }
    });

    it('should block after exceeding max attempts', () => {
      for (let i = 0; i < config.maxAttempts; i++) {
        recordAttempt('forgot-password', identifier, config);
      }

      const result = checkRateLimit('forgot-password', identifier, config);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
    });

    it('should not interfere with login rate limits', () => {
      const ip = '192.168.1.1';

      for (let i = 0; i < RATE_LIMITS.FORGOT_PASSWORD.maxAttempts; i++) {
        recordAttempt('forgot-password', ip, RATE_LIMITS.FORGOT_PASSWORD);
      }

      const forgotResult = checkRateLimit('forgot-password', ip, RATE_LIMITS.FORGOT_PASSWORD);
      expect(forgotResult.allowed).toBe(false);

      const loginResult = checkRateLimit('login', ip, RATE_LIMITS.LOGIN);
      expect(loginResult.allowed).toBe(true);
    });
  });

  describe('Rate Limit Expiration', () => {
    it('should calculate correct expiration time', () => {
      vi.useFakeTimers();
      const now = new Date('2024-01-01T12:00:00Z');
      vi.setSystemTime(now);

      const identifier = '192.168.1.1';
      const config = RATE_LIMITS.LOGIN;

      recordAttempt('login', identifier, config);
      recordAttempt('login', identifier, config);
      
      for (let i = 0; i < config.maxAttempts - 2; i++) {
        recordAttempt('login', identifier, config);
      }

      const result = checkRateLimit('login', identifier, config);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();

      const expectedExpiry = new Date(now.getTime() + config.windowMinutes * 60 * 1000);
      expect(result.retryAfter?.getTime()).toBe(expectedExpiry.getTime());

      vi.useRealTimers();
    });
  });

  describe('clearAllRateLimits', () => {
    it('should clear all rate limit entries', () => {
      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';

      for (let i = 0; i < RATE_LIMITS.LOGIN.maxAttempts; i++) {
        recordAttempt('login', ip1, RATE_LIMITS.LOGIN);
      }

      for (let i = 0; i < RATE_LIMITS.FORGOT_PASSWORD.maxAttempts; i++) {
        recordAttempt('forgot-password', ip2, RATE_LIMITS.FORGOT_PASSWORD);
      }

      let result1 = checkRateLimit('login', ip1, RATE_LIMITS.LOGIN);
      let result2 = checkRateLimit('forgot-password', ip2, RATE_LIMITS.FORGOT_PASSWORD);
      expect(result1.allowed).toBe(false);
      expect(result2.allowed).toBe(false);

      clearAllRateLimits();

      result1 = checkRateLimit('login', ip1, RATE_LIMITS.LOGIN);
      result2 = checkRateLimit('forgot-password', ip2, RATE_LIMITS.FORGOT_PASSWORD);
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle exactly max attempts correctly', () => {
      const identifier = '192.168.1.1';
      const config = RATE_LIMITS.LOGIN;

      for (let i = 0; i < config.maxAttempts; i++) {
        recordAttempt('login', identifier, config);
      }

      const beforeExceeding = checkRateLimit('login', identifier, config);
      expect(beforeExceeding.allowed).toBe(false);
    });

    it('should handle multiple rapid attempts', () => {
      const identifier = '192.168.1.1';
      const config = RATE_LIMITS.LOGIN;

      for (let i = 0; i < config.maxAttempts * 2; i++) {
        recordAttempt('login', identifier, config);
      }

      const result = checkRateLimit('login', identifier, config);
      expect(result.allowed).toBe(false);
    });

    it('should handle empty identifier', () => {
      const config = RATE_LIMITS.LOGIN;
      
      recordAttempt('login', '', config);
      const result = checkRateLimit('login', '', config);
      
      expect(result.allowed).toBe(true);
    });
  });
});
