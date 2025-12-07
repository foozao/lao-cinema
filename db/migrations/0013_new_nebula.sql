ALTER TABLE "movies" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "movies" ADD CONSTRAINT "movies_slug_unique" UNIQUE("slug");