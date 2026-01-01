CREATE TYPE "public"."image_type" AS ENUM('poster', 'backdrop', 'logo');--> statement-breakpoint
CREATE TABLE "movie_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movie_id" uuid NOT NULL,
	"type" "image_type" NOT NULL,
	"file_path" text NOT NULL,
	"aspect_ratio" real,
	"height" integer,
	"width" integer,
	"iso_639_1" text,
	"vote_average" real,
	"vote_count" integer,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "movie_images" ADD CONSTRAINT "movie_images_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;