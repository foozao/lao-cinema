/**
 * Payment Provider Types
 * 
 * Abstract interface for payment providers (BCEL, Manual, Free, etc.)
 */

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';
export type DiscountType = 'percentage' | 'fixed' | 'free';

// =============================================================================
// PAYMENT PROVIDER INTERFACE
// =============================================================================

export interface PaymentProvider {
  /** Provider identifier (e.g., 'bcel', 'manual', 'free') */
  readonly name: string;
  
  /** Human-readable display name */
  readonly displayName: string;
  
  /** Whether this provider is currently available */
  isAvailable(): boolean;
  
  /** Can this provider handle the given payment? */
  canHandle(params: PaymentParams): boolean;
  
  /** Create a payment intent/request */
  createPayment(params: CreatePaymentParams): Promise<PaymentIntent>;
  
  /** Check payment status */
  getPaymentStatus(transactionId: string): Promise<PaymentStatusResult>;
  
  /** Handle incoming webhook from provider */
  handleWebhook(
    payload: unknown, 
    headers: Record<string, string>
  ): Promise<WebhookResult>;
  
  /** Cancel a pending payment (if supported) */
  cancelPayment?(transactionId: string): Promise<void>;
}

// =============================================================================
// PAYMENT PARAMS
// =============================================================================

export interface PaymentParams {
  amountLak: number;
  movieId: string;
  movieTitle: string;
  userId?: string;
  anonymousId?: string;
}

export interface CreatePaymentParams extends PaymentParams {
  transactionId: string;      // Our internal transaction ID
  returnUrl: string;          // Redirect after successful payment
  cancelUrl: string;          // Redirect on cancel/failure
  promoCodeId?: string;
  originalAmountLak?: number; // Amount before discount
}

// =============================================================================
// PAYMENT RESPONSES
// =============================================================================

export interface PaymentIntent {
  transactionId: string;
  providerTransactionId?: string;
  
  // For redirect-based flows (BCEL web)
  redirectUrl?: string;
  
  // For QR code payments (BCEL One app)
  qrCodeData?: string;
  qrCodeUrl?: string;
  
  // For immediate success (free/manual)
  immediateSuccess?: boolean;
  
  // When the payment link/QR expires
  expiresAt?: Date;
  
  status: PaymentStatus;
}

export interface PaymentStatusResult {
  transactionId: string;
  providerTransactionId?: string;
  status: PaymentStatus;
  paidAt?: Date;
  error?: string;
}

export interface WebhookResult {
  transactionId: string;
  providerTransactionId?: string;
  status: PaymentStatus;
  shouldCreateRental: boolean;
  error?: string;
}

// =============================================================================
// PRICING TYPES
// =============================================================================

export interface PricingTier {
  id: string;
  name: string;
  displayNameEn: string;
  displayNameLo?: string | null;
  priceLak: number;
  isActive: boolean;
  sortOrder: number;
}

export interface ResolvedPrice {
  /** Whether the movie is available for rent */
  available: boolean;
  
  /** Pricing tier details (if available) */
  tier?: PricingTier;
  
  /** Original price before any discounts */
  originalAmountLak?: number;
  
  /** Final amount after discount */
  finalAmountLak?: number;
  
  /** Promo code that was applied (if any) */
  promoApplied?: {
    id: string;
    code: string;
    discountType: DiscountType;
    discountValue: number | null;
    discountAmountLak: number;
  };
  
  /** Reason if not available */
  unavailableReason?: 'no_pricing' | 'inactive_tier';
}

export interface PromoCodeValidation {
  valid: boolean;
  code: string;
  discountType?: DiscountType;
  discountValue?: number | null;
  discountAmountLak?: number;
  finalAmountLak?: number;
  error?: string;
}

// =============================================================================
// ANALYTICS EVENT TYPES
// =============================================================================

export type PaymentEventType = 
  | 'payment_initiated'
  | 'payment_success'
  | 'payment_failed'
  | 'payment_refunded'
  | 'promo_code_applied'
  | 'promo_code_failed';

export interface PaymentAnalyticsEvent {
  type: PaymentEventType;
  movieId: string;
  userId?: string;
  anonymousId?: string;
  transactionId?: string;
  provider?: string;
  amountLak?: number;
  originalAmountLak?: number;
  promoCode?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}
