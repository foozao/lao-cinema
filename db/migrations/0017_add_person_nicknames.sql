DO $$ BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE t.typname = 'trailer_type' AND n.nspname = 'public'
 ) THEN
  CREATE TYPE "public"."trailer_type" AS ENUM('youtube', 'video');
 END IF;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trailers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movie_id" uuid NOT NULL,
	"type" "trailer_type" NOT NULL,
	"youtube_key" text,
	"video_url" text,
	"video_format" "video_format",
	"video_quality" "video_quality",
	"size_bytes" integer,
	"width" integer,
	"height" integer,
	"duration_seconds" integer,
	"name" text NOT NULL,
	"official" boolean DEFAULT false,
	"language" text,
	"published_at" text,
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM pg_constraint
  WHERE conname = 'trailers_movie_id_movies_id_fk'
 ) THEN
  ALTER TABLE "trailers" ADD CONSTRAINT "trailers_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
ALTER TABLE "movies" DROP COLUMN "trailers";