/**
 * Rentals Client Tests
 *
 * Tests the rentals API client functions.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock auth-headers module
jest.mock('../auth-headers', () => ({
  __esModule: true,
  getAuthHeaders: jest.fn(() => ({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token',
  })),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import after mocks
import {
  getRentals,
  getRentalStatus,
  createRental,
  hasActiveRental,
  createPackRental,
  checkMovieAccess,
} from '../rentals-client';

describe('Rentals Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRentals', () => {
    it('should fetch all rentals', async () => {
      const mockRentals = {
        rentals: [
          { id: 'rental-1', movieId: 'movie-1', expiresAt: new Date().toISOString() },
        ],
        total: 1,
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRentals),
      });

      const result = await getRentals();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rentals'),
        expect.any(Object)
      );
      expect(result).toEqual(mockRentals);
    });

    it('should include includeRecent param when true', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ rentals: [], total: 0 }),
      });

      await getRentals(true);

      expect(mockFetch.mock.calls[0][0]).toContain('includeRecent=true');
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      await expect(getRentals()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getRentalStatus', () => {
    it('should fetch rental status for movie', async () => {
      const mockStatus = {
        rental: { id: 'rental-1', movieId: 'movie-123' },
        expired: false,
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockStatus),
      });

      const result = await getRentalStatus('movie-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rentals/movie-123'),
        expect.any(Object)
      );
      expect(result).toEqual(mockStatus);
    });

    it('should return null rental when none exists', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ rental: null }),
      });

      const result = await getRentalStatus('movie-no-rental');

      expect(result.rental).toBeNull();
    });
  });

  describe('createRental', () => {
    it('should create a rental', async () => {
      const mockRental = {
        rental: {
          id: 'new-rental-1',
          movieId: 'movie-123',
          transactionId: 'txn-123',
        },
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRental),
      });

      const result = await createRental('movie-123', {
        transactionId: 'txn-123',
        amount: 500,
        paymentMethod: 'stripe',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rentals/movie-123'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            transactionId: 'txn-123',
            amount: 500,
            paymentMethod: 'stripe',
          }),
        })
      );
      expect(result).toEqual(mockRental);
    });

    it('should throw on rental creation failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Already rented' }),
      });

      await expect(
        createRental('movie-123', { transactionId: 'txn-123' })
      ).rejects.toThrow('Already rented');
    });
  });

  describe('hasActiveRental', () => {
    it('should return true for active rental', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          rental: { id: 'rental-1' },
          expired: false,
        }),
      });

      const result = await hasActiveRental('movie-123');

      expect(result).toBe(true);
    });

    it('should return false for expired rental', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          rental: { id: 'rental-1' },
          expired: true,
        }),
      });

      const result = await hasActiveRental('movie-123');

      expect(result).toBe(false);
    });

    it('should return false when no rental exists', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ rental: null }),
      });

      const result = await hasActiveRental('movie-123');

      expect(result).toBe(false);
    });

    it('should return false on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Error' }),
      });

      const result = await hasActiveRental('movie-123');

      expect(result).toBe(false);
    });
  });

  describe('createPackRental', () => {
    it('should create a pack rental', async () => {
      const mockResponse = {
        rental: {
          id: 'pack-rental-1',
          shortPackId: 'pack-123',
        },
        pack: {
          id: 'pack-123',
          slug: 'action-pack',
          title: { en: 'Action Pack' },
        },
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await createPackRental('pack-123', {
        transactionId: 'txn-pack-1',
        amount: 999,
        paymentMethod: 'stripe',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rentals/packs/pack-123'),
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('checkMovieAccess', () => {
    it('should check movie access via direct rental', async () => {
      const mockResponse = {
        hasAccess: true,
        accessType: 'movie',
        rental: { id: 'rental-1', expiresAt: new Date().toISOString() },
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await checkMovieAccess('movie-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rentals/access/movie-123'),
        expect.any(Object)
      );
      expect(result.hasAccess).toBe(true);
      expect(result.accessType).toBe('movie');
    });

    it('should check movie access via pack rental', async () => {
      const mockResponse = {
        hasAccess: true,
        accessType: 'pack',
        rental: { id: 'pack-rental-1', shortPackId: 'pack-123' },
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await checkMovieAccess('movie-in-pack');

      expect(result.hasAccess).toBe(true);
      expect(result.accessType).toBe('pack');
    });

    it('should return no access when not rented', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ hasAccess: false }),
      });

      const result = await checkMovieAccess('movie-not-rented');

      expect(result.hasAccess).toBe(false);
    });
  });
});
