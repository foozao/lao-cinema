ALTER TYPE "public"."availability_status" ADD VALUE IF NOT EXISTS 'auto' BEFORE 'available';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "person_aliases" (
	"tmdb_id" integer PRIMARY KEY NOT NULL,
	"canonical_person_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "movies" ALTER COLUMN "availability_status" SET DEFAULT 'auto';--> statement-breakpoint
ALTER TABLE "movies" ADD COLUMN IF NOT EXISTS "trailers" text;--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM pg_constraint
  WHERE conname = 'person_aliases_canonical_person_id_people_id_fk'
 ) THEN
  ALTER TABLE "person_aliases" ADD CONSTRAINT "person_aliases_canonical_person_id_people_id_fk" FOREIGN KEY ("canonical_person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;