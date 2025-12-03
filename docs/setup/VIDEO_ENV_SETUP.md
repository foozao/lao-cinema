# Video URL Environment Setup

This guide explains how video URLs work in different environments.

## How It Works

The app automatically uses the correct video source based on environment:

- **Development (localhost)**: Local files from `/public/videos/hls/`
- **Production (GCP)**: Google Cloud Storage

## Setup

### 1. Create `.env.local` for Development

Create `web/.env.local`:

```bash
# Local development - use local video files
NEXT_PUBLIC_VIDEO_BASE_URL=/videos/hls
```

This tells the app to use local files when running `npm run dev`.

### 2. Production is Already Configured

The deployment script (`scripts/deploy.sh`) automatically sets:

```bash
NEXT_PUBLIC_VIDEO_BASE_URL=https://storage.googleapis.com/lao-cinema-videos/hls
```

No manual configuration needed for GCP!

## Usage in Code

Use the `getVideoUrl()` helper function:

```typescript
import { getVideoUrl } from '@/lib/video-url';

// Automatically returns correct URL based on environment
const videoUrl = getVideoUrl('last-dance');

// Development: /videos/hls/last-dance/master.m3u8
// Production:  https://storage.googleapis.com/lao-cinema-videos/hls/last-dance/master.m3u8
```

## Testing

### Test Locally
```bash
cd web
npm run dev
# Visit http://localhost:3000/test-video
# Should load from /public/videos/hls/last-dance/
```

### Test on GCP
```bash
# Deploy
./scripts/deploy.sh

# Visit https://lao-cinema-web-3ra6tqt7cq-as.a.run.app/test-video
# Should load from Google Cloud Storage
```

## Troubleshooting

### Video doesn't play locally

1. Check files exist: `ls web/public/videos/hls/last-dance/`
2. Verify `.env.local` has: `NEXT_PUBLIC_VIDEO_BASE_URL=/videos/hls`
3. Restart dev server: `npm run dev`

### Video doesn't play on GCP

1. Check files uploaded: `gsutil ls gs://lao-cinema-videos/hls/last-dance/`
2. Verify CORS enabled: `gsutil cors get gs://lao-cinema-videos`
3. Check deployment env vars:
   ```bash
   gcloud run services describe lao-cinema-web \
     --region=asia-southeast1 \
     --format="value(spec.template.spec.containers[0].env)"
   ```

## Helper Functions

### `getVideoUrl(movieSlug: string)`
Returns the full URL to the HLS master playlist.

### `isUsingCloudStorage()`
Returns `true` if using GCS, `false` if using local files.

### `getVideoBaseUrl()`
Returns the base URL for videos.

## Example

```typescript
import { getVideoUrl, isUsingCloudStorage } from '@/lib/video-url';

export default function MoviePage({ movieSlug }: { movieSlug: string }) {
  const videoUrl = getVideoUrl(movieSlug);
  
  console.log('Using cloud storage:', isUsingCloudStorage());
  // Development: false
  // Production: true
  
  return <VideoPlayer src={videoUrl} />;
}
```
