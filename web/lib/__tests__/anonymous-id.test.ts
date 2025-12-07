/**
 * Anonymous ID Tests
 * 
 * Tests anonymous ID generation, storage, and retrieval.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  getAnonymousId,
  clearAnonymousId,
  hasAnonymousId,
} from '../anonymous-id';

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

// Mock navigator and screen for fingerprinting
Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Test Browser',
    language: 'en-US',
  },
  configurable: true,
});

Object.defineProperty(global, 'screen', {
  value: {
    width: 1920,
    height: 1080,
    colorDepth: 24,
  },
  configurable: true,
});

describe('Anonymous ID', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('getAnonymousId', () => {
    it('should generate an anonymous ID', () => {
      const id = getAnonymousId();
      
      expect(id).toBeDefined();
      expect(id.length).toBeGreaterThan(0);
    });

    it('should have correct format: anon_{timestamp}_{fingerprint}_{random}', () => {
      const id = getAnonymousId();
      
      expect(id).toMatch(/^anon_\d+_[a-z0-9]+_[a-z0-9]{8}$/);
    });

    it('should start with "anon_" prefix', () => {
      const id = getAnonymousId();
      
      expect(id.startsWith('anon_')).toBe(true);
    });

    it('should include timestamp component', () => {
      const beforeTime = Date.now();
      const id = getAnonymousId();
      const afterTime = Date.now();
      
      // Extract timestamp from ID
      const parts = id.split('_');
      const timestamp = parseInt(parts[1]);
      
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should store ID in localStorage', () => {
      const id = getAnonymousId();
      
      const stored = localStorage.getItem('lao_cinema_anonymous_id');
      expect(stored).toBe(id);
    });

    it('should return same ID on subsequent calls', () => {
      const id1 = getAnonymousId();
      const id2 = getAnonymousId();
      const id3 = getAnonymousId();
      
      expect(id1).toBe(id2);
      expect(id2).toBe(id3);
    });

    it('should return stored ID if exists', () => {
      const existingId = 'anon_1234567890_abc123_random12';
      localStorage.setItem('lao_cinema_anonymous_id', existingId);
      
      const id = getAnonymousId();
      expect(id).toBe(existingId);
    });

    it('should generate unique IDs for fresh storage', () => {
      const id1 = getAnonymousId();
      localStorageMock.clear();
      const id2 = getAnonymousId();
      
      // IDs should be different due to different timestamps and random components
      expect(id1).not.toBe(id2);
    });
  });

  describe('clearAnonymousId', () => {
    it('should remove anonymous ID from localStorage', () => {
      // Generate an ID first
      getAnonymousId();
      expect(localStorage.getItem('lao_cinema_anonymous_id')).not.toBeNull();
      
      // Clear it
      clearAnonymousId();
      expect(localStorage.getItem('lao_cinema_anonymous_id')).toBeNull();
    });

    it('should not throw when no ID exists', () => {
      expect(() => clearAnonymousId()).not.toThrow();
    });

    it('should allow generating new ID after clearing', () => {
      const id1 = getAnonymousId();
      clearAnonymousId();
      const id2 = getAnonymousId();
      
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });
  });

  describe('hasAnonymousId', () => {
    it('should return false when no ID exists', () => {
      expect(hasAnonymousId()).toBe(false);
    });

    it('should return true after generating ID', () => {
      getAnonymousId();
      expect(hasAnonymousId()).toBe(true);
    });

    it('should return false after clearing ID', () => {
      getAnonymousId();
      expect(hasAnonymousId()).toBe(true);
      
      clearAnonymousId();
      expect(hasAnonymousId()).toBe(false);
    });

    it('should return true for manually stored ID', () => {
      localStorage.setItem('lao_cinema_anonymous_id', 'test_id');
      expect(hasAnonymousId()).toBe(true);
    });
  });

  describe('ID Persistence', () => {
    it('should persist across multiple function calls', () => {
      const id = getAnonymousId();
      
      // Simulate multiple reads
      for (let i = 0; i < 10; i++) {
        expect(getAnonymousId()).toBe(id);
        expect(hasAnonymousId()).toBe(true);
      }
    });

    it('should use correct storage key', () => {
      getAnonymousId();
      
      // Verify the exact storage key
      expect(localStorage.getItem('lao_cinema_anonymous_id')).not.toBeNull();
      expect(localStorage.getItem('anonymous_id')).toBeNull(); // Wrong key
      expect(localStorage.getItem('laocinema_anon')).toBeNull(); // Wrong key
    });
  });

  describe('ID Format Validation', () => {
    it('should generate IDs with consistent structure', () => {
      // Clear and generate multiple IDs
      const ids: string[] = [];
      for (let i = 0; i < 5; i++) {
        localStorageMock.clear();
        ids.push(getAnonymousId());
      }
      
      for (const id of ids) {
        const parts = id.split('_');
        expect(parts).toHaveLength(4);
        expect(parts[0]).toBe('anon');
        expect(parseInt(parts[1])).toBeGreaterThan(0); // Timestamp
        expect(parts[2].length).toBeGreaterThan(0); // Fingerprint
        expect(parts[3]).toHaveLength(8); // Random
      }
    });
  });
});
