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
ALTER TABLE "person_images" ADD CONSTRAINT "person_images_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;