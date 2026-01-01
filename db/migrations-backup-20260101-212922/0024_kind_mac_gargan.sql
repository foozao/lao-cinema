CREATE TYPE "public"."movie_type" AS ENUM('feature', 'short');--> statement-breakpoint
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
	"price_usd" integer DEFAULT 499 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "short_packs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "rentals" ALTER COLUMN "movie_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "movies" ADD COLUMN "type" "movie_type" DEFAULT 'feature' NOT NULL;--> statement-breakpoint
ALTER TABLE "rentals" ADD COLUMN "short_pack_id" uuid;--> statement-breakpoint
ALTER TABLE "short_pack_items" ADD CONSTRAINT "short_pack_items_pack_id_short_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."short_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_pack_items" ADD CONSTRAINT "short_pack_items_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_pack_translations" ADD CONSTRAINT "short_pack_translations_pack_id_short_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."short_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_short_pack_id_short_packs_id_fk" FOREIGN KEY ("short_pack_id") REFERENCES "public"."short_packs"("id") ON DELETE cascade ON UPDATE no action;