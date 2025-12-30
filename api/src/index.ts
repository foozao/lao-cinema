// Lao Cinema API Server
// Built with Fastify + Drizzle ORM + PostgreSQL

import 'dotenv/config';
import { initSentry } from './lib/sentry.js';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { csrfProtection } from './lib/csrf-protection.js';
import movieRoutes from './routes/movies.js';
import peopleRoutes from './routes/people.js';
import personImageRoutes from './routes/person-images.js';
import homepageRoutes from './routes/homepage.js';
import authRoutes from './routes/auth.js';
import rentalRoutes from './routes/rentals.js';
import watchProgressRoutes from './routes/watch-progress.js';
import userDataRoutes from './routes/user-data.js';
import trailersRoutes from './routes/trailers.js';
import { productionCompaniesRoutes } from './routes/production-companies.js';
import { uploadRoutes } from './routes/upload.js';
import auditLogRoutes from './routes/audit-logs.js';
import notificationRoutes from './routes/notifications.js';
import videoTokenRoutes from './routes/video-tokens.js';
import shortPackRoutes from './routes/short-packs.js';
import watchlistRoutes from './routes/watchlist.js';
import genreRoutes from './routes/genres.js';
import testErrorRoutes from './routes/test-error.js';
import awardsRoutes from './routes/awards.js';
import movieSubtitleRoutes from './routes/movie-subtitles.js';
import subtitlesRoutes from './routes/subtitles.js';
import anonymousIdRoutes from './routes/anonymous-id.js';

// Initialize Sentry error monitoring (must be before Fastify setup)
initSentry();

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Register security headers
const isProduction = process.env.NODE_ENV === 'production';

await fastify.register(helmet, {
  // HSTS - only enable in production to allow localhost development
  hsts: isProduction ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  } : false,
  
  // Content Security Policy - strict policy for JSON API
  contentSecurityPolicy: {
    directives: {
      // Default: block everything unless explicitly allowed
      defaultSrc: ["'none'"],
      
      // API may need to connect to itself or external services
      connectSrc: ["'self'"],
      
      // No scripts, styles, images, fonts, etc. (JSON API only)
      scriptSrc: ["'none'"],
      styleSrc: ["'none'"],
      imgSrc: ["'none'"],
      fontSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
      
      // Prevent API from being embedded in frames
      frameAncestors: ["'none'"],
      
      // Form actions not applicable (API doesn't serve forms)
      formAction: ["'none'"],
      
      // Base URI - only allow same origin
      baseUri: ["'self'"],
      
      // Upgrade insecure requests in production
      ...(isProduction ? { upgradeInsecureRequests: [] } : {}),
    },
  },
  
  // Other security headers (enabled in all environments)
  xFrameOptions: { action: 'deny' },
  xContentTypeOptions: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
});

// Register CORS
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
});

// Register CSRF protection (after CORS, before routes)
fastify.addHook('preHandler', csrfProtection);

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Block all crawlers
fastify.get('/robots.txt', async (request, reply) => {
  reply.type('text/plain');
  return 'User-agent: *\nDisallow: /';
});

// Register routes
await fastify.register(anonymousIdRoutes, { prefix: '/api' });
await fastify.register(authRoutes, { prefix: '/api' });
await fastify.register(userDataRoutes, { prefix: '/api' });
await fastify.register(rentalRoutes, { prefix: '/api' });
await fastify.register(watchProgressRoutes, { prefix: '/api' });
await fastify.register(movieRoutes, { prefix: '/api' });
await fastify.register(peopleRoutes, { prefix: '/api' });
await fastify.register(personImageRoutes, { prefix: '/api' });
await fastify.register(homepageRoutes, { prefix: '/api' });
await fastify.register(trailersRoutes, { prefix: '/api' });
await fastify.register(productionCompaniesRoutes, { prefix: '/api' });
await fastify.register(uploadRoutes, { prefix: '/api' });
await fastify.register(auditLogRoutes, { prefix: '/api' });
await fastify.register(notificationRoutes, { prefix: '/api' });
await fastify.register(videoTokenRoutes, { prefix: '/api' });
await fastify.register(shortPackRoutes, { prefix: '/api' });
await fastify.register(watchlistRoutes, { prefix: '/api' });
await fastify.register(genreRoutes, { prefix: '/api' });
await fastify.register(testErrorRoutes, { prefix: '/api' });
await fastify.register(awardsRoutes, { prefix: '/api' });
await fastify.register(movieSubtitleRoutes);
await fastify.register(subtitlesRoutes, { prefix: '/api' });

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001');
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    
    console.log(`🚀 Lao Cinema API running on http://${host}:${port}`);
    console.log(`📊 Health check: http://${host}:${port}/health`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
