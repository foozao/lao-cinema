# Uploading Videos to Google Cloud Storage

Quick guide for uploading your Lao Cinema videos to GCP.

---

## Quick Start

### 1. Upload All Local Videos

```bash
# From project root
./scripts/upload-to-gcs.sh
```

This will:
- Create the `lao-cinema-videos` bucket (if needed)
- Upload all videos from `web/public/videos/hls/`
- Set proper cache headers
- Print the public URLs

### 2. Upload a Single Video

```bash
# Upload specific video folder
gsutil -m cp -r web/public/videos/hls/your-movie gs://lao-cinema-videos/hls/your-movie/

# Set cache headers
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000" \
  "gs://lao-cinema-videos/hls/your-movie/**"
```

### 3. Access Your Videos

After upload, videos are available at:
```
https://storage.googleapis.com/lao-cinema-videos/hls/MOVIE_ID/master.m3u8
```

---

## Manual Upload via Console

1. Go to: https://console.cloud.google.com/storage/browser?project=lao-cinema
2. Click **Create Bucket** (if not exists)
   - Name: `lao-cinema-videos`
   - Location: `asia-southeast1` (Singapore)
   - Storage class: Standard
3. Click **Upload Folder**
4. Select your HLS video folder

---

## Enable Cloud CDN (Recommended)

For better performance and lower costs:

```bash
# Create a backend bucket
gcloud compute backend-buckets create lao-cinema-videos-backend \
  --gcs-bucket-name=lao-cinema-videos \
  --enable-cdn

# Create URL map
gcloud compute url-maps create lao-cinema-videos-lb \
  --default-backend-bucket=lao-cinema-videos-backend

# Create HTTP proxy
gcloud compute target-http-proxies create lao-cinema-videos-proxy \
  --url-map=lao-cinema-videos-lb

# Create forwarding rule (gets you a CDN IP)
gcloud compute forwarding-rules create lao-cinema-videos-rule \
  --global \
  --target-http-proxy=lao-cinema-videos-proxy \
  --ports=80

# Get the CDN IP
gcloud compute forwarding-rules describe lao-cinema-videos-rule --global
```

Then access via: `http://CDN_IP/hls/movie-id/master.m3u8`

---

## Access Control Options

### Option 1: Public Access (Simplest)

```bash
# Make bucket publicly readable
gsutil iam ch allUsers:objectViewer gs://lao-cinema-videos
```

**Pros**: Simple, works immediately
**Cons**: Anyone with URL can access

### Option 2: Signed URLs (Recommended)

Generate time-limited URLs from your API:

```typescript
// In your API
import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucket = storage.bucket('lao-cinema-videos');

async function getSignedVideoUrl(movieId: string) {
  const file = bucket.file(`hls/${movieId}/master.m3u8`);
  
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 3600 * 1000, // 1 hour
  });
  
  return url;
}
```

**Pros**: Secure, time-limited, access control
**Cons**: Requires API integration

### Option 3: IAM-Based (Most Secure)

Only authenticated users with proper IAM roles can access.

```bash
# Remove public access
gsutil iam ch -d allUsers:objectViewer gs://lao-cinema-videos

# Grant access to specific service account
gsutil iam ch serviceAccount:your-api@lao-cinema.iam.gserviceaccount.com:objectViewer \
  gs://lao-cinema-videos
```

---

## Cost Optimization

### Storage Costs
- **Standard**: $0.020/GB/month (asia-southeast1)
- **Nearline**: $0.010/GB/month (30-day minimum)
- **Coldline**: $0.004/GB/month (90-day minimum)

For movies you access frequently, use **Standard**.

### Bandwidth Costs
- **Within GCP (same region)**: Free
- **To internet (Asia)**: $0.12/GB (first 1TB)
- **With Cloud CDN**: $0.08/GB (first 10TB)

**Tip**: Enable Cloud CDN to reduce costs by ~33%

### Example: 100 movies (500GB)
- Storage: 500GB × $0.020 = **$10/month**
- Bandwidth (1TB/month): 1000GB × $0.08 = **$80/month**
- **Total: ~$90/month**

---

## Video Format Requirements

### HLS (Recommended)
```
movie-id/
├── master.m3u8          # Master playlist
├── 1080p.m3u8          # 1080p variant
├── 1080p_0000.ts       # Video segments
├── 1080p_0001.ts
├── 720p.m3u8           # 720p variant
├── 720p_0000.ts
└── ...
```

### Converting Videos to HLS

Use the existing script:
```bash
./scripts/convert-to-hls.sh input.mp4 movie-id
```

This creates the HLS folder structure in `web/public/videos/hls/movie-id/`

---

## Updating Your App

### 1. Update Movie Data

Change video URLs from local to GCS:

```typescript
// Before (local)
const videoUrl = '/videos/hls/movie-id/master.m3u8';

// After (GCS)
const videoUrl = 'https://storage.googleapis.com/lao-cinema-videos/hls/movie-id/master.m3u8';
```

### 2. Update Database Schema

Add a `video_url` field to your movies table:

```sql
ALTER TABLE movies ADD COLUMN video_url TEXT;

-- Update existing movies
UPDATE movies 
SET video_url = 'https://storage.googleapis.com/lao-cinema-videos/hls/' || id || '/master.m3u8'
WHERE id IN (SELECT id FROM movies WHERE video_url IS NULL);
```

### 3. Update VideoPlayer Component

```typescript
// components/video-player.tsx
export function VideoPlayer({ movieId }: { movieId: string }) {
  const videoUrl = `https://storage.googleapis.com/lao-cinema-videos/hls/${movieId}/master.m3u8`;
  
  return (
    <video controls>
      <source src={videoUrl} type="application/x-mpegURL" />
    </video>
  );
}
```

---

## Monitoring

### Check Upload Status
```bash
# List all videos
gsutil ls gs://lao-cinema-videos/hls/

# Check specific video
gsutil ls -lh gs://lao-cinema-videos/hls/movie-id/

# Get bucket size
gsutil du -sh gs://lao-cinema-videos
```

### View Access Logs
```bash
# Enable logging
gsutil logging set on -b gs://lao-cinema-logs gs://lao-cinema-videos

# View logs
gsutil ls gs://lao-cinema-logs/
```

---

## Troubleshooting

### Video won't play

**Check CORS settings:**
```bash
# Create cors.json
cat > cors.json <<EOF
[
  {
    "origin": ["https://lao-cinema-web-3ra6tqt7cq-as.a.run.app"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Range"],
    "maxAgeSeconds": 3600
  }
]
EOF

# Apply CORS
gsutil cors set cors.json gs://lao-cinema-videos
```

### Slow playback

1. **Enable Cloud CDN** (see above)
2. **Check video bitrate** - Lower if too high
3. **Use adaptive streaming** - Multiple quality levels

### High costs

1. **Enable Cloud CDN** - Reduces bandwidth costs
2. **Set lifecycle rules** - Delete old/unused videos
3. **Use Nearline storage** - For rarely accessed content

---

## Next Steps

1. ✅ Upload videos to GCS
2. ⬜ Enable Cloud CDN for better performance
3. ⬜ Implement signed URLs for security
4. ⬜ Update database with GCS URLs
5. ⬜ Test playback from GCS
6. ⬜ Monitor costs in first month

---

## Quick Commands Reference

```bash
# Upload all videos
./scripts/upload-to-gcs.sh

# Upload single video
gsutil -m cp -r web/public/videos/hls/movie-id gs://lao-cinema-videos/hls/

# List videos
gsutil ls gs://lao-cinema-videos/hls/

# Get bucket size
gsutil du -sh gs://lao-cinema-videos

# Make public
gsutil iam ch allUsers:objectViewer gs://lao-cinema-videos

# Remove public access
gsutil iam ch -d allUsers:objectViewer gs://lao-cinema-videos

# Set CORS
gsutil cors set cors.json gs://lao-cinema-videos

# Delete video
gsutil -m rm -r gs://lao-cinema-videos/hls/movie-id/
```
