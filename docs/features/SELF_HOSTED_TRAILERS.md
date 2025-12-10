# Self-Hosted Trailers Feature

## Overview

The Lao Cinema platform now supports both **YouTube trailers** and **self-hosted video trailers**. This allows you to:
- Continue using YouTube trailers from TMDB imports
- Upload and host your own trailer videos on GCS
- Mix both types for the same movie

## Database Schema

### New Table: `trailers`

```sql
CREATE TABLE trailers (
  id UUID PRIMARY KEY,
  movie_id UUID REFERENCES movies(id),
  type trailer_type NOT NULL, -- 'youtube' | 'video'
  
  -- YouTube fields
  youtube_key TEXT,
  
  -- Video file fields
  video_url TEXT,
  video_format video_format, -- 'hls' | 'mp4' | 'dash'
  video_quality video_quality, -- 'original' | '1080p' | '720p' | '480p' | '360p'
  size_bytes INTEGER,
  width INTEGER,
  height INTEGER,
  duration_seconds INTEGER,
  
  -- Common fields
  name TEXT NOT NULL,
  official BOOLEAN DEFAULT false,
  language TEXT, -- ISO 639-1 code
  published_at TEXT,
  "order" INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Migration

The migration (`0018_add_trailers_table.sql`) automatically:
1. Creates the `trailers` table
2. Migrates existing YouTube trailers from `movies.trailers` JSON column
3. Removes the old `movies.trailers` column

## API Endpoints

All trailer endpoints are under `/api/trailers` and require admin authentication for modifications.

### GET /api/trailers/:movieId
Get all trailers for a movie (ordered by display order).

**Response:**
```json
[
  {
    "id": "uuid",
    "type": "youtube",
    "name": "Official Trailer",
    "key": "youtube_video_id",
    "official": true,
    "order": 0
  },
  {
    "id": "uuid",
    "type": "video",
    "name": "Behind the Scenes",
    "video_url": "https://storage.googleapis.com/...",
    "video_format": "hls",
    "video_quality": "1080p",
    "official": false,
    "order": 1
  }
]
```

### POST /api/trailers/:movieId (Admin)
Create a new trailer.

**YouTube Trailer:**
```json
{
  "type": "youtube",
  "youtube_key": "dQw4w9WgXcQ",
  "name": "Official Trailer",
  "official": true,
  "language": "en",
  "order": 0
}
```

**Video Trailer:**
```json
{
  "type": "video",
  "video_url": "https://storage.googleapis.com/bucket/path/to/video.m3u8",
  "video_format": "hls",
  "video_quality": "1080p",
  "name": "Teaser Trailer",
  "official": true,
  "width": 1920,
  "height": 1080,
  "duration_seconds": 120,
  "order": 0
}
```

### PATCH /api/trailers/:trailerId (Admin)
Update trailer metadata.

```json
{
  "name": "Updated Trailer Name",
  "official": false,
  "order": 2
}
```

### DELETE /api/trailers/:trailerId (Admin)
Delete a trailer.

### POST /api/trailers/:movieId/reorder (Admin)
Reorder trailers by providing an array of trailer IDs.

```json
{
  "trailer_ids": ["uuid1", "uuid2", "uuid3"]
}
```

## Frontend Component

The `TrailerPlayer` component automatically handles both YouTube and video trailers:

```tsx
import { TrailerPlayer } from '@/components/trailer-player';

<TrailerPlayer 
  trailer={movie.trailers[0]} 
  className="w-full aspect-video"
/>
```

**Features:**
- Displays thumbnail (YouTube thumbnails or fallback play icon)
- Inline playback (no popup/modal)
- Close button to return to thumbnail
- Autoplay with mute on play
- Full video controls for video files
- Works on desktop and mobile

## TypeScript Types

```typescript
type TrailerType = 'youtube' | 'video';

interface BaseTrailer {
  id: string;
  type: TrailerType;
  name: string;
  official: boolean;
  language?: string;
  published_at?: string;
  order: number;
}

interface YouTubeTrailer extends BaseTrailer {
  type: 'youtube';
  key: string; // YouTube video ID
}

interface VideoTrailer extends BaseTrailer {
  type: 'video';
  video_url: string;
  video_format: 'hls' | 'mp4';
  video_quality: 'original' | '1080p' | '720p' | '480p' | '360p';
  size_bytes?: number;
  width?: number;
  height?: number;
  duration_seconds?: number;
}

type Trailer = YouTubeTrailer | VideoTrailer;
```

## Usage Workflow

### 1. For YouTube Trailers
YouTube trailers are automatically imported when you import a movie from TMDB.

### 2. For Self-Hosted Video Trailers

**Step 1: Upload video to GCS**
```bash
# Upload to GCS bucket
gsutil cp trailer.mp4 gs://lao-cinema-videos/trailers/movie-slug/

# Or for HLS
gsutil cp -r trailer-hls/ gs://lao-cinema-videos/trailers/movie-slug/
```

**Step 2: Create trailer via API**
```bash
curl -X POST https://api.laocinema.com/api/trailers/{movieId} \
  -H "Authorization: Basic {admin_credentials}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "video",
    "video_url": "https://storage.googleapis.com/lao-cinema-videos/trailers/movie-slug/master.m3u8",
    "video_format": "hls",
    "video_quality": "1080p",
    "name": "Official Trailer",
    "official": true,
    "width": 1920,
    "height": 1080,
    "duration_seconds": 120
  }'
```

**Step 3: Trailer appears on movie page**
The trailer will automatically appear in the movie detail page's trailer section.

## Video Formats

### Supported Formats
- **HLS** (`.m3u8`) - Recommended for adaptive streaming
- **MP4** - Simple progressive download
- **DASH** (future support)

### Recommended Encoding

**For HLS:**
```bash
ffmpeg -i input.mp4 \
  -codec: copy \
  -start_number 0 \
  -hls_time 10 \
  -hls_list_size 0 \
  -f hls \
  master.m3u8
```

**For MP4:**
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 \
  -preset slow \
  -crf 22 \
  -c:a aac \
  -b:a 128k \
  -movflags +faststart \
  output.mp4
```

## Admin Panel (To Be Implemented)

Future admin panel features:
- [ ] Upload trailer files directly from admin UI
- [ ] Preview trailers before saving
- [ ] Drag-and-drop reordering
- [ ] Bulk upload multiple trailers
- [ ] Generate thumbnails from video files
- [ ] Track trailer view analytics

## Testing

After running the migration:

```bash
# Run migration
cd db
npm run db:push

# Test the API
curl http://localhost:3001/api/trailers/{movieId}

# Run tests
cd api
npm test
```

## Migration Notes

- Existing YouTube trailers from TMDB imports are automatically migrated
- The old `movies.trailers` JSON column is removed
- Trailer display order is preserved during migration
- No data loss - all existing trailers are converted to the new schema

## Benefits

✅ **Full Control**: Host your own trailers without YouTube restrictions
✅ **No Ads**: Self-hosted trailers have no YouTube ads
✅ **Consistent Branding**: Maintain your brand experience
✅ **Better Analytics**: Track trailer views directly
✅ **Flexible**: Mix YouTube and self-hosted trailers
✅ **Future-Proof**: Ready for transcoding pipeline automation

## Future Enhancements

- Automatic thumbnail generation from video files
- Trailer view analytics and engagement metrics
- A/B testing different trailer versions
- Localized trailers per language
- Trailer upload via admin panel
- CDN integration for faster delivery
