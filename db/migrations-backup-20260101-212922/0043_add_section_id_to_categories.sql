-- Migration: Add section_id to accolade_categories
-- Allows categories to be scoped to a specific section (e.g., "Best Actress" within "Asian Cinema New Talent")
-- When section_id is NULL, the category is event-wide

ALTER TABLE "accolade_categories"
ADD COLUMN "section_id" uuid REFERENCES "accolade_sections"("id") ON DELETE CASCADE;

-- Create index for efficient lookups
CREATE INDEX "idx_accolade_categories_section_id" ON "accolade_categories"("section_id");
