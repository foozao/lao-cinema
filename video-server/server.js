const fastify = require('fastify')({ logger: true });
const path = require('path');
const crypto = require('crypto');

// Configuration
const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || '0.0.0.0';
const VIDEOS_PATH = process.env.VIDEOS_PATH || path.join(__dirname, 'videos');
const PUBLIC_PATH = process.env.PUBLIC_PATH || path.join(__dirname, 'public');
const API_URL = process.env.API_URL || 'http://localhost:3001';
const CORS_ORIGINS = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];
const TOKEN_SECRET = process.env.VIDEO_TOKEN_SECRET || 'dev-secret-change-in-production';

// Session duration for video access
const SESSION_DURATION_MS = 20 * 60 * 1000; // 20 minutes

// Generate a signed session cookie for video access
function generateSessionCookie(movieDir) {
  const exp = Date.now() + SESSION_DURATION_MS;
  const data = JSON.stringify({ movieDir, exp });
  const hmac = crypto.createHmac('sha256', TOKEN_SECRET);
  hmac.update(data);
  const signature = hmac.digest('base64url');
  return `${Buffer.from(data).toString('base64url')}.${signature}`;
}

// Verify a session cookie
function verifySessionCookie(cookie, expectedMovieDir) {
  try {
    const parts = cookie.split('.');
    if (parts.length !== 2) return false;
    
    const [encodedData, signature] = parts;
    const data = Buffer.from(encodedData, 'base64url').toString('utf-8');
    
    // Verify signature
    const hmac = crypto.createHmac('sha256', TOKEN_SECRET);
    hmac.update(data);
    const expectedSig = hmac.digest('base64url');
    if (signature !== expectedSig) return false;
    
    // Parse and validate
    const { movieDir, exp } = JSON.parse(data);
    if (exp < Date.now()) return false;
    if (movieDir !== expectedMovieDir) return false;
    
    return true;
  } catch {
    return false;
  }
}

// Parse cookies from header
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name && rest.length) {
      cookies[name] = rest.join('=');
    }
  });
  return cookies;
}

// Token validation via API (single source of truth)
async function verifyVideoToken(token) {
  const response = await fetch(`${API_URL}/api/video-tokens/validate?token=${encodeURIComponent(token)}`);
  const result = await response.json();
  
  if (!result.valid) {
    throw new Error(result.error || 'Invalid token');
  }
  
  return result;
}

// Register CORS - allow requests from web app with credentials (cookies)
fastify.register(require('@fastify/cors'), {
  origin: CORS_ORIGINS,
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Range', 'Authorization'],
  exposedHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges', 'Set-Cookie'],
  credentials: true,
});

// Token validation hook for video files
fastify.addHook('onRequest', async (request, reply) => {
  // Only validate token for video file requests
  if (!request.url.startsWith('/videos/')) {
    return;
  }

  // Skip validation for health check and root
  if (request.url === '/videos/' || request.url === '/health' || request.url === '/') {
    return;
  }

  try {
    const url = new URL(request.url, `http://${request.hostname}`);
    const token = url.searchParams.get('token');
    const requestedPath = url.pathname.replace('/videos/', '');
    
    // Extract movie directory from requested path (e.g., "hls/chanthaly" from "hls/chanthaly/stream_0/seg.ts")
    const pathParts = requestedPath.split('/');
    const movieDir = pathParts.slice(0, 2).join('/'); // "hls/chanthaly"
    const cookieName = `video_session_${movieDir.replace(/\//g, '_')}`;

    if (token) {
      // Verify token via API and create session cookie
      const payload = await verifyVideoToken(token);
      const tokenDir = payload.videoPath.replace(/\/[^/]+$/, ''); // Remove filename
      
      // Validate path matches token
      if (!requestedPath.startsWith(tokenDir + '/') && requestedPath !== payload.videoPath) {
        return reply.status(403).type('application/problem+json').send({
          type: 'about:blank',
          title: 'Forbidden',
          status: 403,
          detail: 'Token does not grant access to this video',
          code: 'INVALID_PATH',
        });
      }

      // Generate and set session cookie for subsequent segment requests
      const sessionCookie = generateSessionCookie(movieDir);
      reply.header('Set-Cookie', `${cookieName}=${sessionCookie}; Path=/videos/${movieDir}; HttpOnly; SameSite=None; Secure=false; Max-Age=${SESSION_DURATION_MS / 1000}`);
      
      request.videoToken = payload;
    } else {
      // No token - check for valid session cookie (for HLS segments)
      const cookies = parseCookies(request.headers.cookie);
      const sessionCookie = cookies[cookieName];
      
      if (!sessionCookie || !verifySessionCookie(sessionCookie, movieDir)) {
        return reply.status(401).type('application/problem+json').send({
          type: 'about:blank',
          title: 'Unauthorized',
          status: 401,
          detail: 'Missing video access token',
          code: 'TOKEN_REQUIRED',
        });
      }
      
      // Valid session cookie, allow access
      request.videoSession = { movieDir };
    }
  } catch (error) {
    return reply.status(401).type('application/problem+json').send({
      type: 'about:blank',
      title: 'Unauthorized',
      status: 401,
      detail: error.message || 'Invalid video token',
      code: 'INVALID_TOKEN',
    });
  }
});

// Serve static video files
fastify.register(require('@fastify/static'), {
  root: VIDEOS_PATH,
  prefix: '/videos/',
  decorateReply: false,
  // Set proper headers for HLS streaming
  setHeaders: (res, filepath) => {
    // Cache control - shorter for signed URLs
    res.setHeader('Cache-Control', 'private, max-age=3600');
    
    // Set correct content types for HLS
    if (filepath.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    } else if (filepath.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
    }
  },
});

// Serve static files from public directory (logos, posters, backdrops)
fastify.register(require('@fastify/static'), {
  root: path.join(PUBLIC_PATH, 'logos'),
  prefix: '/logos/',
  decorateReply: false,
});

fastify.register(require('@fastify/static'), {
  root: path.join(PUBLIC_PATH, 'posters'),
  prefix: '/posters/',
  decorateReply: false,
});

fastify.register(require('@fastify/static'), {
  root: path.join(PUBLIC_PATH, 'backdrops'),
  prefix: '/backdrops/',
  decorateReply: false,
});

fastify.register(require('@fastify/static'), {
  root: path.join(PUBLIC_PATH, 'profiles'),
  prefix: '/profiles/',
  decorateReply: false,
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
