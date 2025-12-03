# Environment-Aware Video URLs - Complete Setup

This document explains the complete setup for environment-aware video URLs that work seamlessly in both local development and production.

## Overview

**Problem**: Videos need to be served from different locations:
- **Local development**: Separate video server on port 3002 (mimics CDN)
- **Production (GCP)**: Google Cloud Storage

**Solution**: Store only the movie slug in the database (e.g., `last-dance`), and construct the full URL based on environment variables.

## Architecture

```
Database (video_sources table)
└── url: "last-dance" (just the slug)
    ↓
API (constructs full URL)
├── Local: http://localhost:3000/videos/hls/last-dance/master.m3u8
└── GCP: https://storage.googleapis.com/lao-cinema-videos/hls/last-dance/master.m3u8
    ↓
Frontend (receives full URL from API)
└── VideoPlayer plays the video
```

## Setup Steps

### 1. Database Schema

Video URLs in the `video_sources` table now store **only the movie slug**:

```sql
-- Example data
INSERT INTO video_sources (movie_id, quality, format, url)
VALUES 
  ('3e5f236f-1a1b-40d4-aba8-729a8033d3bb', '1080p', 'hls', 'last-dance'),
  ('3e5f236f-1a1b-40d4-aba8-729a8033d3bb', '720p', 'hls', 'last-dance');
```

### 2. API Environment Variables

**Local Development** (`api/.env`):
```bash
VIDEO_BASE_URL=http://localhost:3000/videos/hls
```

**Production (GCP)** - Set in `scripts/deploy.sh`:
```bash
VIDEO_BASE_URL=https://storage.googleapis.com/lao-cinema-videos/hls
```

### 3. API Code

The API constructs full URLs when returning movie data:

```typescript
// api/src/routes/movies.ts
video_sources: videoSources.map(vs => {
  const baseUrl = process.env.VIDEO_BASE_URL || 'https://storage.googleapis.com/lao-cinema-videos/hls';
  const fullUrl = `${baseUrl}/${vs.url}/master.m3u8`;
  
  return {
    id: vs.id,
    quality: vs.quality,
    format: vs.format,
    url: fullUrl,  // Full URL returned to frontend
    size_bytes: vs.sizeBytes,
  };
})
```

### 4. Frontend (Optional Helper)

The frontend can also use the helper for direct access:

**Web Environment Variables**:

**Local Development** (`web/.env.local`):
```bash
NEXT_PUBLIC_VIDEO_BASE_URL=/videos/hls
```

**Production (GCP)** - Set in `scripts/deploy.sh`:
```bash
NEXT_PUBLIC_VIDEO_BASE_URL=https://storage.googleapis.com/lao-cinema-videos/hls
```

**Helper Function** (`web/lib/video-url.ts`):
```typescript
export function getVideoUrl(movieSlug: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_VIDEO_BASE_URL || '/videos/hls';
  return `${baseUrl}/${movieSlug}/master.m3u8`;
}
```

## How It Works

### Local Development

1. **Start services**:
   ```bash
   # Terminal 1: API
   cd api && npm run dev
   
   # Terminal 2: Web
   cd web && npm run dev
   ```

2. **API returns**:
   ```json
   {
     "video_sources": [
       {
         "url": "http://localhost:3000/videos/hls/last-dance/master.m3u8"
       }
     ]
   }
   ```

3. **Frontend plays** from local files in `web/public/videos/hls/last-dance/`

### Production (GCP)

1. **Deploy**:
   ```bash
   ./scripts/deploy.sh
   ```

2. **API returns**:
   ```json
   {
     "video_sources": [
       {
         "url": "https://storage.googleapis.com/lao-cinema-videos/hls/last-dance/master.m3u8"
       }
     ]
   }
   ```

3. **Frontend plays** from Google Cloud Storage

## Migration Guide

If you have existing movies with full URLs in the database, run this migration:

```bash
# Update database
psql "postgresql://laocinema:laocinema_dev@localhost:5432/lao_cinema" \
  -f db/update-video-urls.sql
```

This converts:
- ❌ `/videos/hls/last-dance/master.m3u8`
- ✅ `last-dance`

## Adding New Movies

When adding a new movie, store only the slug:

```sql
INSERT INTO video_sources (movie_id, quality, format, url)
VALUES 
  ('movie-uuid', '1080p', 'hls', 'movie-slug');
  --                                ^^^^^^^^^^
  --                                Just the slug!
```

## Testing

### Test Local Development

```bash
# 1. Ensure local videos exist
ls web/public/videos/hls/last-dance/

# 2. Set API env var
echo "VIDEO_BASE_URL=http://localhost:3000/videos/hls" >> api/.env

# 3. Start services
cd api && npm run dev &
cd web && npm run dev

# 4. Visit http://localhost:3000/en/movies/3e5f236f-1a1b-40d4-aba8-729a8033d3bb/watch
# Should play from local files
```

### Test Production

```bash
# 1. Deploy
./scripts/deploy.sh

# 2. Visit your GCP URL
# https://lao-cinema-web-3ra6tqt7cq-as.a.run.app/en/movies/3e5f236f-1a1b-40d4-aba8-729a8033d3bb/watch
# Should play from Google Cloud Storage
```

## Troubleshooting

### Video doesn't play locally

1. **Check API env var**:
   ```bash
   grep VIDEO_BASE_URL api/.env
   # Should be: VIDEO_BASE_URL=http://localhost:3000/videos/hls
   ```

2. **Check files exist**:
   ```bash
   ls web/public/videos/hls/last-dance/master.m3u8
   ```

3. **Check API response**:
   ```bash
   curl http://localhost:3001/api/movies/3e5f236f-1a1b-40d4-aba8-729a8033d3bb | jq '.video_sources'
   # Should show: http://localhost:3000/videos/hls/last-dance/master.m3u8
   ```

### Video doesn't play on GCP

1. **Check API env var**:
   ```bash
   gcloud run services describe lao-cinema-api \
     --region=asia-southeast1 \
     --format="value(spec.template.spec.containers[0].env)" | grep VIDEO
   # Should show: VIDEO_BASE_URL=https://storage.googleapis.com/lao-cinema-videos/hls
   ```

2. **Check files in GCS**:
   ```bash
   gsutil ls gs://lao-cinema-videos/hls/last-dance/
   ```

3. **Check API response**:
   ```bash
   curl https://lao-cinema-api-3ra6tqt7cq-as.a.run.app/api/movies/3e5f236f-1a1b-40d4-aba8-729a8033d3bb | jq '.video_sources'
   # Should show: https://storage.googleapis.com/lao-cinema-videos/hls/last-dance/master.m3u8
   ```

## Benefits

✅ **Single source of truth**: Database stores only the slug
✅ **Environment-aware**: Automatically uses correct URL based on environment
✅ **Easy to change**: Update `VIDEO_BASE_URL` to switch CDN providers
✅ **No code changes**: Same code works in dev and production
✅ **Future-proof**: Easy to add more environments (staging, etc.)

## Files Modified

- `db/src/schema.ts` - Video sources schema
- `db/update-video-urls.sql` - Migration script
- `api/src/routes/movies.ts` - URL construction logic
- `api/.env.example` - API environment example
- `web/lib/video-url.ts` - Frontend helper (optional)
- `web/.env.local` - Web environment (create this)
- `scripts/deploy.sh` - Deployment with env vars
