-- Create DEMOCOUPON for demo/testing purposes
-- This promo code provides free rentals (100% discount)
-- Run this after the pricing system migration

INSERT INTO promo_codes (code, discount_type, discount_value, is_active, created_at)
VALUES ('DEMOCOUPON', 'free', NULL, true, NOW())
ON CONFLICT (code) DO UPDATE
SET is_active = true;
