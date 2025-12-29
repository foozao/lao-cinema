-- Add The Signal trailer to database
-- Run with: psql $DATABASE_URL -f scripts/add-trailer.sql

-- First, find The Signal movie ID
-- SELECT id, original_title FROM movies WHERE original_title ILIKE '%signal%';

-- Insert the trailer
-- video_url points to local video server: http://localhost:3002/trailers/hls/the-signal/master.m3u8
INSERT INTO trailers (
  movie_id,
  type,
  video_url,
  video_format,
  video_quality,
  duration_seconds,
  name,
  official,
  language,
  "order"
) VALUES (
  (SELECT id FROM movies WHERE original_title ILIKE '%signal%' LIMIT 1),
  'video',
  'http://localhost:3002/trailers/hls/the-signal/master.m3u8',
  'hls',
  '1080p',
  15,
  'Official Trailer',
  true,
  'lo',
  0
);

-- Verify
SELECT t.*, m.original_title 
FROM trailers t 
JOIN movies m ON t.movie_id = m.id 
WHERE m.original_title ILIKE '%signal%';
