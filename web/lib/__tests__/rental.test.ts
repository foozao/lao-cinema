import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  RENTAL_DURATION_MS,
  getRental,
  isRentalValid,
  getRemainingTime,
  formatRemainingTime,
  storeRental,
  clearRental,
  getAllRentals,
  clearExpiredRentals,
  type RentalRecord,
} from '../rental';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

describe('Rental Service', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('RENTAL_DURATION_MS', () => {
    it('should be 24 hours in milliseconds', () => {
      expect(RENTAL_DURATION_MS).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('storeRental', () => {
    it('should store a rental record in localStorage', () => {
      const movieId = 'movie-123';
      const now = Date.now();
      jest.setSystemTime(now);

      const record = storeRental(movieId);

      expect(record.movieId).toBe(movieId);
      expect(record.purchasedAt).toBe(now);
      expect(record.expiresAt).toBe(now + RENTAL_DURATION_MS);
    });

    it('should create a properly formatted localStorage key', () => {
      storeRental('test-movie');
      
      const stored = localStorage.getItem('lao_cinema_rental_test-movie');
      expect(stored).not.toBeNull();
    });
  });

  describe('getRental', () => {
    it('should retrieve a stored rental', () => {
      const movieId = 'movie-456';
      storeRental(movieId);

      const rental = getRental(movieId);

      expect(rental).not.toBeNull();
      expect(rental?.movieId).toBe(movieId);
    });

    it('should return null for non-existent rental', () => {
      const rental = getRental('non-existent');
      expect(rental).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      localStorage.setItem('lao_cinema_rental_bad', 'not-json');
      const rental = getRental('bad');
      expect(rental).toBeNull();
    });
  });

  describe('isRentalValid', () => {
    it('should return true for a fresh rental', () => {
      const movieId = 'fresh-movie';
      storeRental(movieId);

      expect(isRentalValid(movieId)).toBe(true);
    });

    it('should return false for non-existent rental', () => {
      expect(isRentalValid('non-existent')).toBe(false);
    });

    it('should return false for expired rental', () => {
      const movieId = 'expired-movie';
      const now = Date.now();
      jest.setSystemTime(now);
      
      storeRental(movieId);
      
      // Advance time past expiration
      jest.setSystemTime(now + RENTAL_DURATION_MS + 1000);
      
      expect(isRentalValid(movieId)).toBe(false);
    });

    it('should return true just before expiration', () => {
      const movieId = 'almost-expired';
      const now = Date.now();
      jest.setSystemTime(now);
      
      storeRental(movieId);
      
      // Advance time to 1ms before expiration
      jest.setSystemTime(now + RENTAL_DURATION_MS - 1);
      
      expect(isRentalValid(movieId)).toBe(true);
    });
  });

  describe('getRemainingTime', () => {
    it('should return correct remaining time for fresh rental', () => {
      const movieId = 'timed-movie';
      const now = Date.now();
      jest.setSystemTime(now);
      
      storeRental(movieId);
      
      expect(getRemainingTime(movieId)).toBe(RENTAL_DURATION_MS);
    });

    it('should return 0 for expired rental', () => {
      const movieId = 'expired';
      const now = Date.now();
      jest.setSystemTime(now);
      
      storeRental(movieId);
      jest.setSystemTime(now + RENTAL_DURATION_MS + 1000);
      
      expect(getRemainingTime(movieId)).toBe(0);
    });

    it('should return 0 for non-existent rental', () => {
      expect(getRemainingTime('non-existent')).toBe(0);
    });

    it('should decrease over time', () => {
      const movieId = 'decreasing';
      const now = Date.now();
      jest.setSystemTime(now);
      
      storeRental(movieId);
      
      const oneHourLater = 60 * 60 * 1000;
      jest.setSystemTime(now + oneHourLater);
      
      expect(getRemainingTime(movieId)).toBe(RENTAL_DURATION_MS - oneHourLater);
    });
  });

  describe('formatRemainingTime', () => {
    it('should format hours and minutes correctly', () => {
      const movieId = 'format-test';
      const now = Date.now();
      jest.setSystemTime(now);
      
      storeRental(movieId);
      
      // Should show 24h 0m (or close to it)
      const formatted = formatRemainingTime(movieId);
      expect(formatted).toMatch(/^\d+h \d+m$/);
    });

    it('should show only minutes when less than 1 hour', () => {
      const movieId = 'short-time';
      const now = Date.now();
      jest.setSystemTime(now);
      
      storeRental(movieId);
      
      // Advance to 30 minutes remaining
      jest.setSystemTime(now + RENTAL_DURATION_MS - 30 * 60 * 1000);
      
      const formatted = formatRemainingTime(movieId);
      expect(formatted).toBe('30m');
    });

    it('should return empty string for expired rental', () => {
      const movieId = 'expired-format';
      const now = Date.now();
      jest.setSystemTime(now);
      
      storeRental(movieId);
      jest.setSystemTime(now + RENTAL_DURATION_MS + 1000);
      
      expect(formatRemainingTime(movieId)).toBe('');
    });
  });

  describe('clearRental', () => {
    it('should remove a rental from localStorage', () => {
      const movieId = 'to-clear';
      storeRental(movieId);
      
      expect(getRental(movieId)).not.toBeNull();
      
      clearRental(movieId);
      
      expect(getRental(movieId)).toBeNull();
    });

    it('should not throw when clearing non-existent rental', () => {
      expect(() => clearRental('non-existent')).not.toThrow();
    });
  });

  describe('getAllRentals', () => {
    it('should return all stored rentals', () => {
      storeRental('movie-1');
      storeRental('movie-2');
      storeRental('movie-3');
      
      const rentals = getAllRentals();
      
      expect(rentals).toHaveLength(3);
      expect(rentals.map(r => r.movieId)).toContain('movie-1');
      expect(rentals.map(r => r.movieId)).toContain('movie-2');
      expect(rentals.map(r => r.movieId)).toContain('movie-3');
    });

    it('should return empty array when no rentals', () => {
      const rentals = getAllRentals();
      expect(rentals).toHaveLength(0);
    });
  });

  describe('clearExpiredRentals', () => {
    it('should clear only expired rentals', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      
      storeRental('fresh-1');
      storeRental('fresh-2');
      
      // Manually create an expired rental
      const expiredRecord: RentalRecord = {
        movieId: 'expired-1',
        purchasedAt: now - RENTAL_DURATION_MS - 1000,
        expiresAt: now - 1000,
      };
      localStorage.setItem('lao_cinema_rental_expired-1', JSON.stringify(expiredRecord));
      
      clearExpiredRentals();
      
      // Fresh rentals should remain
      expect(getRental('fresh-1')).not.toBeNull();
      expect(getRental('fresh-2')).not.toBeNull();
      
      // Expired rental should be gone
      expect(getRental('expired-1')).toBeNull();
    });
  });

  describe('per-movie rental isolation', () => {
    it('should track rentals independently per movie', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      
      storeRental('movie-a');
      
      // Advance 1 hour
      jest.setSystemTime(now + 60 * 60 * 1000);
      
      storeRental('movie-b');
      
      // movie-a should have less time remaining than movie-b
      const remainingA = getRemainingTime('movie-a');
      const remainingB = getRemainingTime('movie-b');
      
      expect(remainingB).toBeGreaterThan(remainingA);
      expect(remainingB - remainingA).toBe(60 * 60 * 1000);
    });

    it('should allow clearing one rental without affecting others', () => {
      storeRental('keep-1');
      storeRental('remove-1');
      storeRental('keep-2');
      
      clearRental('remove-1');
      
      expect(isRentalValid('keep-1')).toBe(true);
      expect(isRentalValid('remove-1')).toBe(false);
      expect(isRentalValid('keep-2')).toBe(true);
    });
  });
});
