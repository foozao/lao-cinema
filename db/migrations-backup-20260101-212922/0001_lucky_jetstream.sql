CREATE TABLE "movie_cast" (
	"movie_id" uuid NOT NULL,
	"person_id" integer NOT NULL,
	"order" integer NOT NULL,
	CONSTRAINT "movie_cast_movie_id_person_id_pk" PRIMARY KEY("movie_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "movie_cast_translations" (
	"movie_id" uuid NOT NULL,
	"person_id" integer NOT NULL,
	"language" "language" NOT NULL,
	"character" text NOT NULL,
	CONSTRAINT "movie_cast_translations_movie_id_person_id_language_pk" PRIMARY KEY("movie_id","person_id","language")
);
--> statement-breakpoint
CREATE TABLE "movie_crew" (
	"movie_id" uuid NOT NULL,
	"person_id" integer NOT NULL,
	"department" text NOT NULL,
	CONSTRAINT "movie_crew_movie_id_person_id_department_pk" PRIMARY KEY("movie_id","person_id","department")
);
--> statement-breakpoint
CREATE TABLE "movie_crew_translations" (
	"movie_id" uuid NOT NULL,
	"person_id" integer NOT NULL,
	"department" text NOT NULL,
	"language" "language" NOT NULL,
	"job" text NOT NULL,
	CONSTRAINT "movie_crew_translations_movie_id_person_id_department_language_pk" PRIMARY KEY("movie_id","person_id","department","language")
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
	CONSTRAINT "people_translations_person_id_language_pk" PRIMARY KEY("person_id","language")
);
--> statement-breakpoint
DROP TABLE "cast" CASCADE;--> statement-breakpoint
DROP TABLE "cast_translations" CASCADE;--> statement-breakpoint
DROP TABLE "crew" CASCADE;--> statement-breakpoint
DROP TABLE "crew_translations" CASCADE;--> statement-breakpoint
ALTER TABLE "movie_cast" ADD CONSTRAINT "movie_cast_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_cast" ADD CONSTRAINT "movie_cast_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_cast_translations" ADD CONSTRAINT "movie_cast_translations_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_cast_translations" ADD CONSTRAINT "movie_cast_translations_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_crew" ADD CONSTRAINT "movie_crew_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_crew" ADD CONSTRAINT "movie_crew_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_crew_translations" ADD CONSTRAINT "movie_crew_translations_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_crew_translations" ADD CONSTRAINT "movie_crew_translations_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people_translations" ADD CONSTRAINT "people_translations_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;