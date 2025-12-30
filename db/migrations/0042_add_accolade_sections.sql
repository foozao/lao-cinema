-- Migration: Add accolade sections for festival program tracks
-- Sections are non-competitive groupings like "Official Selection", "Panorama", etc.

-- Accolade sections table
CREATE TABLE IF NOT EXISTS "accolade_sections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL REFERENCES "accolade_events"("id") ON DELETE CASCADE,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Accolade section translations table
CREATE TABLE IF NOT EXISTS "accolade_section_translations" (
  "section_id" uuid NOT NULL REFERENCES "accolade_sections"("id") ON DELETE CASCADE,
  "language" "language" NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("section_id", "language")
);

-- Accolade section selections - Movies selected for a section in a specific edition
CREATE TABLE IF NOT EXISTS "accolade_section_selections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "section_id" uuid NOT NULL REFERENCES "accolade_sections"("id") ON DELETE CASCADE,
  "edition_id" uuid NOT NULL REFERENCES "accolade_editions"("id") ON DELETE CASCADE,
  "movie_id" uuid NOT NULL REFERENCES "movies"("id") ON DELETE CASCADE,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Accolade section selection translations - Optional notes about a selection
CREATE TABLE IF NOT EXISTS "accolade_section_selection_translations" (
  "selection_id" uuid NOT NULL REFERENCES "accolade_section_selections"("id") ON DELETE CASCADE,
  "language" "language" NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("selection_id", "language")
);
