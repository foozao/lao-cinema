// Lao Cinema API Server
// Built with Fastify + Drizzle ORM + PostgreSQL

import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import movieRoutes from './routes/movies.js';
import peopleRoutes from './routes/people.js';

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

// Register routes
await fastify.register(movieRoutes, { prefix: '/api' });
await fastify.register(peopleRoutes, { prefix: '/api' });

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
