/**
 * Manual Payment Provider
 * 
 * For admin-confirmed payments (bank transfers, cash, etc.).
 * Payment stays pending until an admin manually confirms it.
 */

import type { 
  PaymentProvider, 
  PaymentParams, 
  CreatePaymentParams, 
  PaymentIntent, 
  PaymentStatusResult, 
  WebhookResult 
} from '../types.js';

export class ManualProvider implements PaymentProvider {
  readonly name = 'manual';
  readonly displayName = 'Manual Confirmation';
  
  isAvailable(): boolean {
    return true;
  }
  
  canHandle(params: PaymentParams): boolean {
    // Manual provider can handle any amount
    return params.amountLak >= 0;
  }
  
  async createPayment(params: CreatePaymentParams): Promise<PaymentIntent> {
    // Create a pending payment that requires admin confirmation
    return {
      transactionId: params.transactionId,
      status: 'pending',
      // No redirect URL - admin will confirm via dashboard
    };
  }
  
  async getPaymentStatus(transactionId: string): Promise<PaymentStatusResult> {
    // Status is determined by the database, not this provider
    // This method would need access to the database to check
    return {
      transactionId,
      status: 'pending',
    };
  }
  
  async handleWebhook(): Promise<WebhookResult> {
    // Manual provider doesn't receive webhooks
    // Admin uses the dashboard to confirm payments
    throw new Error('ManualProvider does not support webhooks');
  }
  
  /**
   * Admin confirms a pending payment
   * This would be called from an admin API route
   */
  async confirmPayment(transactionId: string): Promise<PaymentStatusResult> {
    return {
      transactionId,
      status: 'success',
      paidAt: new Date(),
    };
  }
  
  /**
   * Admin rejects a pending payment
   */
  async rejectPayment(transactionId: string, reason?: string): Promise<PaymentStatusResult> {
    return {
      transactionId,
      status: 'failed',
      error: reason || 'Payment rejected by admin',
    };
  }
}
