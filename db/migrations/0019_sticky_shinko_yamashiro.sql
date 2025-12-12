CREATE TABLE IF NOT EXISTS "movie_production_companies" (
	"movie_id" uuid NOT NULL,
	"company_id" integer NOT NULL,
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "movie_production_companies_movie_id_company_id_pk" PRIMARY KEY("movie_id","company_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "production_companies" (
	"id" integer PRIMARY KEY NOT NULL,
	"logo_path" text,
	"origin_country" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "production_company_translations" (
	"company_id" integer NOT NULL,
	"language" "language" NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "production_company_translations_company_id_language_pk" PRIMARY KEY("company_id","language")
);
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'movie_production_companies_movie_id_movies_id_fk') THEN
  ALTER TABLE "movie_production_companies" ADD CONSTRAINT "movie_production_companies_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'movie_production_companies_company_id_production_companies_id_fk') THEN
  ALTER TABLE "movie_production_companies" ADD CONSTRAINT "movie_production_companies_company_id_production_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."production_companies"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_company_translations_company_id_production_companies_id_fk') THEN
  ALTER TABLE "production_company_translations" ADD CONSTRAINT "production_company_translations_company_id_production_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."production_companies"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;