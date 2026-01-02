-- Create PREVIEWCOUPON for preview/testing purposes
-- This promo code provides free rentals (100% discount)
-- Usage: Run this script against your database to create the promo code
-- psql -h localhost -U laocinema -d lao_cinema -f create-demo-coupon.sql

INSERT INTO promo_codes (code, discount_type, discount_value, is_active, created_at)
VALUES ('PREVIEWCOUPON', 'free', NULL, true, NOW())
ON CONFLICT (code) DO UPDATE SET
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
