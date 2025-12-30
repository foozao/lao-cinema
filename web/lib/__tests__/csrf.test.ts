/**
 * CSRF Token Utilities Tests
 * 
 * Tests CSRF token retrieval and ensureCsrfToken functionality.
 */

import { getCsrfToken, ensureCsrfToken } from '../csrf';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('CSRF Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear cookies
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
  });

  describe('getCsrfToken', () => {
    it('should return null when no cookies exist', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: '',
      });
      
      expect(getCsrfToken()).toBeNull();
    });

    it('should return null when csrf_token cookie does not exist', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'other_cookie=value; another=test',
      });
      
      expect(getCsrfToken()).toBeNull();
    });

    it('should return CSRF token when cookie exists', () => {
      const expectedToken = 'abc123def456';
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: `csrf_token=${expectedToken}; other=value`,
      });
      
      expect(getCsrfToken()).toBe(expectedToken);
    });

    it('should handle csrf_token as only cookie', () => {
      const expectedToken = 'single_token_123';
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: `csrf_token=${expectedToken}`,
      });
      
      expect(getCsrfToken()).toBe(expectedToken);
    });

    it('should handle cookies with whitespace', () => {
      const expectedToken = 'token_with_spaces';
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: `  csrf_token=${expectedToken}  ;  other=value  `,
      });
      
      expect(getCsrfToken()).toBe(expectedToken);
    });
  });

  describe('ensureCsrfToken', () => {
    it('should not fetch if CSRF token already exists', async () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'csrf_token=existing_token',
      });
      
      await ensureCsrfToken();
      
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch health endpoint if no CSRF token exists', async () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: '',
      });
      
      mockFetch.mockResolvedValueOnce({ ok: true });
      
      await ensureCsrfToken();
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      );
    });

    it('should not throw on fetch error', async () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: '',
      });
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      // Should not throw
      await expect(ensureCsrfToken()).resolves.toBeUndefined();
    });
  });
});
