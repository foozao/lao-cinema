-- Remove price_usd column from short_packs table
-- Pricing will be handled differently in the future

ALTER TABLE "short_packs" DROP COLUMN IF EXISTS "price_usd";
