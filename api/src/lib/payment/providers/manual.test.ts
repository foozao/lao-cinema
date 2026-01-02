import { describe, it, expect } from 'vitest';
import { ManualProvider } from './manual.js';
import { randomUUID } from 'crypto';

describe('ManualProvider', () => {
  const provider = new ManualProvider();

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(provider.name).toBe('manual');
    });

    it('should have correct display name', () => {
      expect(provider.displayName).toBe('Manual Confirmation');
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

    it('should handle positive amounts', () => {
      expect(provider.canHandle({ ...baseParams, amountLak: 50000 })).toBe(true);
      expect(provider.canHandle({ ...baseParams, amountLak: 100000 })).toBe(true);
    });

    it('should not handle negative amounts', () => {
      expect(provider.canHandle({ ...baseParams, amountLak: -1 })).toBe(false);
    });
  });

  describe('createPayment', () => {
    it('should return pending status', async () => {
      const transactionId = randomUUID();
      
      const result = await provider.createPayment({
        transactionId,
        amountLak: 75000,
        movieId: randomUUID(),
        movieTitle: 'Test Movie',
        returnUrl: 'http://localhost/success',
        cancelUrl: 'http://localhost/cancel',
      });

      expect(result.transactionId).toBe(transactionId);
      expect(result.status).toBe('pending');
      expect(result.redirectUrl).toBeUndefined();
      expect(result.immediateSuccess).toBeUndefined();
    });
  });

  describe('getPaymentStatus', () => {
    it('should return pending status (actual status from DB)', async () => {
      const transactionId = randomUUID();
      
      const result = await provider.getPaymentStatus(transactionId);

      expect(result.transactionId).toBe(transactionId);
      expect(result.status).toBe('pending');
    });
  });

  describe('handleWebhook', () => {
    it('should throw error as webhooks are not supported', async () => {
      await expect(provider.handleWebhook()).rejects.toThrow('webhooks');
    });
  });

  describe('confirmPayment', () => {
    it('should return success status with paidAt', async () => {
      const transactionId = randomUUID();
      
      const result = await provider.confirmPayment(transactionId);

      expect(result.transactionId).toBe(transactionId);
      expect(result.status).toBe('success');
      expect(result.paidAt).toBeInstanceOf(Date);
    });
  });

  describe('rejectPayment', () => {
    it('should return failed status with reason', async () => {
      const transactionId = randomUUID();
      const reason = 'Payment verification failed';
      
      const result = await provider.rejectPayment(transactionId, reason);

      expect(result.transactionId).toBe(transactionId);
      expect(result.status).toBe('failed');
      expect(result.error).toBe(reason);
    });

    it('should return default error when no reason provided', async () => {
      const transactionId = randomUUID();
      
      const result = await provider.rejectPayment(transactionId);

      expect(result.transactionId).toBe(transactionId);
      expect(result.status).toBe('failed');
      expect(result.error).toContain('rejected');
    });
  });
});
