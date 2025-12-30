/**
 * Auth Headers Tests
 * 
 * Tests that getAuthHeaders correctly includes CSRF tokens and anonymous IDs.
 */

import { getAuthHeaders } from '../auth-headers';

// Mock dependencies
jest.mock('../../anonymous-id', () => ({
  getAnonymousIdSync: jest.fn(),
}));

jest.mock('../../auth/api-client', () => ({
  isAuthenticated: jest.fn(),
}));

jest.mock('../../csrf', () => ({
  getCsrfToken: jest.fn(),
}));

import { getAnonymousIdSync } from '../../anonymous-id';
import { isAuthenticated } from '../../auth/api-client';
import { getCsrfToken } from '../../csrf';

const mockGetAnonymousIdSync = getAnonymousIdSync as jest.Mock;
const mockIsAuthenticated = isAuthenticated as jest.Mock;
const mockGetCsrfToken = getCsrfToken as jest.Mock;

describe('getAuthHeaders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated.mockReturnValue(false);
    mockGetAnonymousIdSync.mockReturnValue('');
    mockGetCsrfToken.mockReturnValue(null);
  });

  it('should always include Content-Type header', () => {
    const headers = getAuthHeaders();
    
    expect(headers['Content-Type']).toBe('application/json');
  });

  describe('CSRF Token', () => {
    it('should include CSRF token when available', () => {
      const csrfToken = 'test-csrf-token-123';
      mockGetCsrfToken.mockReturnValue(csrfToken);
      
      const headers = getAuthHeaders();
      
      expect(headers['X-CSRF-Token']).toBe(csrfToken);
    });

    it('should not include CSRF token when not available', () => {
      mockGetCsrfToken.mockReturnValue(null);
      
      const headers = getAuthHeaders();
      
      expect(headers['X-CSRF-Token']).toBeUndefined();
    });
  });

  describe('Anonymous ID', () => {
    it('should include anonymous ID when user is not authenticated', () => {
      const anonymousId = 'anon-id-123';
      mockIsAuthenticated.mockReturnValue(false);
      mockGetAnonymousIdSync.mockReturnValue(anonymousId);
      
      const headers = getAuthHeaders();
      
      expect(headers['X-Anonymous-Id']).toBe(anonymousId);
    });

    it('should not include anonymous ID when user is authenticated', () => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetAnonymousIdSync.mockReturnValue('anon-id-123');
      
      const headers = getAuthHeaders();
      
      expect(headers['X-Anonymous-Id']).toBeUndefined();
    });

    it('should not include anonymous ID when it is empty', () => {
      mockIsAuthenticated.mockReturnValue(false);
      mockGetAnonymousIdSync.mockReturnValue('');
      
      const headers = getAuthHeaders();
      
      expect(headers['X-Anonymous-Id']).toBeUndefined();
    });
  });

  describe('Combined Headers', () => {
    it('should include both CSRF token and anonymous ID for anonymous users', () => {
      const csrfToken = 'csrf-123';
      const anonymousId = 'anon-456';
      
      mockGetCsrfToken.mockReturnValue(csrfToken);
      mockIsAuthenticated.mockReturnValue(false);
      mockGetAnonymousIdSync.mockReturnValue(anonymousId);
      
      const headers = getAuthHeaders();
      
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        'X-Anonymous-Id': anonymousId,
      });
    });

    it('should include only CSRF token for authenticated users', () => {
      const csrfToken = 'csrf-123';
      
      mockGetCsrfToken.mockReturnValue(csrfToken);
      mockIsAuthenticated.mockReturnValue(true);
      
      const headers = getAuthHeaders();
      
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      });
    });
  });
});
