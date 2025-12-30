/**
 * Anonymous ID Tests
 * 
 * Tests anonymous ID generation, storage, and retrieval.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  getAnonymousId,
  getAnonymousIdSync,
  clearAnonymousId,
  hasAnonymousId,
} from '../anonymous-id';
import {
  setupLocalStorageMock,
  createLocalStorageMock,
} from './test-utils';

// Mock fetch
global.fetch = jest.fn();

describe('Anonymous ID', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;
  const mockFetch = global.fetch as jest.Mock;

  beforeEach(() => {
    localStorageMock = setupLocalStorageMock();
    localStorageMock.clear();
    mockFetch.mockClear();
  });

  describe('getAnonymousId', () => {
    it('should request ID from server when not cached', async () => {
      const mockSignedId = 'eyJpZCI6InRlc3QtdXVpZCJ9.signature123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ anonymousId: mockSignedId }),
      });

      const id = await getAnonymousId();
      
      expect(id).toBe(mockSignedId);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/anonymous-id'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
    });

    it('should store signed ID in localStorage', async () => {
      const mockSignedId = 'eyJpZCI6InRlc3QtdXVpZCJ9.signature123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ anonymousId: mockSignedId }),
      });

      await getAnonymousId();
      
      const stored = localStorage.getItem('lao_cinema_anonymous_id');
      expect(stored).toBe(mockSignedId);
    });

    it('should return cached ID without fetching', async () => {
      const cachedId = 'eyJpZCI6ImNhY2hlZC11dWlkIn0.cached_signature';
      localStorage.setItem('lao_cinema_anonymous_id', cachedId);

      const id = await getAnonymousId();
      
      expect(id).toBe(cachedId);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return empty string on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const id = await getAnonymousId();
      
      expect(id).toBe('');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return empty string on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const id = await getAnonymousId();
      
      expect(id).toBe('');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getAnonymousIdSync', () => {
    it('should return cached ID', () => {
      const cachedId = 'eyJpZCI6ImNhY2hlZC11dWlkIn0.cached_signature';
      localStorage.setItem('lao_cinema_anonymous_id', cachedId);

      const id = getAnonymousIdSync();
      
      expect(id).toBe(cachedId);
    });

    it('should return empty string if not cached', () => {
      const id = getAnonymousIdSync();
      
      expect(id).toBe('');
    });
  });

  describe('clearAnonymousId', () => {
    it('should remove anonymous ID from localStorage', async () => {
      // Store an ID first
      const mockSignedId = 'eyJpZCI6InRlc3QtdXVpZCJ9.signature123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ anonymousId: mockSignedId }),
      });
      await getAnonymousId();
      expect(localStorage.getItem('lao_cinema_anonymous_id')).not.toBeNull();
      
      // Clear it
      clearAnonymousId();
      expect(localStorage.getItem('lao_cinema_anonymous_id')).toBeNull();
    });

    it('should not throw when no ID exists', () => {
      expect(() => clearAnonymousId()).not.toThrow();
    });

    it('should allow generating new ID after clearing', async () => {
      const mockSignedId1 = 'eyJpZCI6InRlc3QtdXVpZCJ9.signature123';
      const mockSignedId2 = 'eyJpZCI6ImRpZmZlcmVudC11dWlkIn0.signature456';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ anonymousId: mockSignedId1 }),
      });
      const id1 = await getAnonymousId();
      
      clearAnonymousId();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ anonymousId: mockSignedId2 }),
      });
      const id2 = await getAnonymousId();
      
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });
  });

  describe('hasAnonymousId', () => {
    it('should return false when no ID exists', () => {
      expect(hasAnonymousId()).toBe(false);
    });

    it('should return true after storing ID', async () => {
      const mockSignedId = 'eyJpZCI6InRlc3QtdXVpZCJ9.signature123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ anonymousId: mockSignedId }),
      });
      
      await getAnonymousId();
      expect(hasAnonymousId()).toBe(true);
    });

    it('should return false after clearing ID', async () => {
      const mockSignedId = 'eyJpZCI6InRlc3QtdXVpZCJ9.signature123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ anonymousId: mockSignedId }),
      });
      
      await getAnonymousId();
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
    it('should persist across multiple function calls', async () => {
      const mockSignedId = 'eyJpZCI6InRlc3QtdXVpZCJ9.signature123';
      localStorage.setItem('lao_cinema_anonymous_id', mockSignedId);
      
      // Simulate multiple reads - should use cache
      for (let i = 0; i < 10; i++) {
        const id = await getAnonymousId();
        expect(id).toBe(mockSignedId);
        expect(hasAnonymousId()).toBe(true);
      }
      
      // Should not have fetched since ID was cached
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should use correct storage key', async () => {
      const mockSignedId = 'eyJpZCI6InRlc3QtdXVpZCJ9.signature123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ anonymousId: mockSignedId }),
      });
      
      await getAnonymousId();
      
      // Verify the exact storage key
      expect(localStorage.getItem('lao_cinema_anonymous_id')).not.toBeNull();
      expect(localStorage.getItem('anonymous_id')).toBeNull(); // Wrong key
      expect(localStorage.getItem('laocinema_anon')).toBeNull(); // Wrong key
    });
  });
});
