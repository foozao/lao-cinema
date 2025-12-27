// Lao Cinema API Server
// Built with Fastify + Drizzle ORM + PostgreSQL

import 'dotenv/config';
import { initSentry } from './lib/sentry.js';
import Fastify from 'fastify';
import cors from '@fastify/cors';
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

// Initialize Sentry error monitoring (must be before Fastify setup)
initSentry();

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Register CORS
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
});

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
