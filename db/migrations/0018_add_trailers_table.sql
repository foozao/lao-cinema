-- Create trailer type enum
CREATE TYPE trailer_type AS ENUM ('youtube', 'video');

-- Create trailers table
CREATE TABLE IF NOT EXISTS "trailers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "movie_id" uuid NOT NULL REFERENCES "movies"("id") ON DELETE CASCADE,
  "type" trailer_type NOT NULL,
  
  -- YouTube trailer fields
  "youtube_key" text,
  
  -- Video file trailer fields
  "video_url" text,
  "video_format" video_format,
  "video_quality" video_quality,
  "size_bytes" integer,
  "width" integer,
  "height" integer,
  "duration_seconds" integer,
  
  -- Common fields
  "name" text NOT NULL,
  "official" boolean DEFAULT false,
  "language" text, -- ISO 639-1 language code
  "published_at" text,
  "order" integer DEFAULT 0, -- Display order
  
  -- Timestamps
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  
  -- Constraints: youtube trailers must have youtube_key, video trailers must have video_url
  CONSTRAINT "trailers_youtube_key_check" CHECK (
    (type = 'youtube' AND youtube_key IS NOT NULL) OR type != 'youtube'
  ),
  CONSTRAINT "trailers_video_url_check" CHECK (
    (type = 'video' AND video_url IS NOT NULL AND video_format IS NOT NULL AND video_quality IS NOT NULL) OR type != 'video'
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "trailers_movie_id_idx" ON "trailers"("movie_id");
CREATE INDEX IF NOT EXISTS "trailers_order_idx" ON "trailers"("movie_id", "order");

-- Migrate existing YouTube trailers from movies.trailers JSON column
DO $$
DECLARE
  movie_record RECORD;
  trailer_json jsonb;
  trailer_item jsonb;
  trailer_order integer;
BEGIN
  FOR movie_record IN SELECT id, trailers FROM movies WHERE trailers IS NOT NULL AND trailers != '' LOOP
    BEGIN
      trailer_json := movie_record.trailers::jsonb;
      trailer_order := 0;
      
      -- Loop through each trailer in the JSON array
      FOR trailer_item IN SELECT * FROM jsonb_array_elements(trailer_json) LOOP
        INSERT INTO trailers (
          movie_id,
          type,
          youtube_key,
          name,
          official,
          language,
          published_at,
          "order"
        ) VALUES (
          movie_record.id,
          'youtube',
          trailer_item->>'key',
          COALESCE(trailer_item->>'name', 'Trailer'),
          COALESCE((trailer_item->>'official')::boolean, false),
          trailer_item->>'iso_639_1',
          trailer_item->>'published_at',
          trailer_order
        );
        
        trailer_order := trailer_order + 1;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      -- Skip movies with invalid JSON
      CONTINUE;
    END;
  END LOOP;
END $$;

-- Remove the old trailers JSON column
ALTER TABLE "movies" DROP COLUMN IF EXISTS "trailers";
