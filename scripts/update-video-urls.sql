-- Update video URLs from local paths to Google Cloud Storage
-- Run this against your PostgreSQL database

-- Update last-dance video URL
UPDATE movies 
SET video_url = 'https://storage.googleapis.com/lao-cinema-videos/hls/last-dance/master.m3u8'
WHERE title->>'en' LIKE '%Last Dance%' 
   OR title->>'lo' LIKE '%Last Dance%'
   OR id = '3e5f236f-1a1b-40d4-aba8-729a8033d3bb';

-- Update the-signal video URL (when uploaded)
UPDATE movies 
SET video_url = 'https://storage.googleapis.com/lao-cinema-videos/hls/the-signal/master.m3u8'
WHERE title->>'en' LIKE '%Signal%' 
   OR title->>'lo' LIKE '%Signal%';

-- Verify updates
SELECT id, title->>'en' as title, video_url 
FROM movies 
WHERE video_url LIKE '%storage.googleapis.com%';
