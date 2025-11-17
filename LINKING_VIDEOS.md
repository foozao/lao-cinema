# Linking Local Videos to Movies (Development)

Quick guide for connecting your converted HLS videos to movies in the database.

## Overview

Your videos live in: `web/public/videos/hls/<video-slug>/`  
Your movies are in the database with UUIDs.

**Solution:** Store video paths in the `video_sources` table.

## Step-by-Step Guide

### 1. Get Your Movie ID

Find the movie you want to link in the database:

```bash
# Connect to database
cd db
npm run db:studio

# Or via psql
psql -d lao_cinema -c "SELECT id, original_title FROM movies;"
```

Copy the UUID of your movie (e.g., `abc-123-def-456`)

### 2. Link the Video

**Option A: Using SQL (Simplest)**

```bash
# Edit db/link-video.sql and set:
# - movie_id to your movie UUID
# - video_slug to your video folder name (e.g., 'the-signal')

psql -d lao_cinema -f db/link-video.sql
```

**Option B: Using API Script**

```bash
cd api
npm run link-video <movie-id> <video-slug>

# Example:
npm run link-video abc-123-def-456 the-signal
```

**Option C: Direct SQL**

```sql
INSERT INTO video_sources (movie_id, quality, format, url)
VALUES 
  ('YOUR_MOVIE_UUID', '1080p', 'hls', '/videos/hls/the-signal/master.m3u8'),
  ('YOUR_MOVIE_UUID', '720p', 'hls', '/videos/hls/the-signal/master.m3u8'),
  ('YOUR_MOVIE_UUID', '480p', 'hls', '/videos/hls/the-signal/master.m3u8'),
  ('YOUR_MOVIE_UUID', '360p', 'hls', '/videos/hls/the-signal/master.m3u8');
```

### 3. Verify

```bash
# Check video sources
psql -d lao_cinema -c "
  SELECT m.original_title, vs.quality, vs.url 
  FROM video_sources vs 
  JOIN movies m ON m.id = vs.movie_id;
"
```

### 4. Test Playback

Visit: `http://localhost:3000/en/movies/<movie-id>`

The video player should now show your HLS video!

---

## Video Naming Convention

For development, use **descriptive slugs** (like movie titles):

```
✅ Good:
/videos/hls/the-signal/master.m3u8
/videos/hls/parasite/master.m3u8
/videos/hls/everything-everywhere/master.m3u8

❌ Avoid (hard to manage):
/videos/hls/abc-123-uuid/master.m3u8
/videos/hls/video-001/master.m3u8
```

**Why?** Easier to:
- Find videos when debugging
- Match videos to movies manually
- Manage files in file system

**Production:** You'll use CDN URLs, so local naming doesn't matter.

---

## Multiple Qualities

The HLS master playlist (`master.m3u8`) **automatically handles all qualities**. The player switches between them based on bandwidth.

You don't need separate URLs per quality. All four entries point to the same master playlist, which references:
- `stream_0.m3u8` (1080p)
- `stream_1.m3u8` (720p)
- `stream_2.m3u8` (480p)
- `stream_3.m3u8` (360p)

---

## Quick Reference

**Convert video:**
```bash
./scripts/convert-to-hls.sh ~/Downloads/movie.mkv movie-slug
```

**Link to movie:**
```bash
# Get movie ID
psql -d lao_cinema -c "SELECT id, original_title FROM movies LIMIT 5;"

# Link video
psql -d lao_cinema -c "
  INSERT INTO video_sources (movie_id, quality, format, url)
  VALUES ('MOVIE_UUID', '1080p', 'hls', '/videos/hls/movie-slug/master.m3u8');
"
```

**Test:**
```
http://localhost:3000/en/movies/MOVIE_UUID
```

---

## Troubleshooting

**Video doesn't play:**
1. Check video exists: `ls web/public/videos/hls/movie-slug/`
2. Check database: `SELECT * FROM video_sources WHERE movie_id = 'YOUR_UUID';`
3. Check browser console for errors
4. Verify dev server is running: `cd web && npm run dev`

**Wrong video shows:**
- Each movie should have its own unique video source
- Check: `SELECT movie_id, url FROM video_sources;`

**404 Not Found:**
- Video path in database must match actual file location
- Path should start with `/videos/hls/`
- Don't include `public/` in the URL (Next.js serves from public automatically)

---

## Production Notes

In production, you'll replace these local URLs with CDN URLs:

**Development:**
```
/videos/hls/the-signal/master.m3u8
```

**Production:**
```
https://lacinema.b-cdn.net/videos/abc-123/master.m3u8
```

The database schema is the same - just update the `url` field when you migrate to CDN.

See `VIDEO_ARCHITECTURE.md` for production strategy.
