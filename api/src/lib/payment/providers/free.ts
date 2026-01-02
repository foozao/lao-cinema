/**
 * Free Payment Provider
 * 
 * Handles payments with 100% discount (promo codes that make rentals free).
 * Immediately marks payment as successful without any external interaction.
 */

import type { 
  PaymentProvider, 
  PaymentParams, 
  CreatePaymentParams, 
  PaymentIntent, 
  PaymentStatusResult, 
  WebhookResult 
} from '../types.js';

export class FreeProvider implements PaymentProvider {
  readonly name = 'free';
  readonly displayName = 'Free (Promotional)';
  
  isAvailable(): boolean {
    return true;
  }
  
  canHandle(params: PaymentParams): boolean {
    // Only handle zero-amount payments
    return params.amountLak === 0;
  }
  
  async createPayment(params: CreatePaymentParams): Promise<PaymentIntent> {
    if (params.amountLak !== 0) {
      throw new Error('FreeProvider can only handle zero-amount payments');
    }
    
    // Immediate success - no external payment needed
    return {
      transactionId: params.transactionId,
      immediateSuccess: true,
      status: 'success',
    };
  }
  
  async getPaymentStatus(transactionId: string): Promise<PaymentStatusResult> {
    // Free payments are always successful immediately
    return {
      transactionId,
      status: 'success',
      paidAt: new Date(),
    };
  }
  
  async handleWebhook(): Promise<WebhookResult> {
    // Free provider doesn't receive webhooks
    throw new Error('FreeProvider does not support webhooks');
  }
}
