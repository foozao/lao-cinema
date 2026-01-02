import { describe, it, expect } from 'vitest';
import { FreeProvider } from './free.js';
import { randomUUID } from 'crypto';

describe('FreeProvider', () => {
  const provider = new FreeProvider();

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(provider.name).toBe('free');
    });

    it('should have correct display name', () => {
      expect(provider.displayName).toBe('Free (Promotional)');
    });
  });

  describe('isAvailable', () => {
    it('should always be available', () => {
      expect(provider.isAvailable()).toBe(true);
    });
  });

  describe('canHandle', () => {
    const baseParams = { movieId: randomUUID(), movieTitle: 'Test Movie' };

    it('should handle zero-amount payments', () => {
      expect(provider.canHandle({ ...baseParams, amountLak: 0 })).toBe(true);
    });

    it('should not handle positive amounts', () => {
      expect(provider.canHandle({ ...baseParams, amountLak: 1 })).toBe(false);
      expect(provider.canHandle({ ...baseParams, amountLak: 50000 })).toBe(false);
    });

    it('should not handle negative amounts', () => {
      expect(provider.canHandle({ ...baseParams, amountLak: -1 })).toBe(false);
    });
  });

  describe('createPayment', () => {
    it('should return immediate success for zero-amount payment', async () => {
      const transactionId = randomUUID();
      
      const result = await provider.createPayment({
        transactionId,
        amountLak: 0,
        movieId: randomUUID(),
        movieTitle: 'Test Movie',
        returnUrl: 'http://localhost/success',
        cancelUrl: 'http://localhost/cancel',
      });

      expect(result.transactionId).toBe(transactionId);
      expect(result.immediateSuccess).toBe(true);
      expect(result.status).toBe('success');
      expect(result.redirectUrl).toBeUndefined();
    });

    it('should throw error for non-zero amount', async () => {
      await expect(provider.createPayment({
        transactionId: randomUUID(),
        amountLak: 50000,
        movieId: randomUUID(),
        movieTitle: 'Test Movie',
        returnUrl: 'http://localhost/success',
        cancelUrl: 'http://localhost/cancel',
      })).rejects.toThrow('zero-amount');
    });
  });

  describe('getPaymentStatus', () => {
    it('should always return success status', async () => {
      const transactionId = randomUUID();
      
      const result = await provider.getPaymentStatus(transactionId);

      expect(result.transactionId).toBe(transactionId);
      expect(result.status).toBe('success');
      expect(result.paidAt).toBeInstanceOf(Date);
    });
  });

  describe('handleWebhook', () => {
    it('should throw error as webhooks are not supported', async () => {
      await expect(provider.handleWebhook()).rejects.toThrow('webhooks');
    });
  });
});
