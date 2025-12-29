CREATE TYPE "public"."hero_type" AS ENUM('disabled', 'video', 'image');--> statement-breakpoint
ALTER TABLE "homepage_settings" ADD COLUMN "hero_type" "hero_type" DEFAULT 'video' NOT NULL;