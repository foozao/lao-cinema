CREATE TYPE "public"."availability_status" AS ENUM('available', 'external', 'unavailable', 'coming_soon');--> statement-breakpoint
ALTER TABLE "movies" ADD COLUMN "availability_status" "availability_status" DEFAULT 'available' NOT NULL;
