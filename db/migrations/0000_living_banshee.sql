CREATE TYPE "public"."accolade_nominee_type" AS ENUM('person', 'movie');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'add_cast', 'remove_cast', 'update_cast', 'add_crew', 'remove_crew', 'update_crew', 'add_image', 'remove_image', 'set_primary_image', 'add_video', 'remove_video', 'update_video', 'add_subtitle', 'remove_subtitle', 'update_subtitle', 'add_genre', 'remove_genre', 'add_production_company', 'remove_production_company', 'add_platform', 'remove_platform', 'update_platform', 'feature_movie', 'unfeature_movie', 'merge_people', 'update_person');--> statement-breakpoint
CREATE TYPE "public"."audit_entity_type" AS ENUM('movie', 'person', 'genre', 'production_company', 'user', 'settings');--> statement-breakpoint
CREATE TYPE "public"."auth_provider" AS ENUM('email', 'google', 'apple');--> statement-breakpoint
CREATE TYPE "public"."availability_status" AS ENUM('auto', 'available', 'external', 'unavailable', 'coming_soon');--> statement-breakpoint
CREATE TYPE "public"."award_body_type" AS ENUM('jury', 'critics', 'foundation', 'audience', 'sponsor');--> statement-breakpoint
CREATE TYPE "public"."hero_type" AS ENUM('disabled', 'video', 'image');--> statement-breakpoint
CREATE TYPE "public"."image_type" AS ENUM('poster', 'backdrop', 'logo');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('en', 'lo');--> statement-breakpoint
CREATE TYPE "public"."movie_type" AS ENUM('feature', 'short');--> statement-breakpoint
CREATE TYPE "public"."streaming_platform" AS ENUM('netflix', 'prime', 'disney', 'hbo', 'apple', 'hulu', 'other');--> statement-breakpoint
CREATE TYPE "public"."trailer_type" AS ENUM('youtube', 'video');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'editor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."video_format" AS ENUM('mp4', 'hls', 'dash');--> statement-breakpoint
CREATE TYPE "public"."video_quality" AS ENUM('original', '1080p', '720p', '480p', '360p');--> statement-breakpoint
CREATE TABLE "accolade_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"section_id" uuid,
	"nominee_type" "accolade_nominee_type" NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accolade_category_translations" (
	"category_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "accolade_category_translations_category_id_language_pk" PRIMARY KEY("category_id","language")
);
--> statement-breakpoint
CREATE TABLE "accolade_edition_translations" (
	"edition_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"name" text,
	"theme" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "accolade_edition_translations_edition_id_language_pk" PRIMARY KEY("edition_id","language")
);
--> statement-breakpoint
CREATE TABLE "accolade_editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"edition_number" integer,
	"start_date" text,
	"end_date" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accolade_event_translations" (
	"event_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "accolade_event_translations_event_id_language_pk" PRIMARY KEY("event_id","language")
);
--> statement-breakpoint
CREATE TABLE "accolade_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text,
	"country" text,
	"city" text,
	"website_url" text,
	"logo_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "accolade_events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "accolade_nomination_translations" (
	"nomination_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"work_title" text,
	"notes" text,
	"recognition_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "accolade_nomination_translations_nomination_id_language_pk" PRIMARY KEY("nomination_id","language")
);
--> statement-breakpoint
CREATE TABLE "accolade_nominations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"award_body_id" uuid,
	"person_id" integer,
	"movie_id" uuid,
	"for_movie_id" uuid,
	"is_winner" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accolade_section_selection_translations" (
	"selection_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "accolade_section_selection_translations_selection_id_language_pk" PRIMARY KEY("selection_id","language")
);
--> statement-breakpoint
CREATE TABLE "accolade_section_selections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"edition_id" uuid NOT NULL,
	"movie_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accolade_section_translations" (
	"section_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "accolade_section_translations_section_id_language_pk" PRIMARY KEY("section_id","language")
);
--> statement-breakpoint
CREATE TABLE "accolade_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
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
CREATE TABLE "award_bodies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"abbreviation" text,
	"type" "award_body_type",
	"website_url" text,
	"logo_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "award_body_translations" (
	"award_body_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "award_body_translations_award_body_id_language_pk" PRIMARY KEY("award_body_id","language")
);
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "genre_translations" (
	"genre_id" integer NOT NULL,
	"language" "language" NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "genre_translations_genre_id_language_pk" PRIMARY KEY("genre_id","language")
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"id" integer PRIMARY KEY NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homepage_featured" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movie_id" uuid NOT NULL,
	"order" integer NOT NULL,
	"hero_start_time" integer,
	"hero_end_time" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "homepage_featured_movie_id_unique" UNIQUE("movie_id")
);
--> statement-breakpoint
CREATE TABLE "homepage_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"randomize_featured" boolean DEFAULT false NOT NULL,
	"hero_type" "hero_type" DEFAULT 'video' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movie_cast" (
	"movie_id" uuid NOT NULL,
	"person_id" integer NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "movie_cast_movie_id_person_id_pk" PRIMARY KEY("movie_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "movie_cast_translations" (
	"movie_id" uuid NOT NULL,
	"person_id" integer NOT NULL,
	"language" "language" NOT NULL,
	"character" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "movie_cast_translations_movie_id_person_id_language_pk" PRIMARY KEY("movie_id","person_id","language")
);
--> statement-breakpoint
CREATE TABLE "movie_crew" (
	"movie_id" uuid NOT NULL,
	"person_id" integer NOT NULL,
	"department" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "movie_crew_movie_id_person_id_department_pk" PRIMARY KEY("movie_id","person_id","department")
);
--> statement-breakpoint
CREATE TABLE "movie_crew_translations" (
	"movie_id" uuid NOT NULL,
	"person_id" integer NOT NULL,
	"department" text NOT NULL,
	"language" "language" NOT NULL,
	"job" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "movie_crew_translations_movie_id_person_id_department_language_pk" PRIMARY KEY("movie_id","person_id","department","language")
);
--> statement-breakpoint
CREATE TABLE "movie_external_platforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movie_id" uuid NOT NULL,
	"platform" "streaming_platform" NOT NULL,
	"url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movie_genres" (
	"movie_id" uuid NOT NULL,
	"genre_id" integer NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "movie_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"movie_id" uuid NOT NULL,
	"notified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movie_production_companies" (
	"movie_id" uuid NOT NULL,
	"company_id" integer NOT NULL,
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "movie_production_companies_movie_id_company_id_pk" PRIMARY KEY("movie_id","company_id")
);
--> statement-breakpoint
CREATE TABLE "movie_translations" (
	"movie_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"title" text NOT NULL,
	"overview" text NOT NULL,
	"tagline" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "movie_translations_movie_id_language_pk" PRIMARY KEY("movie_id","language")
);
--> statement-breakpoint
CREATE TABLE "movies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tmdb_id" integer,
	"imdb_id" text,
	"slug" text,
	"type" "movie_type" DEFAULT 'feature' NOT NULL,
	"original_title" text NOT NULL,
	"original_language" text,
	"poster_path" text,
	"backdrop_path" text,
	"release_date" text,
	"runtime" integer,
	"vote_average" real DEFAULT 0,
	"vote_count" integer DEFAULT 0,
	"popularity" real DEFAULT 0,
	"adult" boolean DEFAULT false,
	"availability_status" "availability_status" DEFAULT 'auto',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "movies_tmdb_id_unique" UNIQUE("tmdb_id"),
	CONSTRAINT "movies_imdb_id_unique" UNIQUE("imdb_id"),
	CONSTRAINT "movies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "auth_provider" NOT NULL,
	"provider_account_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" integer PRIMARY KEY NOT NULL,
	"profile_path" text,
	"birthday" text,
	"deathday" text,
	"place_of_birth" text,
	"known_for_department" text,
	"popularity" real DEFAULT 0,
	"gender" integer,
	"imdb_id" text,
	"homepage" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people_translations" (
	"person_id" integer NOT NULL,
	"language" "language" NOT NULL,
	"name" text NOT NULL,
	"biography" text,
	"nicknames" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "people_translations_person_id_language_pk" PRIMARY KEY("person_id","language")
);
--> statement-breakpoint
CREATE TABLE "person_aliases" (
	"tmdb_id" integer PRIMARY KEY NOT NULL,
	"canonical_person_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "person_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" integer NOT NULL,
	"file_path" text NOT NULL,
	"aspect_ratio" real,
	"height" integer,
	"width" integer,
	"vote_average" real,
	"vote_count" integer,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_companies" (
	"id" integer PRIMARY KEY NOT NULL,
	"slug" text,
	"logo_path" text,
	"custom_logo_url" text,
	"website_url" text,
	"origin_country" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "production_companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "production_company_translations" (
	"company_id" integer NOT NULL,
	"language" "language" NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "production_company_translations_company_id_language_pk" PRIMARY KEY("company_id","language")
);
--> statement-breakpoint
CREATE TABLE "rentals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"anonymous_id" text,
	"movie_id" uuid,
	"short_pack_id" uuid,
	"current_short_id" uuid,
	"purchased_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"transaction_id" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"payment_method" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "short_pack_items" (
	"pack_id" uuid NOT NULL,
	"movie_id" uuid NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "short_pack_items_pack_id_movie_id_pk" PRIMARY KEY("pack_id","movie_id")
);
--> statement-breakpoint
CREATE TABLE "short_pack_translations" (
	"pack_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"tagline" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "short_pack_translations_pack_id_language_pk" PRIMARY KEY("pack_id","language")
);
--> statement-breakpoint
CREATE TABLE "short_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text,
	"poster_path" text,
	"backdrop_path" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "short_packs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "subtitle_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movie_id" uuid NOT NULL,
	"language" text NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"kind" text DEFAULT 'subtitles' NOT NULL,
	"line_position" integer DEFAULT 85 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trailers" (
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
	"thumbnail_url" text,
	"name" text NOT NULL,
	"official" boolean DEFAULT false,
	"language" text,
	"published_at" text,
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	CONSTRAINT "user_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user_watchlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"movie_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"display_name" text,
	"profile_image_url" text,
	"timezone" text DEFAULT 'Asia/Vientiane',
	"preferred_subtitle_language" text,
	"always_show_subtitles" boolean DEFAULT false NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "video_analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"anonymous_id" text,
	"movie_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"progress_seconds" integer,
	"duration_seconds" integer,
	"device_type" text,
	"source" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movie_id" uuid NOT NULL,
	"quality" "video_quality" NOT NULL,
	"format" "video_format" NOT NULL,
	"url" text NOT NULL,
	"size_bytes" integer,
	"width" integer,
	"height" integer,
	"aspect_ratio" text,
	"has_burned_subtitles" boolean DEFAULT false NOT NULL,
	"burned_subtitles_language" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watch_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"anonymous_id" text,
	"movie_id" uuid NOT NULL,
	"progress_seconds" integer NOT NULL,
	"duration_seconds" integer NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"last_watched_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accolade_categories" ADD CONSTRAINT "accolade_categories_event_id_accolade_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."accolade_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accolade_categories" ADD CONSTRAINT "accolade_categories_section_id_accolade_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."accolade_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accolade_category_translations" ADD CONSTRAINT "accolade_category_translations_category_id_accolade_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."accolade_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accolade_edition_translations" ADD CONSTRAINT "accolade_edition_translations_edition_id_accolade_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."accolade_editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accolade_editions" ADD CONSTRAINT "accolade_editions_event_id_accolade_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."accolade_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accolade_event_translations" ADD CONSTRAINT "accolade_event_translations_event_id_accolade_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."accolade_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accolade_nomination_translations" ADD CONSTRAINT "accolade_nomination_translations_nomination_id_accolade_nominations_id_fk" FOREIGN KEY ("nomination_id") REFERENCES "public"."accolade_nominations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accolade_nominations" ADD CONSTRAINT "accolade_nominations_edition_id_accolade_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."accolade_editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accolade_nominations" ADD CONSTRAINT "accolade_nominations_category_id_accolade_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."accolade_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accolade_nominations" ADD CONSTRAINT "accolade_nominations_award_body_id_award_bodies_id_fk" FOREIGN KEY ("award_body_id") REFERENCES "public"."award_bodies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accolade_nominations" ADD CONSTRAINT "accolade_nominations_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accolade_nominations" ADD CONSTRAINT "accolade_nominations_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accolade_nominations" ADD CONSTRAINT "accolade_nominations_for_movie_id_movies_id_fk" FOREIGN KEY ("for_movie_id") REFERENCES "public"."movies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accolade_section_selection_translations" ADD CONSTRAINT "accolade_section_selection_translations_selection_id_accolade_section_selections_id_fk" FOREIGN KEY ("selection_id") REFERENCES "public"."accolade_section_selections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accolade_section_selections" ADD CONSTRAINT "accolade_section_selections_section_id_accolade_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."accolade_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accolade_section_selections" ADD CONSTRAINT "accolade_section_selections_edition_id_accolade_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."accolade_editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accolade_section_selections" ADD CONSTRAINT "accolade_section_selections_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accolade_section_translations" ADD CONSTRAINT "accolade_section_translations_section_id_accolade_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."accolade_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accolade_sections" ADD CONSTRAINT "accolade_sections_event_id_accolade_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."accolade_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award_body_translations" ADD CONSTRAINT "award_body_translations_award_body_id_award_bodies_id_fk" FOREIGN KEY ("award_body_id") REFERENCES "public"."award_bodies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "genre_translations" ADD CONSTRAINT "genre_translations_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homepage_featured" ADD CONSTRAINT "homepage_featured_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_cast" ADD CONSTRAINT "movie_cast_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_cast" ADD CONSTRAINT "movie_cast_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_cast_translations" ADD CONSTRAINT "movie_cast_translations_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_cast_translations" ADD CONSTRAINT "movie_cast_translations_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_crew" ADD CONSTRAINT "movie_crew_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_crew" ADD CONSTRAINT "movie_crew_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_crew_translations" ADD CONSTRAINT "movie_crew_translations_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_crew_translations" ADD CONSTRAINT "movie_crew_translations_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_external_platforms" ADD CONSTRAINT "movie_external_platforms_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_genres" ADD CONSTRAINT "movie_genres_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_genres" ADD CONSTRAINT "movie_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_images" ADD CONSTRAINT "movie_images_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_notifications" ADD CONSTRAINT "movie_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_notifications" ADD CONSTRAINT "movie_notifications_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_production_companies" ADD CONSTRAINT "movie_production_companies_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_production_companies" ADD CONSTRAINT "movie_production_companies_company_id_production_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."production_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_translations" ADD CONSTRAINT "movie_translations_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people_translations" ADD CONSTRAINT "people_translations_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_aliases" ADD CONSTRAINT "person_aliases_canonical_person_id_people_id_fk" FOREIGN KEY ("canonical_person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_images" ADD CONSTRAINT "person_images_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_company_translations" ADD CONSTRAINT "production_company_translations_company_id_production_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."production_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_short_pack_id_short_packs_id_fk" FOREIGN KEY ("short_pack_id") REFERENCES "public"."short_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_current_short_id_movies_id_fk" FOREIGN KEY ("current_short_id") REFERENCES "public"."movies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_pack_items" ADD CONSTRAINT "short_pack_items_pack_id_short_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."short_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_pack_items" ADD CONSTRAINT "short_pack_items_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_pack_translations" ADD CONSTRAINT "short_pack_translations_pack_id_short_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."short_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subtitle_tracks" ADD CONSTRAINT "subtitle_tracks_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trailers" ADD CONSTRAINT "trailers_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_watchlist" ADD CONSTRAINT "user_watchlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_watchlist" ADD CONSTRAINT "user_watchlist_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_analytics_events" ADD CONSTRAINT "video_analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_analytics_events" ADD CONSTRAINT "video_analytics_events_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_sources" ADD CONSTRAINT "video_sources_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_progress" ADD CONSTRAINT "watch_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_progress" ADD CONSTRAINT "watch_progress_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;