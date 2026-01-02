# Pricing & Payment System

> **Status**: Infrastructure only - no UI changes yet. Frontend remains demo mode.

## Overview

This document describes the rental pricing and payment infrastructure for Lao Cinema. The system is designed to be:

1. **Currency-flexible** - LAK first, extensible to USD/other currencies
2. **Provider-agnostic** - BCEL One first, abstract interface for future providers
3. **Tier-based** - Content providers select from predefined pricing tiers
4. **Promo-ready** - Support for discount codes including free rentals

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  (Currently demo mode - no pricing displayed)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  /api/pricing/tiers         - List pricing tiers (admin)         │
│  /api/movies/:id/pricing    - Get movie price (future)           │
│  /api/promo-codes           - CRUD promo codes (admin)           │
│  /api/promo-codes/validate  - Validate code for movie            │
│  /api/payments/initiate     - Start payment flow                 │
│  /api/webhooks/:provider    - Payment callbacks                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PAYMENT PROVIDER LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│  PaymentProvider (interface)                                     │
│  ├── BCELProvider      - BCEL One integration (primary)          │
│  ├── ManualProvider    - Admin-confirmed payments                │
│  └── FreeProvider      - Promo codes with 100% discount          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  pricing_tiers          - Predefined price points                │
│  promo_codes            - Discount/free codes                    │
│  promo_code_uses        - Usage tracking                         │
│  payment_transactions   - All payment attempts                   │
│  movies.pricing_tier_id - FK to pricing tier                     │
│  rentals                - Existing, links to payment             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### pricing_tiers

Predefined pricing tiers that content providers can select from.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(100) | Internal name: 'standard', 'premium' |
| display_name_en | VARCHAR(100) | English display: 'Standard' |
| display_name_lo | VARCHAR(100) | Lao display: 'ມາດຕະຖານ' |
| price_lak | INTEGER | Price in LAK (no decimals) |
| is_active | BOOLEAN | Whether tier is available |
| sort_order | INTEGER | Display order |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Initial Tiers:**

| Name | EN | LO | Price LAK |
|------|----|----|-----------|
| standard | Standard | ມາດຕະຖານ | 50,000 |
| premium | Premium | ພຣີມຽມ | 75,000 |
| new_release | New Release | ອອກໃໝ່ | 100,000 |

### promo_codes

Discount and promotional codes.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| code | VARCHAR(50) | Unique code: 'LAONEWYEAR2026' |
| discount_type | VARCHAR(20) | 'percentage', 'fixed', 'free' |
| discount_value | INTEGER | 50 for 50%, 10000 for ₭10,000, NULL for free |
| max_uses | INTEGER | NULL = unlimited |
| uses_count | INTEGER | Current usage count |
| valid_from | TIMESTAMP | Start of validity |
| valid_to | TIMESTAMP | End of validity |
| movie_id | UUID | NULL = any movie |
| is_active | BOOLEAN | Manual enable/disable |
| created_at | TIMESTAMP | |

### promo_code_uses

Track who used which codes.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| promo_code_id | UUID | FK to promo_codes |
| rental_id | UUID | FK to rentals |
| user_id | UUID | FK to users (nullable) |
| anonymous_id | VARCHAR(255) | For non-logged-in users |
| used_at | TIMESTAMP | |

### payment_transactions

Provider-agnostic payment records.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| rental_id | UUID | FK to rentals (set after success) |
| movie_id | UUID | FK to movies |
| user_id | UUID | FK to users (nullable) |
| anonymous_id | VARCHAR(255) | For non-logged-in users |
| provider | VARCHAR(50) | 'bcel', 'manual', 'free' |
| provider_transaction_id | VARCHAR(255) | External reference |
| amount_lak | INTEGER | Final amount charged |
| original_amount_lak | INTEGER | Before discount |
| promo_code_id | UUID | FK to promo_codes (nullable) |
| status | VARCHAR(50) | 'pending', 'success', 'failed', 'refunded' |
| provider_response | JSONB | Raw response for debugging |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### movies (existing, add column)

| Column | Type | Description |
|--------|------|-------------|
| pricing_tier_id | UUID | FK to pricing_tiers (nullable) |

---

## Payment Provider Interface

```typescript
// api/src/lib/payment/types.ts

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';
export type DiscountType = 'percentage' | 'fixed' | 'free';

export interface PaymentProvider {
  readonly name: string;
  
  // Can this provider handle the payment?
  canHandle(params: PaymentParams): boolean;
  
  // Create payment intent (returns redirect URL or QR code)
  createPayment(params: CreatePaymentParams): Promise<PaymentIntent>;
  
  // Check payment status
  getPaymentStatus(transactionId: string): Promise<PaymentStatusResult>;
  
  // Handle incoming webhook
  handleWebhook(
    payload: unknown, 
    headers: Record<string, string>
  ): Promise<WebhookResult>;
}

export interface PaymentParams {
  amountLak: number;
  movieId: string;
  userId?: string;
  anonymousId?: string;
}

export interface CreatePaymentParams extends PaymentParams {
  transactionId: string;  // Our internal ID
  returnUrl: string;      // Redirect after payment
  cancelUrl: string;      // Redirect on cancel
  promoCodeId?: string;
}

export interface PaymentIntent {
  transactionId: string;
  providerTransactionId?: string;
  redirectUrl?: string;      // For redirect-based flows
  qrCodeData?: string;       // For QR code payments
  expiresAt?: Date;          // When payment link expires
}

export interface PaymentStatusResult {
  transactionId: string;
  status: PaymentStatus;
  providerTransactionId?: string;
  paidAt?: Date;
  error?: string;
}

export interface WebhookResult {
  transactionId: string;
  status: PaymentStatus;
  shouldCreateRental: boolean;
  error?: string;
}
```

---

## Price Resolution Logic

```typescript
// api/src/lib/pricing/resolver.ts

export interface ResolvedPrice {
  available: boolean;        // false if no tier assigned
  originalAmountLak?: number;
  finalAmountLak?: number;
  promoApplied?: {
    code: string;
    discountType: DiscountType;
    discountValue: number | null;
  };
  tierId?: string;
  tierName?: string;
}

export async function resolvePrice(
  movieId: string,
  promoCode?: string
): Promise<ResolvedPrice> {
  // 1. Get movie's pricing tier
  // 2. If no tier, return { available: false }
  // 3. Get tier price
  // 4. If promo code provided, validate and apply discount
  // 5. Return resolved price
}
```

---

## Analytics Integration

Payment events will be tracked in the existing `video_analytics_events` table with new event types:

| Event Type | Description | Metadata |
|------------|-------------|----------|
| payment_initiated | User started checkout | movieId, amountLak, provider |
| payment_success | Payment confirmed | movieId, amountLak, transactionId |
| payment_failed | Payment failed | movieId, error, provider |
| promo_code_applied | Valid code used | movieId, code, discountAmount |
| promo_code_failed | Invalid code attempt | movieId, code, reason |

This integrates with the existing analytics dashboard to show:
- Revenue by movie
- Conversion rates (initiated → success)
- Popular promo codes
- Failed payment analysis

---

## Rental Duration

Rental duration is fixed at **24 hours**, defined in:

```typescript
// web/lib/rental-service.ts
export const RENTAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
```

This value should be moved to a shared config or database setting in the future.

---

## BCEL One Integration

### Overview

BCEL One is Laos's primary mobile banking app. Integration typically involves:

1. **Merchant Registration** - Get merchant ID and API credentials
2. **Payment Flow** - QR code or redirect-based
3. **Webhook Callback** - BCEL notifies us of payment status
4. **Reconciliation** - Daily settlement reports

### Implementation Status

- [ ] Obtain BCEL merchant account
- [ ] Get API documentation
- [ ] Implement `BCELProvider`
- [ ] Set up webhook endpoint
- [ ] Test in sandbox environment
- [ ] Production deployment

### Stub Provider

Until BCEL integration is complete, we use stub providers:

- **FreeProvider** - For promo codes with 100% discount
- **ManualProvider** - Admin confirms payment manually (for testing)

---

## API Endpoints

### Admin Endpoints (require admin auth)

```
GET    /api/admin/pricing/tiers          - List all tiers
POST   /api/admin/pricing/tiers          - Create tier
PATCH  /api/admin/pricing/tiers/:id      - Update tier
DELETE /api/admin/pricing/tiers/:id      - Delete tier

GET    /api/admin/promo-codes            - List all codes
POST   /api/admin/promo-codes            - Create code
PATCH  /api/admin/promo-codes/:id        - Update code
DELETE /api/admin/promo-codes/:id        - Delete code

GET    /api/admin/payments               - List transactions
GET    /api/admin/payments/:id           - Transaction details
POST   /api/admin/payments/:id/refund    - Process refund
```

### Public Endpoints (future, when pricing goes live)

```
GET    /api/movies/:id/pricing           - Get movie price
POST   /api/promo-codes/validate         - Validate code
POST   /api/payments/initiate            - Start payment
GET    /api/payments/:id/status          - Check status
POST   /api/webhooks/bcel                - BCEL callback
```

---

## Implementation Phases

### Phase 1: Infrastructure (Current)
- [x] Documentation
- [ ] Database schema migration
- [ ] Payment provider interface
- [ ] Stub providers (Free, Manual)
- [ ] Admin API routes for tiers/promos
- [ ] Analytics event types

### Phase 2: Admin Tools
- [ ] Pricing tier management UI
- [ ] Promo code management UI
- [ ] Assign tiers to movies in edit page
- [ ] Payment transaction viewer

### Phase 3: BCEL Integration
- [ ] Obtain merchant account
- [ ] Implement BCELProvider
- [ ] Webhook handling
- [ ] Testing in sandbox

### Phase 4: Go Live
- [ ] Enable pricing display on frontend
- [ ] Payment flow UI
- [ ] Promo code input
- [ ] Receipt/confirmation emails

---

## Security Considerations

1. **Webhook Verification** - Verify BCEL webhook signatures
2. **Idempotency** - Handle duplicate webhooks gracefully
3. **Rate Limiting** - Limit promo code validation attempts
4. **Audit Logging** - Log all payment state changes
5. **PCI Compliance** - We never handle card data directly (BCEL handles it)

---

## Related Files

| File | Purpose |
|------|---------|
| `db/src/schema.ts` | Database schema definitions |
| `api/src/lib/payment/types.ts` | Payment provider interface |
| `api/src/lib/payment/providers/` | Provider implementations |
| `api/src/lib/pricing/resolver.ts` | Price calculation logic |
| `api/src/routes/pricing.ts` | Pricing API routes |
| `api/src/routes/payments.ts` | Payment API routes |
| `web/lib/rental-service.ts` | Rental duration constant |
| `docs/features/ANALYTICS.md` | Analytics integration |
