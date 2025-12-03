const fastify = require('fastify')({ logger: true });
const path = require('path');

// Configuration
const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || '0.0.0.0';
const VIDEOS_PATH = path.join(__dirname, 'videos');

// Register CORS - allow requests from web app
fastify.register(require('@fastify/cors'), {
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Range'],
  exposedHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges'],
});

// Serve static video files
fastify.register(require('@fastify/static'), {
  root: VIDEOS_PATH,
  prefix: '/videos/',
  // Set proper headers for HLS streaming
  setHeaders: (res, filepath) => {
    // Cache control
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    // Set correct content types for HLS
    if (filepath.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    } else if (filepath.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
    }
  },
});

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', service: 'video-server' };
});

// Root route - list available videos
fastify.get('/', async () => {
  const fs = require('fs');
  const hlsPath = path.join(VIDEOS_PATH, 'hls');
  
  let videos = [];
  if (fs.existsSync(hlsPath)) {
    videos = fs.readdirSync(hlsPath)
      .filter(name => !name.startsWith('.') && !name.endsWith('.old'))
      .map(name => ({
        name,
        url: `http://localhost:${PORT}/videos/hls/${name}/master.m3u8`,
      }));
  }
  
  return {
    service: 'Lao Cinema Video Server',
    description: 'Local development server mimicking GCS/CDN',
    port: PORT,
    videosPath: VIDEOS_PATH,
    availableVideos: videos,
  };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log('');
    console.log('🎬 Lao Cinema Video Server');
    console.log('==========================');
    console.log(`Serving videos from: ${VIDEOS_PATH}`);
    console.log(`Server running at: http://localhost:${PORT}`);
    console.log('');
    console.log('Example video URL:');
    console.log(`  http://localhost:${PORT}/videos/hls/last-dance/master.m3u8`);
    console.log('');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
