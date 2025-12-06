-- Fix availability_status to be nullable with no default (NULL = Auto)
ALTER TABLE "movies" ALTER COLUMN "availability_status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "movies" ALTER COLUMN "availability_status" DROP NOT NULL;--> statement-breakpoint
-- Reset all existing movies to NULL (Auto) unless explicitly set
UPDATE "movies" SET "availability_status" = NULL WHERE "availability_status" = 'available';
