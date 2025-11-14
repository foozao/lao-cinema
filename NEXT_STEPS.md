# Next Steps for Lao Cinema

## Current Status ✅

The web application foundation is complete with:
- Next.js 16 app with TypeScript and Tailwind CSS
- Movie catalog homepage with grid display
- Movie detail page with HLS video player
- TMDB-compatible data structure with Lao language fields
- Responsive design with modern UI

## Immediate Requirements

### 1. Node.js Version Update
**Issue**: Next.js 16 requires Node.js 20.9.0 or higher (currently using 18.20.8)

**Solution**:
```bash
# Install Node 20+ using nvm (recommended)
nvm install 20
nvm use 20

# Or download from nodejs.org
```

After updating Node:
```bash
cd web
npm install
npm run dev
```

### 2. Add Your Movie Video

Replace the placeholder video URL in `/web/lib/data/movies.ts`:

```typescript
video_sources: [
  {
    id: 'vs1',
    quality: 'original',
    format: 'mp4',
    url: '/videos/your-movie.mp4', // Put your MP4 in public/videos/
    size_bytes: 1024 * 1024 * 500,
  },
],
```

**Steps**:
1. Create `/web/public/videos/` directory
2. Copy your MP4 file there
3. Update the URL in the sample movie data
4. Update movie title, description, and other metadata

### 3. Add Movie Poster/Backdrop Images

Add images to `/web/public/` and update paths in movie data:

```typescript
poster_path: '/posters/your-movie-poster.jpg',
backdrop_path: '/backdrops/your-movie-backdrop.jpg',
```

## Phase 2: Video Transcoding

Convert your MP4 to HLS format for adaptive streaming.

### Option A: FFmpeg (Local)

```bash
# Install FFmpeg
brew install ffmpeg  # macOS
# or apt-get install ffmpeg  # Linux

# Create HLS playlist with multiple qualities
ffmpeg -i input.mp4 \
  -vf scale=w=1920:h=1080 -c:v libx264 -b:v 5000k -c:a aac -b:a 192k -f hls -hls_time 10 -hls_playlist_type vod output_1080p.m3u8 \
  -vf scale=w=1280:h=720 -c:v libx264 -b:v 2800k -c:a aac -b:a 128k -f hls -hls_time 10 -hls_playlist_type vod output_720p.m3u8 \
  -vf scale=w=854:h=480 -c:v libx264 -b:v 1400k -c:a aac -b:a 128k -f hls -hls_time 10 -hls_playlist_type vod output_480p.m3u8
```

### Option B: Cloudflare Stream (Recommended)

1. Sign up for Cloudflare Stream
2. Upload your video via API or dashboard
3. Get the HLS manifest URL
4. Update video source in movie data

### Option C: Bunny Stream

Similar to Cloudflare but cheaper for high volume.

## Phase 3: TMDB Integration

Create an API route to fetch movie metadata from TMDB:

```typescript
// /web/app/api/tmdb/[id]/route.ts
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const response = await fetch(
    `https://api.themoviedb.org/3/movie/${params.id}?api_key=${process.env.TMDB_API_KEY}`
  );
  const data = await response.json();
  return Response.json(data);
}
```

**Required**:
- Get TMDB API key from https://www.themoviedb.org/settings/api
- Add to `.env.local`: `TMDB_API_KEY=your_key_here`

## Phase 4: Backend API

Set up Fastify backend with PostgreSQL:

1. Create `/backend` directory
2. Initialize Fastify project
3. Set up Drizzle ORM with PostgreSQL
4. Implement REST API endpoints
5. Add JWT authentication

See `STACK.md` for full backend architecture.

## Phase 5: Deployment

### Web App
- Deploy to Vercel (easiest) or GCP Cloud Run
- Set environment variables
- Configure custom domain

### Backend
- Containerize with Docker
- Deploy to GCP VM or Cloud Run
- Set up PostgreSQL database
- Configure CORS and security

## Testing Checklist

- [ ] Homepage loads and displays movie card
- [ ] Click movie card navigates to detail page
- [ ] Video player loads and plays video
- [ ] Video controls work (play/pause, seek, volume, fullscreen)
- [ ] Responsive design works on mobile
- [ ] Lao text displays correctly
- [ ] Images load properly

## Development Commands

```bash
# Start dev server
cd web
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Lint code
npm run lint
```

## Questions?

Refer to:
- `STACK.md` - Full technology stack and architecture
- `/web/README.md` - Web app documentation
- Next.js docs: https://nextjs.org/docs
- HLS.js docs: https://github.com/video-dev/hls.js
