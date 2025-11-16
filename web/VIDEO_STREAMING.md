# Local HLS Video Streaming Setup

This guide explains how to set up local HLS (HTTP Live Streaming) video playback for development and testing.

## Overview

The video player (`/components/video-player.tsx`) supports:
- **HLS streaming** with adaptive bitrate (`.m3u8` playlists)
- **MP4 fallback** for direct playback
- **Cross-browser compatibility** using HLS.js
- **Native HLS support** in Safari

## Quick Start

### 1. Prerequisites

Install FFmpeg (required for video conversion):

```bash
brew install ffmpeg
```

### 2. Convert MP4 to HLS

Use the provided script to convert your MP4 file to HLS format with multiple bitrates:

```bash
./scripts/convert-to-hls.sh /path/to/your/video.mp4 output-name
```

**Example:**
```bash
./scripts/convert-to-hls.sh ~/Downloads/sample-movie.mp4 sample-movie
```

This will create:
```
public/videos/hls/sample-movie/
├── master.m3u8           # Master playlist (use this URL)
├── stream_0.m3u8         # 1080p variant
├── stream_1.m3u8         # 720p variant
├── stream_2.m3u8         # 480p variant
├── stream_3.m3u8         # 360p variant
├── stream_0/             # 1080p segments
├── stream_1/             # 720p segments
├── stream_2/             # 480p segments
└── stream_3/             # 360p segments
```

### 3. Test the Video

Visit the test page:
```
http://localhost:3000/en/test-video
```

Or use the VideoPlayer component directly:

```tsx
import { VideoPlayer } from '@/components/video-player';

<VideoPlayer
  src="/videos/hls/sample-movie/master.m3u8"
  poster="/path/to/poster.jpg"
  title="My Movie"
/>
```

## Conversion Details

The script creates 4 quality variants for adaptive streaming:

| Quality | Resolution | Video Bitrate | Audio Bitrate |
|---------|-----------|---------------|---------------|
| 1080p   | 1920x1080 | 5000k         | 128k          |
| 720p    | 1280x720  | 2800k         | 128k          |
| 480p    | 854x480   | 1400k         | 96k           |
| 360p    | 640x360   | 800k          | 64k           |

### FFmpeg Settings

- **Preset:** `medium` (good balance between speed and quality)
- **GOP Size:** 48 frames (~2 seconds at 24fps)
- **Segment Length:** 6 seconds
- **Video Codec:** H.264 (libx264)
- **Audio Codec:** AAC
- **Format:** MPEG-TS segments with HLS playlists

## Directory Structure

```
web/
├── public/
│   └── videos/
│       ├── hls/              # HLS streams (gitignored)
│       │   ├── movie-1/
│       │   │   └── master.m3u8
│       │   └── movie-2/
│       │       └── master.m3u8
│       └── .gitignore
├── scripts/
│   └── convert-to-hls.sh    # Conversion script
└── components/
    └── video-player.tsx      # HLS-capable player
```

## Usage in Components

### Basic Usage

```tsx
import { VideoPlayer } from '@/components/video-player';

export default function MoviePage() {
  return (
    <VideoPlayer
      src="/videos/hls/sample-movie/master.m3u8"
      poster="/images/poster.jpg"
      title="Sample Movie"
    />
  );
}
```

### With Movie Data

```tsx
import { VideoPlayer } from '@/components/video-player';
import type { Movie } from '@/lib/types';

export default function MoviePage({ movie }: { movie: Movie }) {
  // Get HLS source (highest priority)
  const hlsSource = movie.video_sources.find(s => s.format === 'hls');
  
  return (
    <VideoPlayer
      src={hlsSource?.url || ''}
      poster={movie.poster_path}
      title={movie.title.en}
    />
  );
}
```

## Video Player Features

- ✅ **Adaptive Bitrate:** Automatically switches quality based on bandwidth
- ✅ **Custom Controls:** Play/pause, seek, volume, fullscreen
- ✅ **Loading States:** Shows spinner during buffering
- ✅ **Responsive Design:** Works on mobile, tablet, desktop
- ✅ **Keyboard Controls:** Space to play/pause, arrow keys to seek
- ✅ **Error Handling:** Graceful fallback on errors

## Production Considerations

For production, you should:

1. **Use a CDN or Cloud Storage:**
   - Cloudflare Stream
   - Bunny Stream
   - AWS S3 + CloudFront
   - Google Cloud Storage

2. **Generate Signed URLs:**
   - Prevent hotlinking
   - Implement access control
   - Track usage

3. **Add DRM (optional):**
   - Widevine
   - FairPlay
   - PlayReady

4. **Optimize Encoding:**
   - Use GPU-accelerated encoding
   - Implement batch processing
   - Store multiple renditions

## Troubleshooting

### Video doesn't play

1. Check browser console for errors
2. Verify the `.m3u8` file exists: `ls public/videos/hls/*/master.m3u8`
3. Ensure dev server is running: `npm run dev`
4. Check FFmpeg conversion logs for errors

### Playback is choppy

1. Lower the bitrate in `convert-to-hls.sh`
2. Reduce segment length (try `-hls_time 4`)
3. Use a faster preset: `-preset faster`

### CORS errors

If serving from a different domain:
```ts
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/videos/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
};
```

## File Size Estimates

Approximate output sizes for a 90-minute movie:

| Quality | Bitrate | Size      |
|---------|---------|-----------|
| 1080p   | 5000k   | ~3.3 GB   |
| 720p    | 2800k   | ~1.8 GB   |
| 480p    | 1400k   | ~900 MB   |
| 360p    | 800k    | ~500 MB   |
| **Total** |       | **~6.5 GB** |

## Advanced Customization

### Modify Bitrates

Edit `scripts/convert-to-hls.sh` and adjust the `-b:v:*` values:

```bash
# Lower bitrates for smaller files
-b:v:0 3000k  # 1080p (was 5000k)
-b:v:1 1800k  # 720p (was 2800k)
-b:v:2 1000k  # 480p (was 1400k)
-b:v:3 600k   # 360p (was 800k)
```

### Add More Variants

Add 4K or remove low qualities by modifying the FFmpeg filter chain.

### Change Segment Length

Shorter segments = faster quality switching, but more files:

```bash
-hls_time 4  # 4-second segments (default: 6)
```

## Resources

- [HLS.js Documentation](https://github.com/video-dev/hls.js/)
- [FFmpeg HLS Guide](https://trac.ffmpeg.org/wiki/EncodingForStreamingSites)
- [Apple HLS Specification](https://developer.apple.com/streaming/)

---

**Next Steps:**
- Integrate with backend API for video management
- Implement video upload and automatic transcoding
- Add video analytics and playback tracking
- Set up production CDN delivery
