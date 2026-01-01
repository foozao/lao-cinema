/**
 * CSRF Token Utilities Tests
 * 
 * Tests CSRF token retrieval and ensureCsrfToken functionality.
 * CSRF tokens are stored in memory and fetched from the API (not cookies)
 * because cross-origin cookies cannot be read via document.cookie.
 */

import { getCsrfToken, setCsrfToken, clearCsrfToken, ensureCsrfToken } from '../csrf';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('CSRF Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the in-memory token cache
    clearCsrfToken();
  });

  describe('getCsrfToken', () => {
    it('should return null when no token is cached', () => {
      expect(getCsrfToken()).toBeNull();
    });

    it('should return token after setCsrfToken is called', () => {
      const expectedToken = 'abc123def456';
      setCsrfToken(expectedToken);
      
      expect(getCsrfToken()).toBe(expectedToken);
    });

    it('should return null after clearCsrfToken is called', () => {
      setCsrfToken('some_token');
      clearCsrfToken();
      
      expect(getCsrfToken()).toBeNull();
    });
  });

  describe('ensureCsrfToken', () => {
    it('should not fetch if CSRF token already exists in cache', async () => {
      setCsrfToken('existing_token');
      
      await ensureCsrfToken();
      
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch /api/csrf endpoint if no CSRF token exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: 'new_token_from_api' }),
      });
      
      await ensureCsrfToken();
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/csrf'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      );
    });

    it('should cache token from API response', async () => {
      const expectedToken = 'fetched_token_123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: expectedToken }),
      });
      
      await ensureCsrfToken();
      
      expect(getCsrfToken()).toBe(expectedToken);
    });

    it('should not throw on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      // Should not throw
      await expect(ensureCsrfToken()).resolves.toBeUndefined();
    });

    it('should handle non-ok response gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });
      
      await ensureCsrfToken();
      
      // Token should remain null
      expect(getCsrfToken()).toBeNull();
    });
  });
});
