CREATE TYPE "public"."award_nominee_type" AS ENUM('person', 'movie');--> statement-breakpoint
CREATE TABLE "award_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"show_id" uuid NOT NULL,
	"nominee_type" "award_nominee_type" NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "award_category_translations" (
	"category_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "award_category_translations_category_id_language_pk" PRIMARY KEY("category_id","language")
);
--> statement-breakpoint
CREATE TABLE "award_edition_translations" (
	"edition_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"name" text,
	"theme" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "award_edition_translations_edition_id_language_pk" PRIMARY KEY("edition_id","language")
);
--> statement-breakpoint
CREATE TABLE "award_editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"show_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"edition_number" integer,
	"start_date" text,
	"end_date" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "award_nomination_translations" (
	"nomination_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"work_title" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "award_nomination_translations_nomination_id_language_pk" PRIMARY KEY("nomination_id","language")
);
--> statement-breakpoint
CREATE TABLE "award_nominations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"person_id" integer,
	"movie_id" uuid,
	"for_movie_id" uuid,
	"is_winner" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "award_show_translations" (
	"show_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "award_show_translations_show_id_language_pk" PRIMARY KEY("show_id","language")
);
--> statement-breakpoint
CREATE TABLE "award_shows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text,
	"country" text,
	"city" text,
	"website_url" text,
	"logo_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "award_shows_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "award_categories" ADD CONSTRAINT "award_categories_show_id_award_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "public"."award_shows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award_category_translations" ADD CONSTRAINT "award_category_translations_category_id_award_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."award_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award_edition_translations" ADD CONSTRAINT "award_edition_translations_edition_id_award_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."award_editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award_editions" ADD CONSTRAINT "award_editions_show_id_award_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "public"."award_shows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award_nomination_translations" ADD CONSTRAINT "award_nomination_translations_nomination_id_award_nominations_id_fk" FOREIGN KEY ("nomination_id") REFERENCES "public"."award_nominations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award_nominations" ADD CONSTRAINT "award_nominations_edition_id_award_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."award_editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award_nominations" ADD CONSTRAINT "award_nominations_category_id_award_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."award_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award_nominations" ADD CONSTRAINT "award_nominations_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award_nominations" ADD CONSTRAINT "award_nominations_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award_nominations" ADD CONSTRAINT "award_nominations_for_movie_id_movies_id_fk" FOREIGN KEY ("for_movie_id") REFERENCES "public"."movies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award_show_translations" ADD CONSTRAINT "award_show_translations_show_id_award_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "public"."award_shows"("id") ON DELETE cascade ON UPDATE no action;