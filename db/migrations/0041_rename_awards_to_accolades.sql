-- Migration: Rename "awards" tables and columns to "accolades"
-- This migration renames all award_* tables and related columns to accolade_*

-- Step 1: Rename the enum type
ALTER TYPE "award_nominee_type" RENAME TO "accolade_nominee_type";

-- Step 2: Rename tables (order matters due to foreign key constraints)
-- Start with the leaf tables (those with foreign keys) first, then parent tables

-- Rename nomination translations first (depends on nominations)
ALTER TABLE "award_nomination_translations" RENAME TO "accolade_nomination_translations";

-- Rename nominations (depends on editions, categories)
ALTER TABLE "award_nominations" RENAME TO "accolade_nominations";

-- Rename category translations (depends on categories)
ALTER TABLE "award_category_translations" RENAME TO "accolade_category_translations";

-- Rename categories (depends on shows)
ALTER TABLE "award_categories" RENAME TO "accolade_categories";

-- Rename edition translations (depends on editions)
ALTER TABLE "award_edition_translations" RENAME TO "accolade_edition_translations";

-- Rename editions (depends on shows)
ALTER TABLE "award_editions" RENAME TO "accolade_editions";

-- Rename show translations (depends on shows)
ALTER TABLE "award_show_translations" RENAME TO "accolade_event_translations";

-- Rename shows (parent table - rename last)
ALTER TABLE "award_shows" RENAME TO "accolade_events";

-- Step 3: Rename foreign key columns from show_id to event_id
-- In accolade_editions table
ALTER TABLE "accolade_editions" RENAME COLUMN "show_id" TO "event_id";

-- In accolade_categories table
ALTER TABLE "accolade_categories" RENAME COLUMN "show_id" TO "event_id";

-- In accolade_event_translations table
ALTER TABLE "accolade_event_translations" RENAME COLUMN "show_id" TO "event_id";

-- Step 4: Rename foreign key constraints to match new naming
-- Drop and recreate foreign key constraints with new names

-- accolade_editions.event_id -> accolade_events.id
ALTER TABLE "accolade_editions" DROP CONSTRAINT IF EXISTS "award_editions_show_id_award_shows_id_fk";
ALTER TABLE "accolade_editions" ADD CONSTRAINT "accolade_editions_event_id_accolade_events_id_fk" 
  FOREIGN KEY ("event_id") REFERENCES "accolade_events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- accolade_categories.event_id -> accolade_events.id
ALTER TABLE "accolade_categories" DROP CONSTRAINT IF EXISTS "award_categories_show_id_award_shows_id_fk";
ALTER TABLE "accolade_categories" ADD CONSTRAINT "accolade_categories_event_id_accolade_events_id_fk" 
  FOREIGN KEY ("event_id") REFERENCES "accolade_events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- accolade_event_translations.event_id -> accolade_events.id
ALTER TABLE "accolade_event_translations" DROP CONSTRAINT IF EXISTS "award_show_translations_show_id_award_shows_id_fk";
ALTER TABLE "accolade_event_translations" ADD CONSTRAINT "accolade_event_translations_event_id_accolade_events_id_fk" 
  FOREIGN KEY ("event_id") REFERENCES "accolade_events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- accolade_edition_translations.edition_id -> accolade_editions.id
ALTER TABLE "accolade_edition_translations" DROP CONSTRAINT IF EXISTS "award_edition_translations_edition_id_award_editions_id_fk";
ALTER TABLE "accolade_edition_translations" ADD CONSTRAINT "accolade_edition_translations_edition_id_accolade_editions_id_fk" 
  FOREIGN KEY ("edition_id") REFERENCES "accolade_editions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- accolade_category_translations.category_id -> accolade_categories.id
ALTER TABLE "accolade_category_translations" DROP CONSTRAINT IF EXISTS "award_category_translations_category_id_award_categories_id_fk";
ALTER TABLE "accolade_category_translations" ADD CONSTRAINT "accolade_category_translations_category_id_accolade_categories_id_fk" 
  FOREIGN KEY ("category_id") REFERENCES "accolade_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- accolade_nominations.edition_id -> accolade_editions.id
ALTER TABLE "accolade_nominations" DROP CONSTRAINT IF EXISTS "award_nominations_edition_id_award_editions_id_fk";
ALTER TABLE "accolade_nominations" ADD CONSTRAINT "accolade_nominations_edition_id_accolade_editions_id_fk" 
  FOREIGN KEY ("edition_id") REFERENCES "accolade_editions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- accolade_nominations.category_id -> accolade_categories.id
ALTER TABLE "accolade_nominations" DROP CONSTRAINT IF EXISTS "award_nominations_category_id_award_categories_id_fk";
ALTER TABLE "accolade_nominations" ADD CONSTRAINT "accolade_nominations_category_id_accolade_categories_id_fk" 
  FOREIGN KEY ("category_id") REFERENCES "accolade_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- accolade_nominations.person_id -> people.id (unchanged reference, just rename constraint)
ALTER TABLE "accolade_nominations" DROP CONSTRAINT IF EXISTS "award_nominations_person_id_people_id_fk";
ALTER TABLE "accolade_nominations" ADD CONSTRAINT "accolade_nominations_person_id_people_id_fk" 
  FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- accolade_nominations.movie_id -> movies.id (unchanged reference, just rename constraint)
ALTER TABLE "accolade_nominations" DROP CONSTRAINT IF EXISTS "award_nominations_movie_id_movies_id_fk";
ALTER TABLE "accolade_nominations" ADD CONSTRAINT "accolade_nominations_movie_id_movies_id_fk" 
  FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- accolade_nominations.for_movie_id -> movies.id (unchanged reference, just rename constraint)
ALTER TABLE "accolade_nominations" DROP CONSTRAINT IF EXISTS "award_nominations_for_movie_id_movies_id_fk";
ALTER TABLE "accolade_nominations" ADD CONSTRAINT "accolade_nominations_for_movie_id_movies_id_fk" 
  FOREIGN KEY ("for_movie_id") REFERENCES "movies"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- accolade_nomination_translations.nomination_id -> accolade_nominations.id
ALTER TABLE "accolade_nomination_translations" DROP CONSTRAINT IF EXISTS "award_nomination_translations_nomination_id_award_nominations_id_fk";
ALTER TABLE "accolade_nomination_translations" ADD CONSTRAINT "accolade_nomination_translations_nomination_id_accolade_nominations_id_fk" 
  FOREIGN KEY ("nomination_id") REFERENCES "accolade_nominations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Step 5: Rename primary key constraints
ALTER INDEX IF EXISTS "award_shows_pkey" RENAME TO "accolade_events_pkey";
ALTER INDEX IF EXISTS "award_editions_pkey" RENAME TO "accolade_editions_pkey";
ALTER INDEX IF EXISTS "award_categories_pkey" RENAME TO "accolade_categories_pkey";
ALTER INDEX IF EXISTS "award_nominations_pkey" RENAME TO "accolade_nominations_pkey";

-- Step 6: Rename unique constraints
ALTER INDEX IF EXISTS "award_shows_slug_unique" RENAME TO "accolade_events_slug_unique";
