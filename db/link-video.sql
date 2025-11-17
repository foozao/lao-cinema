-- Development utility: Link a local HLS video to a movie
-- 
-- Usage:
-- 1. Replace 'YOUR_MOVIE_ID' with the actual movie UUID
-- 2. Replace 'the-signal' with your video folder name
-- 3. Run: psql -d lao_cinema -f db/link-video.sql

-- Variables (edit these)
\set movie_id '\'YOUR_MOVIE_ID\''
\set video_slug '\'the-signal\''

-- Insert HLS master playlist (adaptive quality)
INSERT INTO video_sources (movie_id, quality, format, url)
VALUES 
  (:movie_id, '1080p', 'hls', '/videos/hls/' || :video_slug || '/master.m3u8'),
  (:movie_id, '720p', 'hls', '/videos/hls/' || :video_slug || '/master.m3u8'),
  (:movie_id, '480p', 'hls', '/videos/hls/' || :video_slug || '/master.m3u8'),
  (:movie_id, '360p', 'hls', '/videos/hls/' || :video_slug || '/master.m3u8')
ON CONFLICT DO NOTHING;

-- Verify
SELECT 
  m.original_title,
  vs.quality,
  vs.format,
  vs.url
FROM video_sources vs
JOIN movies m ON m.id = vs.movie_id
WHERE vs.movie_id = :movie_id;
