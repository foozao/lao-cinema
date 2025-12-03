# Video Server

Local development server that mimics a CDN/cloud storage for video delivery.

## Purpose

In production, videos are served from Google Cloud Storage (or another CDN). This server replicates that behavior locally, so your development environment mirrors production:

```
Production:
  Web App (Cloud Run) → API (Cloud Run) → GCS URLs → Browser plays from GCS

Development:
  Web App (localhost:3000) → API (localhost:3001) → Video Server URLs → Browser plays from localhost:3002
```

## Quick Start

```bash
# Install dependencies
cd video-server
npm install

# Start server
npm run dev
```

Server runs on **http://localhost:3002**

## Architecture

```
localhost:3000  →  Next.js Web App
localhost:3001  →  Fastify API
localhost:3002  →  Video Server (this)
                   └── Serves files from ../web/public/videos/
```

## How It Works

1. Videos are stored in `web/public/videos/hls/`
2. This server serves them at `http://localhost:3002/videos/hls/`
3. API returns URLs pointing to this server
4. Browser loads videos cross-origin (just like production)

## Configuration

The API needs to know where videos are served from:

**api/.env:**
```bash
VIDEO_BASE_URL=http://localhost:3002/videos/hls
```

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | List available videos |
| `GET /health` | Health check |
| `GET /videos/hls/{movie}/master.m3u8` | HLS video stream |

## Example

```bash
# List videos
curl http://localhost:3002/

# Access video
curl http://localhost:3002/videos/hls/last-dance/master.m3u8
```

## Features

- ✅ CORS enabled (allows requests from localhost:3000)
- ✅ Proper Content-Type headers for HLS
- ✅ Range request support (seeking)
- ✅ Cache headers (mimics CDN caching)
- ✅ Minimal footprint

## Why Not Use Next.js Public Folder?

You *can* serve videos from `web/public/` directly, but:

1. **Same origin** - Doesn't test CORS
2. **Not realistic** - Production uses external URLs
3. **Mixes concerns** - Web app shouldn't serve large video files

This server provides a more production-like experience.
