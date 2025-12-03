-- Update video URLs to use environment-aware format
-- This stores just the movie slug, frontend constructs full URL based on environment

-- Update Last Dance video sources
UPDATE video_sources 
SET url = 'last-dance'
WHERE movie_id = '3e5f236f-1a1b-40d4-aba8-729a8033d3bb';

-- Update The Signal video sources (if exists)
UPDATE video_sources 
SET url = 'the-signal'
WHERE movie_id IN (
    SELECT m.id 
    FROM movies m
    JOIN movie_translations mt ON m.id = mt.movie_id
    WHERE mt.title ILIKE '%signal%'
);

-- Verify updates
SELECT 
    vs.id,
    vs.movie_id,
    mt.title,
    vs.quality,
    vs.format,
    vs.url
FROM video_sources vs
JOIN movies m ON vs.movie_id = m.id
JOIN movie_translations mt ON m.id = mt.movie_id
WHERE vs.url IN ('last-dance', 'the-signal')
  AND mt.language = 'en';
