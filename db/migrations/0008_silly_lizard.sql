CREATE TYPE "public"."streaming_platform" AS ENUM('netflix', 'prime', 'disney', 'hbo', 'apple', 'hulu', 'other');--> statement-breakpoint
CREATE TABLE "movie_external_platforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movie_id" uuid NOT NULL,
	"platform" "streaming_platform" NOT NULL,
	"url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "movie_external_platforms" ADD CONSTRAINT "movie_external_platforms_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;