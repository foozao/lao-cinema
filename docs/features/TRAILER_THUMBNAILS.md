# Trailer Thumbnail Extraction with Selection

Automatic thumbnail generation with user selection for self-hosted video trailers during HLS conversion.

## Overview

When converting trailers to HLS format, the system automatically extracts **5 thumbnail images** at different timestamps (2s, 4s, 6s, 8s, 10s). The uploader can then choose the best thumbnail via the admin panel, and unused thumbnails are cleaned up. This provides a preview image for trailer listings and carousels, similar to YouTube's thumbnail system.

## Implementation

### Database Schema

**Added field to `trailers` table:**
```sql
ALTER TABLE "trailers" ADD COLUMN "thumbnail_url" text;
```

The `thumbnail_url` field stores either:
- A slug (e.g., `"at-the-horizon"`) - converted to full URL by API
- A full URL (e.g., `"https://storage.googleapis.com/..."`) - used as-is

### Conversion Script

**File:** `scripts/media/convert-trailer-to-hls.sh`

The script now extracts 9 thumbnails at different timestamps before converting to HLS:

```bash
# Extract 9 thumbnails at different timestamps for selection
# Extract at 3s, 6s, 9s, 12s, 15s, 18s, 21s, 24s, 27s (spread across trailer)
ffmpeg -ss 3 -i "$INPUT_FILE" -vframes 1 -vf "scale='min(1920,iw)':-2" -q:v 2 "${OUTPUT_DIR}/thumbnail-1.jpg" -y
ffmpeg -ss 6 -i "$INPUT_FILE" -vframes 1 -vf "scale='min(1920,iw)':-2" -q:v 2 "${OUTPUT_DIR}/thumbnail-2.jpg" -y
ffmpeg -ss 9 -i "$INPUT_FILE" -vframes 1 -vf "scale='min(1920,iw)':-2" -q:v 2 "${OUTPUT_DIR}/thumbnail-3.jpg" -y
ffmpeg -ss 12 -i "$INPUT_FILE" -vframes 1 -vf "scale='min(1920,iw)':-2" -q:v 2 "${OUTPUT_DIR}/thumbnail-4.jpg" -y
ffmpeg -ss 15 -i "$INPUT_FILE" -vframes 1 -vf "scale='min(1920,iw)':-2" -q:v 2 "${OUTPUT_DIR}/thumbnail-5.jpg" -y
ffmpeg -ss 18 -i "$INPUT_FILE" -vframes 1 -vf "scale='min(1920,iw)':-2" -q:v 2 "${OUTPUT_DIR}/thumbnail-6.jpg" -y
ffmpeg -ss 21 -i "$INPUT_FILE" -vframes 1 -vf "scale='min(1920,iw)':-2" -q:v 2 "${OUTPUT_DIR}/thumbnail-7.jpg" -y
ffmpeg -ss 24 -i "$INPUT_FILE" -vframes 1 -vf "scale='min(1920,iw)':-2" -q:v 2 "${OUTPUT_DIR}/thumbnail-8.jpg" -y
ffmpeg -ss 27 -i "$INPUT_FILE" -vframes 1 -vf "scale='min(1920,iw)':-2" -q:v 2 "${OUTPUT_DIR}/thumbnail-9.jpg" -y
```

**Output structure:**
```
video-server/trailers/hls/movie-slug/
├── thumbnail-1.jpg       # Option 1 (3s)
├── thumbnail-2.jpg       # Option 2 (6s)
├── thumbnail-3.jpg       # Option 3 (9s)
├── thumbnail-4.jpg       # Option 4 (12s)
├── thumbnail-5.jpg       # Option 5 (15s)
├── thumbnail-6.jpg       # Option 6 (18s)
├── thumbnail-7.jpg       # Option 7 (21s)
├── thumbnail-8.jpg       # Option 8 (24s)
├── thumbnail-9.jpg       # Option 9 (27s)
├── master.m3u8           # HLS master playlist
├── stream_0/             # 1080p variant
├── stream_1/             # 720p variant
├── stream_2/             # 480p variant
└── stream_3/             # 360p variant
```

### API Changes

**Files modified:**
- `api/src/routes/trailers.ts` - Added `thumbnail_url` to validation schemas and thumbnail selection endpoint
- `api/src/lib/movie-builder.ts` - Constructs full thumbnail URLs from slugs (supports numbered thumbnails)
- `db/src/schema.ts` - Added `thumbnailUrl` field to trailers table
- `web/app/[locale]/admin/edit/[id]/components/MediaTab.tsx` - Thumbnail selection UI

**URL Construction Logic:**

For HLS trailers with slug `"at-the-horizon"`:
```
video_url: {baseUrl}/trailers/hls/at-the-horizon/master.m3u8
thumbnail_url: {baseUrl}/trailers/hls/at-the-horizon/thumbnail-3.jpg  # After selection
```

The system supports both patterns:
- `"at-the-horizon/thumbnail-3.jpg"` - Stored after selection (includes slug and filename)
- `"at-the-horizon"` - Legacy format (defaults to thumbnail.jpg)

Where `{baseUrl}` is derived from `VIDEO_BASE_URL` environment variable:
- Local: `http://localhost:3000/trailers`
- Production: `https://storage.googleapis.com/lao-cinema-trailers`

### Frontend Changes

**File:** `web/lib/types.ts`

Added `thumbnail_url` to `VideoTrailer` interface:
```typescript
export interface VideoTrailer extends BaseTrailer {
  type: 'video';
  video_url: string;
  video_format: 'hls' | 'mp4';
  video_quality: 'original' | '1080p' | '720p' | '480p' | '360p';
  thumbnail_url?: string; // Thumbnail image URL
  // ... other fields
}
```

**File:** `web/app/[locale]/admin/edit/[id]/components/MediaTab.tsx`

Updated trailer display to show thumbnails:
```tsx
{isSelfHosted && trailer.thumbnail_url ? (
  <img
    src={trailer.thumbnail_url}
    alt={trailer.name}
    className="w-32 h-18 rounded object-cover flex-shrink-0"
  />
) : (
  <div className="w-32 h-18 rounded bg-gradient-to-br from-green-100 to-green-200">
    <span className="text-green-600 text-xs font-medium">Self-hosted</span>
  </div>
)}
```

## Usage Workflow

### 1. Convert Trailer to HLS

```bash
./scripts/media/convert-trailer-to-hls.sh ~/Downloads/trailer.mp4 movie-slug
```

This generates:
- HLS streams at multiple quality levels
- 5 thumbnail options (`thumbnail-1.jpg` through `thumbnail-5.jpg`)

### 2. Upload to GCS

```bash
./scripts/upload-to-gcs.sh video-server/trailers/hls/movie-slug
```

Uploads all files including the 5 thumbnail options.

### 3. Add Trailer via Admin Panel

In the movie edit page:
1. Go to "Media" tab → "Trailers" section
2. Select "Self-hosted Video" tab
3. Fill in:
   - **Name:** "Official Trailer"
   - **Slug:** `movie-slug` (matches the folder name)
   - **Format:** HLS
4. Click "Add Trailer"

The trailer is added without a thumbnail initially.

### 4. Select Thumbnail

After adding the trailer:
1. Find the trailer in the list
2. Click **"Choose Thumbnail"** button
3. A modal opens showing all 9 thumbnail options with timestamps
4. Click on the best thumbnail to select it
5. The selected thumbnail is saved, and unused thumbnails can be cleaned up

### 5. View in Admin Panel

The trailer list will display the selected thumbnail image alongside the trailer name and metadata.

## Thumbnail Specifications

- **Number of options:** 9 thumbnails
- **Extraction times:** 3s, 6s, 9s, 12s, 15s, 18s, 21s, 24s, 27s
- **Max width:** 1920px (preserves aspect ratio)
- **Format:** JPEG
- **Quality:** High (ffmpeg `-q:v 2`)
- **Filenames:** `thumbnail-1.jpg` through `thumbnail-9.jpg`

## API Endpoints

### Create Trailer

```bash
POST /api/trailers/:movieId
Content-Type: application/json

{
  "type": "video",
  "name": "Official Trailer",
  "video_url": "movie-slug",
  "video_format": "hls",
  "video_quality": "original",
  "official": true,
  "order": 0
}
```

Note: Thumbnail is not set initially. Use the selection endpoint after upload.

### Select Thumbnail

```bash
POST /api/trailers/:trailerId/select-thumbnail
Content-Type: application/json

{
  "thumbnail_number": 3  // 1-9
}
```

This updates the trailer's `thumbnail_url` to `{slug}/thumbnail-{number}.jpg` and returns success.

### Update Trailer

```bash
PATCH /api/trailers/:trailerId
Content-Type: application/json

{
  "name": "Updated Name",
  "thumbnail_url": "movie-slug/thumbnail-2.jpg"  // Can manually update if needed
}
```

## Migration

**Migration file:** `db/migrations/0038_lively_golden_guardian.sql`

```sql
ALTER TABLE "trailers" ADD COLUMN "thumbnail_url" text;
```

**Apply migration:**
```bash
npm run db:update  # From project root
```

## Benefits

1. **Visual Preview:** Users can see what the trailer looks like before playing
2. **Better UX:** Trailer carousels and lists are more engaging with thumbnails
3. **Consistency:** Self-hosted trailers now have the same visual treatment as YouTube trailers
4. **Automatic:** No manual thumbnail creation needed - extracted during conversion
5. **Flexible:** Supports both slug-based and full URL thumbnails

## Future Enhancements

- Extract multiple thumbnails for sprite sheets (for scrubbing preview)
- Allow custom thumbnail upload (override auto-generated)
- Generate thumbnails at different sizes (responsive images)
- Add thumbnail extraction for MP4 trailers (not just HLS)
- WebP format support for smaller file sizes
