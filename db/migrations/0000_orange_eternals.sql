CREATE TYPE "public"."language" AS ENUM('en', 'lo');--> statement-breakpoint
CREATE TYPE "public"."video_format" AS ENUM('mp4', 'hls', 'dash');--> statement-breakpoint
CREATE TYPE "public"."video_quality" AS ENUM('original', '1080p', '720p', '480p', '360p');--> statement-breakpoint
CREATE TABLE "cast" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movie_id" uuid NOT NULL,
	"profile_path" text,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cast_translations" (
	"cast_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"name" text NOT NULL,
	"character" text NOT NULL,
	CONSTRAINT "cast_translations_cast_id_language_pk" PRIMARY KEY("cast_id","language")
);
--> statement-breakpoint
CREATE TABLE "crew" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movie_id" uuid NOT NULL,
	"department" text NOT NULL,
	"profile_path" text
);
--> statement-breakpoint
CREATE TABLE "crew_translations" (
	"crew_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"name" text NOT NULL,
	"job" text NOT NULL,
	CONSTRAINT "crew_translations_crew_id_language_pk" PRIMARY KEY("crew_id","language")
);
--> statement-breakpoint
CREATE TABLE "genre_translations" (
	"genre_id" integer NOT NULL,
	"language" "language" NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "genre_translations_genre_id_language_pk" PRIMARY KEY("genre_id","language")
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"id" integer PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movie_genres" (
	"movie_id" uuid NOT NULL,
	"genre_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movie_translations" (
	"movie_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"title" text NOT NULL,
	"overview" text NOT NULL,
	CONSTRAINT "movie_translations_movie_id_language_pk" PRIMARY KEY("movie_id","language")
);
--> statement-breakpoint
CREATE TABLE "movies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tmdb_id" integer,
	"imdb_id" text,
	"original_title" text NOT NULL,
	"poster_path" text,
	"backdrop_path" text,
	"release_date" text NOT NULL,
	"runtime" integer NOT NULL,
	"vote_average" real DEFAULT 0,
	"vote_count" integer DEFAULT 0,
	"popularity" real DEFAULT 0,
	"adult" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "movies_tmdb_id_unique" UNIQUE("tmdb_id"),
	CONSTRAINT "movies_imdb_id_unique" UNIQUE("imdb_id")
);
--> statement-breakpoint
CREATE TABLE "video_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movie_id" uuid NOT NULL,
	"quality" "video_quality" NOT NULL,
	"format" "video_format" NOT NULL,
	"url" text NOT NULL,
	"size_bytes" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cast" ADD CONSTRAINT "cast_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cast_translations" ADD CONSTRAINT "cast_translations_cast_id_cast_id_fk" FOREIGN KEY ("cast_id") REFERENCES "public"."cast"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crew" ADD CONSTRAINT "crew_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crew_translations" ADD CONSTRAINT "crew_translations_crew_id_crew_id_fk" FOREIGN KEY ("crew_id") REFERENCES "public"."crew"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "genre_translations" ADD CONSTRAINT "genre_translations_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_genres" ADD CONSTRAINT "movie_genres_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_genres" ADD CONSTRAINT "movie_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_translations" ADD CONSTRAINT "movie_translations_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_sources" ADD CONSTRAINT "video_sources_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;