-- Add 'auto' to availability_status enum
ALTER TYPE "public"."availability_status" ADD VALUE 'auto';--> statement-breakpoint
-- Set default to 'auto' for new movies
ALTER TABLE "movies" ALTER COLUMN "availability_status" SET DEFAULT 'auto';--> statement-breakpoint
-- Update all NULL values to 'auto'
UPDATE "movies" SET "availability_status" = 'auto' WHERE "availability_status" IS NULL;
