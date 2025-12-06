# Video Storage & Delivery Architecture

This document outlines the video infrastructure strategy for Lao Cinema, from development to production.

## Table of Contents

1. [Current Setup (Development)](#current-setup-development)
2. [Production Architecture](#production-architecture)
3. [Recommended Solutions](#recommended-solutions)
4. [Migration Path](#migration-path)
5. [Security & Access Control](#security--access-control)
6. [Cost Analysis](#cost-analysis)
7. [Implementation Roadmap](#implementation-roadmap)

---

## Current Setup (Development)

### Local HLS Streaming

**Location:** `web/public/videos/hls/`

**How it works:**
- Videos stored locally in Next.js public directory
- Served directly by Next.js dev server
- Perfect for development and testing
- **NOT suitable for production**

**Limitations:**
- ❌ Not scalable (files on application server)
- ❌ No global CDN distribution
- ❌ Large disk space requirements
- ❌ No access control or security
- ❌ Poor performance for multiple users
- ❌ No automatic transcoding

**Current workflow:**
1. Convert video: `./scripts/convert-to-hls.sh input.mp4 output-name`
2. Files stored in: `public/videos/hls/output-name/`
3. Accessed via: `http://localhost:3000/videos/hls/output-name/master.m3u8`

---

## Production Architecture

### Recommended Architecture: Cloud Storage + CDN

```
┌─────────────────┐
│   User Browser  │
└────────┬────────┘
         │ 1. Request video
         ▼
┌─────────────────┐
│   Next.js App   │
│   (Vercel)      │
└────────┬────────┘
         │ 2. Query movie metadata
         ▼
┌─────────────────┐
│   PostgreSQL    │ ────┐
│   (Neon/Supabase)     │ 3. Return signed URL
└─────────────────┘     │
                        │
         ┌──────────────┘
         │ 4. Return URL to browser
         ▼
┌─────────────────┐
│   User Browser  │
└────────┬────────┘
         │ 5. Request HLS stream (direct)
         ▼
┌─────────────────┐
│   Video CDN     │
│ (Cloudflare/    │
│  Bunny/Mux)     │
└────────┬────────┘
         │ 6. Stream video
         ▼
┌─────────────────┐
│ Origin Storage  │
│ (S3/R2/Bunny)   │
└─────────────────┘
```

### Key Principles

1. **Separation of Concerns**
   - Application servers serve API/pages only
   - Video files served by CDN (never through Next.js)
   - Database stores metadata + video URLs

2. **Global Distribution**
   - CDN edge servers worldwide
   - Low latency for all users
   - Automatic bandwidth optimization

3. **Security**
   - Signed URLs with expiration
   - Access control in API layer
   - Optional DRM for premium content

4. **Scalability**
   - CDN handles unlimited concurrent users
   - No load on application servers
   - Automatic scaling

---

## Recommended Solutions

### Option 1: Cloudflare Stream (Easiest) ⭐

**Best for:** Quick launch, minimal setup, great DX

**Pros:**
- ✅ Automatic transcoding (upload any format)
- ✅ Global CDN included
- ✅ Built-in player or use your own
- ✅ Signed URLs built-in
- ✅ Analytics dashboard
- ✅ 99.9% uptime SLA

**Cons:**
- ❌ Higher cost at scale ($1/1000 minutes delivered)
- ❌ Vendor lock-in

**Pricing:**
- Storage: $5/1000 minutes stored/month
- Delivery: $1/1000 minutes delivered
- Example: 100 movies × 90min = $45/month storage + delivery costs

**Implementation:**
```typescript
// Upload video
const response = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Tus-Resumable': '1.0.0',
      'Upload-Length': fileSize,
    },
  }
);

// Get signed URL for playback
const videoUrl = `https://customer-${subdomain}.cloudflarestream.com/${videoId}/manifest/video.m3u8?token=${token}`;
```

### Option 2: Bunny Stream (Cost-Effective) 💰

**Best for:** Budget-conscious, high volume

**Pros:**
- ✅ Very affordable ($0.005/GB + $0.01/GB CDN)
- ✅ 114+ edge locations
- ✅ Automatic transcoding
- ✅ Good API
- ✅ European company (GDPR compliant)

**Cons:**
- ❌ Smaller ecosystem than AWS
- ❌ Less brand recognition

**Pricing:**
- Storage: $0.005/GB/month (~$5 for 1TB)
- CDN: $0.01-0.03/GB depending on zone
- Encoding: Free with storage
- Example: 100 movies (500GB) = ~$2.50/month + delivery

**Implementation:**
```typescript
// Upload to Bunny Storage
await fetch(`https://storage.bunnycdn.com/${storageZone}/${path}`, {
  method: 'PUT',
  headers: {
    'AccessKey': apiKey,
  },
  body: fileStream,
});

// Video URL
const videoUrl = `https://${pullZone}.b-cdn.net/videos/${videoId}/playlist.m3u8`;
```

### Option 3: AWS S3 + CloudFront (Enterprise) 🏢

**Best for:** Full control, existing AWS infrastructure

**Pros:**
- ✅ Maximum flexibility
- ✅ Integrates with AWS ecosystem
- ✅ Industry standard
- ✅ Advanced features (AWS MediaConvert, etc.)

**Cons:**
- ❌ Complex setup
- ❌ Need to handle transcoding separately
- ❌ More expensive than Bunny

**Pricing:**
- S3 Storage: $0.023/GB/month
- CloudFront: $0.085/GB (first 10TB)
- MediaConvert: $0.015/minute (HD)
- Example: 100 movies (500GB) = ~$11.50/month + delivery + transcoding

**Implementation:**
```typescript
// Upload to S3
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });
await s3.send(new PutObjectCommand({
  Bucket: 'lao-cinema-videos',
  Key: `videos/${videoId}/master.m3u8`,
  Body: fileStream,
}));

// CloudFront signed URL
const videoUrl = getSignedUrl(
  `https://d123abc.cloudfront.net/videos/${videoId}/master.m3u8`,
  privateKey,
  { expiresIn: 3600 }
);
```

### Option 4: Self-Hosted Origin + CDN (Advanced) 🏗️

**Consider if you have access to a data center** - Can be very cost-effective at scale.

**Best Approach: Hybrid**
- Self-host origin storage in your data center
- Use BunnyCDN for edge delivery
- 70-80% cost savings vs. pure CDN at scale

**Pros:**
- ✅ Massive cost savings (50TB: $2,000/month vs $6,400/month)
- ✅ Full control over storage and origin
- ✅ No vendor lock-in for storage
- ✅ Can leverage existing infrastructure
- ✅ Global performance (via CDN edge)

**Cons:**
- ❌ 2-3 months setup time
- ❌ Requires DevOps expertise
- ❌ Infrastructure maintenance burden
- ❌ Need to manage backups and monitoring

**Requirements:**
- Data center with 10+ TB storage
- 1-2 technical staff for maintenance
- 1Gbps+ internet connection
- Server hardware (can be modest)

**Break-even:** ~5TB/month delivery

**Implementation Details:**

**Architecture:**
```
User → CDN Edge (BunnyCDN) → Your Origin Server → Your Storage (MinIO)
```

**Components:**
- **Storage**: MinIO (S3-compatible) in your data center
- **Origin Server**: NGINX (serves only to CDN, not end users)
- **CDN**: BunnyCDN for global edge delivery
- **Transcoding**: FFmpeg with job queue (BullMQ + Redis)

**Cost Comparison (50TB/month):**
- Self-hosted + CDN: ~$2,000/month
- Pure Cloudflare Stream: ~$6,400/month
- **Savings: $4,370/month or $52,440/year**

**Minimum Hardware:**
- Storage: 2x 10TB HDD (RAID 1)
- Server: 4 vCPU, 8GB RAM, 1Gbps uplink
- Can use existing data center infrastructure

**Implementation Path:**
1. **Week 1-2**: Launch with BunnyCDN only (fast start)
2. **Month 2-3**: Build self-hosted origin in parallel
3. **Month 4**: Migrate to hybrid approach
4. **Month 6**: Fully automated and optimized

**When to Choose Self-Hosted:**
- ✅ Have data center access
- ✅ Traffic >5TB/month (or will be)
- ✅ Have 1-2 technical staff
- ✅ Can invest 2-3 months setup
- ✅ Want 70% cost savings long-term

**When to Choose Pure CDN:**
- ✅ Need to launch in <2 weeks
- ✅ Traffic <5TB/month
- ✅ No DevOps team
- ✅ Want hands-off management

---

## Migration Path

### Phase 1: Development (Current) ✅

**Status:** Complete
- Local HLS in `public/videos/`
- Manual conversion with FFmpeg
- Test page at `/test-video`

### Phase 2: Database Schema (Next)

**Add to `db/src/schema.ts`:**

```typescript
export const videoFiles = pgTable('video_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  movieId: uuid('movie_id').references(() => movies.id).notNull(),
  
  // Storage metadata
  provider: varchar('provider', { length: 50 }).notNull(), // 'cloudflare' | 'bunny' | 's3' | 'local'
  providerId: varchar('provider_id', { length: 255 }), // External ID from provider
  
  // Quality variant
  quality: varchar('quality', { length: 20 }).notNull(), // '1080p' | '720p' | '480p' | '360p' | 'original'
  format: varchar('format', { length: 10 }).notNull(), // 'hls' | 'mp4'
  
  // URLs
  publicUrl: text('public_url'), // For local/public URLs
  cdnUrl: text('cdn_url'), // CDN URL
  signedUrlRequired: boolean('signed_url_required').default(true),
  
  // File info
  sizeBytes: bigint('size_bytes', { mode: 'number' }),
  duration: integer('duration'), // in seconds
  bitrate: integer('bitrate'), // in kbps
  codec: varchar('codec', { length: 50 }),
  
  // Status
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'processing' | 'ready' | 'failed'
  processingProgress: integer('processing_progress'), // 0-100
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Phase 3: API Layer

**Create `/api/src/routes/videos.ts`:**

```typescript
// GET /api/movies/:id/video
// Returns signed URL for video playback
app.get('/movies/:id/video', async (request, reply) => {
  const { id } = request.params;
  const user = request.user; // From auth middleware
  
  // 1. Check if user has access to this movie
  const hasAccess = await checkUserAccess(user.id, id);
  if (!hasAccess) {
    return reply.code(403).send({ error: 'Access denied' });
  }
  
  // 2. Get video file info
  const videoFiles = await db
    .select()
    .from(videoFilesTable)
    .where(eq(videoFilesTable.movieId, id))
    .where(eq(videoFilesTable.status, 'ready'));
  
  if (!videoFiles.length) {
    return reply.code(404).send({ error: 'Video not found' });
  }
  
  // 3. Generate signed URLs
  const signedVideos = await Promise.all(
    videoFiles.map(async (file) => {
      const signedUrl = await generateSignedUrl(file, {
        expiresIn: 3600, // 1 hour
        userId: user.id,
      });
      
      return {
        quality: file.quality,
        format: file.format,
        url: signedUrl,
        duration: file.duration,
      };
    })
  );
  
  return {
    movieId: id,
    videos: signedVideos,
    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
  };
});
```

### Phase 4: Frontend Integration

**Update `VideoPlayer` component:**

```typescript
// app/[locale]/movies/[id]/watch/page.tsx
import { VideoPlayer } from '@/components/video-player';

export default async function WatchPage({ params }: { params: { id: string } }) {
  // Fetch signed video URL from API
  const response = await fetch(`${API_URL}/movies/${params.id}/video`, {
    headers: {
      'Authorization': `Bearer ${session.accessToken}`,
    },
  });
  
  const { videos, expiresAt } = await response.json();
  
  // Get HLS master playlist URL
  const hlsVideo = videos.find(v => v.format === 'hls');
  
  return (
    <div>
      <VideoPlayer
        src={hlsVideo.url}
        poster={movie.backdrop_path}
        title={movie.title}
      />
      <p className="text-sm text-gray-500">
        Video access expires at {new Date(expiresAt).toLocaleString()}
      </p>
    </div>
  );
}
```

### Phase 5: Admin Upload Interface

**Create video upload page:**

```typescript
// app/[locale]/admin/movies/[id]/upload-video/page.tsx
'use client';

export default function UploadVideoPage() {
  const handleUpload = async (file: File) => {
    // 1. Get upload URL from API
    const { uploadUrl, videoId } = await fetch('/api/videos/upload-url', {
      method: 'POST',
      body: JSON.stringify({ movieId, filename: file.name }),
    }).then(r => r.json());
    
    // 2. Upload directly to CDN (Cloudflare/Bunny)
    await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });
    
    // 3. Trigger transcoding (handled by CDN webhook)
    await fetch('/api/videos/process', {
      method: 'POST',
      body: JSON.stringify({ videoId }),
    });
  };
  
  return (
    <div>
      <h1>Upload Video</h1>
      <input type="file" accept="video/*" onChange={e => handleUpload(e.target.files[0])} />
    </div>
  );
}
```

---

## Security & Access Control

### Signed URLs

**Purpose:** Prevent unauthorized access and hotlinking

**Implementation depends on provider:**

#### Cloudflare Stream
```typescript
// Automatic with token parameter
const signedUrl = `${baseUrl}?token=${generateCloudflareToken(videoId, userId)}`;
```

#### Bunny CDN
```typescript
// Token authentication
const token = createHmac('sha256', apiKey)
  .update(`${videoPath}${expiresAt}`)
  .digest('base64url');

const signedUrl = `${baseUrl}?token=${token}&expires=${expiresAt}`;
```

#### AWS CloudFront
```typescript
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';

const signedUrl = getSignedUrl({
  url: videoUrl,
  keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID,
  privateKey: process.env.CLOUDFRONT_PRIVATE_KEY,
  dateLessThan: new Date(Date.now() + 3600 * 1000).toISOString(),
});
```

### Access Control Layers

1. **Authentication** - User must be logged in
2. **Authorization** - User has access to movie (subscription, purchase, etc.)
3. **Time-Limited URLs** - Signed URLs expire (1-4 hours typical)
4. **Rate Limiting** - Prevent abuse
5. **Geo-Restrictions** (optional) - Block certain countries
6. **Concurrent Stream Limits** (optional) - Prevent account sharing

### DRM (Optional - For Premium Content)

If you need strict content protection:

- **Widevine** (Chrome, Android)
- **FairPlay** (Safari, iOS)
- **PlayReady** (Edge, Xbox)

**Note:** DRM adds complexity and cost. Most streaming platforms don't use it for standard content.

---

## Cost Analysis

### Example: 100 Movies (~500GB total, 1000 hours watched/month)

| Provider | Storage | Delivery | Transcoding | Total/Month |
|----------|---------|----------|-------------|-------------|
| **Cloudflare Stream** | $45 | $83 | Included | **~$128** |
| **Bunny Stream** | $2.50 | $10-30 | Included | **~$32** |
| **AWS S3 + CloudFront** | $12 | $85 | $22 | **~$119** |
| **Local (Dev Only)** | Disk space | Bandwidth | Manual | **N/A** |

### Cost Optimization Tips

1. **Use lower bitrates** - Most users happy with 720p
2. **Adaptive streaming** - Only deliver quality user can handle
3. **Cache aggressively** - CDN caching reduces origin hits
4. **Lazy transcoding** - Only create quality variants on demand
5. **Regional storage** - Store videos in primary user regions

---

## Implementation Roadmap

### Immediate (Weeks 1-2)
- [x] Local HLS setup for development
- [ ] Design database schema for video files
- [ ] Choose CDN provider (recommend: Bunny Stream for cost)
- [ ] Create API endpoints for video URL generation

### Short-term (Weeks 3-4)
- [ ] Set up CDN account and test uploads
- [ ] Implement signed URL generation
- [ ] Create admin upload interface
- [ ] Migrate 1-2 test videos to CDN

### Medium-term (Weeks 5-8)
- [ ] Implement webhook handlers for transcoding status
- [ ] Add video processing queue
- [ ] Create batch upload tools
- [ ] Monitor costs and optimize

### Long-term (Months 3+)
- [ ] Analytics and playback tracking
- [ ] Advanced features (thumbnails, preview clips)
- [ ] Multi-region redundancy
- [ ] Performance optimization

---

## Development vs. Production URLs

### Database Schema for Environment Support

```typescript
// In types.ts
export interface VideoSource {
  id: string;
  quality: '1080p' | '720p' | '480p' | '360p' | 'original';
  format: 'hls' | 'mp4';
  
  // URL handling
  url?: string; // For development/local
  getUrl?: () => Promise<string>; // For production (generates signed URL)
  
  // Metadata
  size_bytes?: number;
  duration?: number; // seconds
  bitrate?: number; // kbps
}
```

### Environment-Aware URL Resolution

```typescript
// lib/video/url-resolver.ts
export async function getVideoUrl(movieId: string, quality: string): Promise<string> {
  if (process.env.NODE_ENV === 'development') {
    // Local development - direct file access
    return `/videos/hls/${movieId}/master.m3u8`;
  }
  
  // Production - fetch signed URL from API
  const response = await fetch(`/api/movies/${movieId}/video?quality=${quality}`);
  const { url } = await response.json();
  return url;
}
```

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Storage Usage**
   - Total GB stored
   - Cost per movie
   - Growth rate

2. **Bandwidth**
   - GB delivered per month
   - Peak concurrent streams
   - Geographic distribution

3. **Quality Metrics**
   - Average bitrate delivered
   - Quality switches per session
   - Buffering ratio

4. **User Behavior**
   - Watch completion rate
   - Average watch time
   - Popular content

5. **Costs**
   - Monthly CDN bill
   - Cost per hour watched
   - Cost per user

### Recommended Tools

- **Cloudflare/Bunny Analytics** - Built-in dashboards
- **Custom API tracking** - Log playback events to DB
- **Grafana** - Visualization (if self-hosted)

---

## Troubleshooting Guide

### Common Issues

**Problem:** Video won't play in production
- ✓ Check CORS headers on CDN
- ✓ Verify signed URL not expired
- ✓ Test URL directly in browser
- ✓ Check browser console for errors

**Problem:** High bandwidth costs
- ✓ Enable CDN caching
- ✓ Lower default quality
- ✓ Check for bot traffic
- ✓ Implement rate limiting

**Problem:** Slow transcoding
- ✓ Use CDN transcoding (not local)
- ✓ Queue uploads during off-peak
- ✓ Optimize source file size

---

## Next Steps

1. **Choose a CDN provider** (Bunny Stream recommended for cost)
2. **Implement database schema** for video files
3. **Create API layer** for signed URL generation
4. **Test with 1-2 videos** before full migration
5. **Monitor costs** closely in first month
6. **Iterate** based on real usage data

---

## Additional Resources

### Internal Documentation
- `docs/STATUS.md` - Project status and roadmap

### External Resources
- [Cloudflare Stream Docs](https://developers.cloudflare.com/stream/)
- [Bunny Stream Guide](https://docs.bunny.net/docs/stream)
- [HLS Specification](https://datatracker.ietf.org/doc/html/rfc8216)
- [AWS Media Services](https://aws.amazon.com/media-services/)
- [MinIO Documentation](https://min.io/docs/) - S3-compatible self-hosted storage

---

**Last Updated:** December 2025  
**Status:** Production (GCS + local dev)  
**Current Setup:** Google Cloud Storage for production, local files for development
