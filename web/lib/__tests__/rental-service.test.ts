/**
 * Rental Service Tests
 * 
 * Tests the database-backed rental service that wraps the API client.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock the API client module - must use jest.fn() inside factory since jest.mock is hoisted
jest.mock('../api/rentals-client', () => ({
  __esModule: true,
  getRentals: jest.fn(),
  getRentalStatus: jest.fn(),
  createRental: jest.fn(),
  hasActiveRental: jest.fn(),
}));

// Import the mocked module to get references to the mock functions
import * as rentalsClient from '../api/rentals-client';

// Import the module under test
import {
  RENTAL_DURATION_MS,
  GRACE_PERIOD_MS,
  isRentalValid,
  isInGracePeriod,
  canWatch,
  getRemainingTime,
  getRemainingGraceTime,
  getFormattedRemainingTime,
  purchaseRental,
  getAllRentals,
  getActiveRentals,
  hasActiveRental,
} from '../rental-service';

// Get typed references to the mocked functions
const mockGetRentals = rentalsClient.getRentals as jest.Mock;
const mockGetRentalStatus = rentalsClient.getRentalStatus as jest.Mock;
const mockApiCreateRental = rentalsClient.createRental as jest.Mock;
const mockApiHasActiveRental = rentalsClient.hasActiveRental as jest.Mock;

describe('Rental Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should have correct rental duration (24 hours)', () => {
      expect(RENTAL_DURATION_MS).toBe(24 * 60 * 60 * 1000);
    });

    it('should have correct grace period (2 hours)', () => {
      expect(GRACE_PERIOD_MS).toBe(2 * 60 * 60 * 1000);
    });
  });

  describe('isRentalValid', () => {
    it('should return true for valid rental', async () => {
      mockGetRentalStatus.mockResolvedValue({
        rental: {
          id: 'rental-1',
          movieId: 'movie-1',
          purchasedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours from now
          transactionId: 'txn-1',
          amount: 500,
          currency: 'USD',
          paymentMethod: 'demo',
        },
        expired: false,
      });

      const result = await isRentalValid('movie-1');
      expect(result).toBe(true);
      expect(mockGetRentalStatus).toHaveBeenCalledWith('movie-1');
    });

    it('should return false for expired rental', async () => {
      mockGetRentalStatus.mockResolvedValue({
        rental: null,
        expired: true,
        expiredAt: new Date(Date.now() - 1000).toISOString(),
      });

      const result = await isRentalValid('movie-1');
      expect(result).toBe(false);
    });

    it('should return false for non-existent rental', async () => {
      mockGetRentalStatus.mockResolvedValue({
        rental: null,
      });

      const result = await isRentalValid('movie-1');
      expect(result).toBe(false);
    });

    it('should return false on API error', async () => {
      mockGetRentalStatus.mockRejectedValue(new Error('Network error'));

      const result = await isRentalValid('movie-1');
      expect(result).toBe(false);
    });
  });

  describe('isInGracePeriod', () => {
    it('should return false for valid rental', async () => {
      mockGetRentalStatus.mockResolvedValue({
        rental: {
          id: 'rental-1',
          movieId: 'movie-1',
          purchasedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
          transactionId: 'txn-1',
          amount: 500,
          currency: 'USD',
          paymentMethod: 'demo',
        },
        expired: false,
      });

      const result = await isInGracePeriod('movie-1');
      expect(result).toBe(false);
    });

    it('should return true when rental just expired', async () => {
      const expiredAt = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 minutes ago
      
      mockGetRentalStatus.mockResolvedValue({
        rental: {
          id: 'rental-1',
          movieId: 'movie-1',
          purchasedAt: new Date().toISOString(),
          expiresAt: expiredAt,
          transactionId: 'txn-1',
          amount: 500,
          currency: 'USD',
          paymentMethod: 'demo',
        },
        expired: true,
        expiredAt,
      });

      const result = await isInGracePeriod('movie-1');
      expect(result).toBe(true);
    });

    it('should return false after grace period ends', async () => {
      const expiredAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(); // 3 hours ago (past grace)
      
      mockGetRentalStatus.mockResolvedValue({
        rental: {
          id: 'rental-1',
          movieId: 'movie-1',
          purchasedAt: new Date().toISOString(),
          expiresAt: expiredAt,
          transactionId: 'txn-1',
          amount: 500,
          currency: 'USD',
          paymentMethod: 'demo',
        },
        expired: true,
        expiredAt,
      });

      const result = await isInGracePeriod('movie-1');
      expect(result).toBe(false);
    });

    it('should return false for non-existent rental', async () => {
      mockGetRentalStatus.mockResolvedValue({
        rental: null,
      });

      const result = await isInGracePeriod('movie-1');
      expect(result).toBe(false);
    });

    it('should return false on API error', async () => {
      mockGetRentalStatus.mockRejectedValue(new Error('Network error'));

      const result = await isInGracePeriod('movie-1');
      expect(result).toBe(false);
    });
  });

  describe('canWatch', () => {
    it.skip('should return true for valid rental', async () => {
      mockGetRentalStatus.mockResolvedValue({
        rental: {
          id: 'rental-1',
          movieId: 'movie-1',
          purchasedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          transactionId: 'txn-1',
          amount: 500,
          currency: 'USD',
          paymentMethod: 'demo',
        },
        expired: false,
      });

      const result = await canWatch('movie-1');
      expect(result).toBe(true);
    });

    it.skip('should return true during grace period', async () => {
      const expiredAt = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 minutes ago
      
      // First call for isRentalValid - returns expired
      mockGetRentalStatus.mockResolvedValueOnce({
        rental: null,
        expired: true,
        expiredAt,
      });
      
      // Second call for isInGracePeriod - returns within grace
      mockGetRentalStatus.mockResolvedValueOnce({
        rental: {
          id: 'rental-1',
          movieId: 'movie-1',
          purchasedAt: new Date().toISOString(),
          expiresAt: expiredAt,
          transactionId: 'txn-1',
          amount: 500,
          currency: 'USD',
          paymentMethod: 'demo',
        },
        expired: true,
        expiredAt,
      });

      const result = await canWatch('movie-1');
      expect(result).toBe(true);
    });

    it.skip('should return false after grace period', async () => {
      const expiredAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(); // 3 hours ago
      
      mockGetRentalStatus.mockResolvedValue({
        rental: null,
        expired: true,
        expiredAt,
      });

      const result = await canWatch('movie-1');
      expect(result).toBe(false);
    });

    it('should return false for non-existent rental', async () => {
      mockGetRentalStatus.mockResolvedValue({
        rental: null,
      });

      const result = await canWatch('movie-1');
      expect(result).toBe(false);
    });
  });

  describe('getRemainingTime', () => {
    it('should return correct remaining time for active rental', async () => {
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours from now
      
      mockGetRentalStatus.mockResolvedValue({
        rental: {
          id: 'rental-1',
          movieId: 'movie-1',
          purchasedAt: new Date().toISOString(),
          expiresAt: expiresAt.toISOString(),
          transactionId: 'txn-1',
          amount: 500,
          currency: 'USD',
          paymentMethod: 'demo',
        },
      });

      const result = await getRemainingTime('movie-1');
      // Allow some tolerance for test execution time
      expect(result).toBeGreaterThan(11.9 * 60 * 60 * 1000);
      expect(result).toBeLessThanOrEqual(12 * 60 * 60 * 1000);
    });

    it('should return 0 for expired rental', async () => {
      mockGetRentalStatus.mockResolvedValue({
        rental: {
          id: 'rental-1',
          movieId: 'movie-1',
          purchasedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired
          transactionId: 'txn-1',
          amount: 500,
          currency: 'USD',
          paymentMethod: 'demo',
        },
      });

      const result = await getRemainingTime('movie-1');
      expect(result).toBe(0);
    });

    it('should return 0 for non-existent rental', async () => {
      mockGetRentalStatus.mockResolvedValue({
        rental: null,
      });

      const result = await getRemainingTime('movie-1');
      expect(result).toBe(0);
    });

    it('should return 0 on API error', async () => {
      mockGetRentalStatus.mockRejectedValue(new Error('Network error'));

      const result = await getRemainingTime('movie-1');
      expect(result).toBe(0);
    });
  });

  describe('getRemainingGraceTime', () => {
    it('should return 0 for valid rental', async () => {
      mockGetRentalStatus.mockResolvedValue({
        rental: {
          id: 'rental-1',
          movieId: 'movie-1',
          purchasedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
          transactionId: 'txn-1',
          amount: 500,
          currency: 'USD',
          paymentMethod: 'demo',
        },
        expired: false,
      });

      const result = await getRemainingGraceTime('movie-1');
      expect(result).toBe(0);
    });

    it('should return correct grace time for just-expired rental', async () => {
      const expiresAt = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      
      mockGetRentalStatus.mockResolvedValue({
        rental: {
          id: 'rental-1',
          movieId: 'movie-1',
          purchasedAt: new Date().toISOString(),
          expiresAt: expiresAt.toISOString(),
          transactionId: 'txn-1',
          amount: 500,
          currency: 'USD',
          paymentMethod: 'demo',
        },
        expired: true,
      });

      const result = await getRemainingGraceTime('movie-1');
      // Should be about 1.5 hours (2 hours grace - 30 minutes elapsed)
      expect(result).toBeGreaterThan(1.4 * 60 * 60 * 1000);
      expect(result).toBeLessThanOrEqual(1.5 * 60 * 60 * 1000);
    });

    it('should return 0 after grace period ends', async () => {
      mockGetRentalStatus.mockResolvedValue({
        rental: {
          id: 'rental-1',
          movieId: 'movie-1',
          purchasedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
          transactionId: 'txn-1',
          amount: 500,
          currency: 'USD',
          paymentMethod: 'demo',
        },
        expired: true,
      });

      const result = await getRemainingGraceTime('movie-1');
      expect(result).toBe(0);
    });

    it('should return 0 for non-existent rental', async () => {
      mockGetRentalStatus.mockResolvedValue({
        rental: null,
      });

      const result = await getRemainingGraceTime('movie-1');
      expect(result).toBe(0);
    });
  });

  describe('getFormattedRemainingTime', () => {
    it('should format active rental time', async () => {
      mockGetRentalStatus.mockResolvedValue({
        rental: {
          id: 'rental-1',
          movieId: 'movie-1',
          purchasedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours
          transactionId: 'txn-1',
          amount: 500,
          currency: 'USD',
          paymentMethod: 'demo',
        },
      });

      const result = await getFormattedRemainingTime('movie-1');
      expect(result).toMatch(/^\d+h \d+m$/);
    });

    it('should show grace period message for expired rental', async () => {
      // First call for getRemainingTime
      mockGetRentalStatus.mockResolvedValueOnce({
        rental: {
          id: 'rental-1',
          movieId: 'movie-1',
          purchasedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
          transactionId: 'txn-1',
          amount: 500,
          currency: 'USD',
          paymentMethod: 'demo',
        },
      });
      
      // Second call for getRemainingGraceTime
      mockGetRentalStatus.mockResolvedValueOnce({
        rental: {
          id: 'rental-1',
          movieId: 'movie-1',
          purchasedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
          transactionId: 'txn-1',
          amount: 500,
          currency: 'USD',
          paymentMethod: 'demo',
        },
        expired: true,
      });

      const result = await getFormattedRemainingTime('movie-1');
      expect(result).toContain('Grace period');
    });

    it('should show "Expired" after grace period', async () => {
      // First call for getRemainingTime
      mockGetRentalStatus.mockResolvedValueOnce({
        rental: {
          id: 'rental-1',
          movieId: 'movie-1',
          purchasedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
          transactionId: 'txn-1',
          amount: 500,
          currency: 'USD',
          paymentMethod: 'demo',
        },
      });
      
      // Second call for getRemainingGraceTime
      mockGetRentalStatus.mockResolvedValueOnce({
        rental: {
          id: 'rental-1',
          movieId: 'movie-1',
          purchasedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
          transactionId: 'txn-1',
          amount: 500,
          currency: 'USD',
          paymentMethod: 'demo',
        },
        expired: true,
      });

      const result = await getFormattedRemainingTime('movie-1');
      expect(result).toBe('Expired');
    });
  });

  describe('purchaseRental', () => {
    it('should create a rental via API', async () => {
      const mockRental = {
        id: 'rental-1',
        movieId: 'movie-1',
        purchasedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        transactionId: 'txn-purchase',
        amount: 500,
        currency: 'USD',
        paymentMethod: 'demo',
      };
      
      mockApiCreateRental.mockResolvedValue({ rental: mockRental });

      const result = await purchaseRental('movie-1', 'txn-purchase', 500, 'demo');
      
      expect(result).toEqual(mockRental);
      expect(mockApiCreateRental).toHaveBeenCalledWith('movie-1', {
        transactionId: 'txn-purchase',
        amount: 500,
        paymentMethod: 'demo',
      });
    });

    it('should use default amount and payment method', async () => {
      const mockRental = {
        id: 'rental-1',
        movieId: 'movie-1',
        purchasedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        transactionId: 'txn-defaults',
        amount: 500,
        currency: 'USD',
        paymentMethod: 'demo',
      };
      
      mockApiCreateRental.mockResolvedValue({ rental: mockRental });

      await purchaseRental('movie-1', 'txn-defaults');
      
      expect(mockApiCreateRental).toHaveBeenCalledWith('movie-1', {
        transactionId: 'txn-defaults',
        amount: 500,
        paymentMethod: 'demo',
      });
    });

    it('should throw error on API failure', async () => {
      mockApiCreateRental.mockRejectedValue(new Error('Payment failed'));

      await expect(purchaseRental('movie-1', 'txn-fail'))
        .rejects.toThrow('Payment failed');
    });
  });

  describe('getAllRentals', () => {
    it('should return all rentals', async () => {
      const mockRentals = [
        {
          id: 'rental-1',
          movieId: 'movie-1',
          purchasedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          transactionId: 'txn-1',
          amount: 500,
          currency: 'USD',
          paymentMethod: 'demo',
        },
        {
          id: 'rental-2',
          movieId: 'movie-2',
          purchasedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
          transactionId: 'txn-2',
          amount: 500,
          currency: 'USD',
          paymentMethod: 'demo',
        },
      ];
      
      mockGetRentals.mockResolvedValue({ rentals: mockRentals, total: 2 });

      const result = await getAllRentals();
      
      expect(result).toHaveLength(2);
      expect(result[0].movieId).toBe('movie-1');
      expect(result[1].movieId).toBe('movie-2');
    });

    it('should return empty array on API error', async () => {
      mockGetRentals.mockRejectedValue(new Error('Network error'));

      const result = await getAllRentals();
      expect(result).toEqual([]);
    });
  });

  describe('getActiveRentals', () => {
    it('should filter out expired rentals', async () => {
      const mockRentals = [
        {
          id: 'rental-1',
          movieId: 'movie-1',
          purchasedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Active
          transactionId: 'txn-1',
          amount: 500,
          currency: 'USD',
          paymentMethod: 'demo',
        },
        {
          id: 'rental-2',
          movieId: 'movie-2',
          purchasedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired
          transactionId: 'txn-2',
          amount: 500,
          currency: 'USD',
          paymentMethod: 'demo',
        },
      ];
      
      mockGetRentals.mockResolvedValue({ rentals: mockRentals, total: 2 });

      const result = await getActiveRentals();
      
      expect(result).toHaveLength(1);
      expect(result[0].movieId).toBe('movie-1');
    });
  });

  describe('hasActiveRental', () => {
    it('should return true for active rental', async () => {
      mockApiHasActiveRental.mockResolvedValue(true);

      const result = await hasActiveRental('movie-1');
      expect(result).toBe(true);
      expect(mockApiHasActiveRental).toHaveBeenCalledWith('movie-1');
    });

    it('should return false for expired/non-existent rental', async () => {
      mockApiHasActiveRental.mockResolvedValue(false);

      const result = await hasActiveRental('movie-1');
      expect(result).toBe(false);
    });
  });
});
