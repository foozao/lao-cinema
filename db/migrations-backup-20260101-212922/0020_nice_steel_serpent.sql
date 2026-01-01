DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
  CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'add_cast', 'remove_cast', 'update_cast', 'add_crew', 'remove_crew', 'update_crew', 'add_image', 'remove_image', 'set_primary_image', 'add_video', 'remove_video', 'update_video', 'add_genre', 'remove_genre', 'add_production_company', 'remove_production_company', 'add_platform', 'remove_platform', 'update_platform', 'feature_movie', 'unfeature_movie', 'merge_people', 'update_person');
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_entity_type') THEN
  CREATE TYPE "public"."audit_entity_type" AS ENUM('movie', 'person', 'genre', 'production_company', 'user', 'settings');
 END IF;
END $$;--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'editor' BEFORE 'admin';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"entity_type" "audit_entity_type" NOT NULL,
	"entity_id" text NOT NULL,
	"entity_name" text,
	"changes" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "production_companies" ADD COLUMN IF NOT EXISTS "slug" text;--> statement-breakpoint
ALTER TABLE "production_companies" ADD COLUMN IF NOT EXISTS "custom_logo_url" text;--> statement-breakpoint
ALTER TABLE "production_companies" ADD COLUMN IF NOT EXISTS "website_url" text;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_user_id_users_id_fk') THEN
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_companies_slug_unique') THEN
  ALTER TABLE "production_companies" ADD CONSTRAINT "production_companies_slug_unique" UNIQUE("slug");
 END IF;
END $$;