// Build Fastify app for testing
import 'dotenv/config';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import movieRoutes from '../routes/movies.js';
import authRoutes from '../routes/auth.js';
import userDataRoutes from '../routes/user-data.js';

/**
 * Build a Fastify app instance for testing
 * This creates a fresh app for each test to ensure isolation
 */
export async function build(options: { includeAuth?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false, // Disable logging in tests
  });

  // Register CORS
  await app.register(cors, {
    origin: '*', // Allow all origins in tests
  });

  // Register routes
  await app.register(movieRoutes, { prefix: '/api' });
  
  if (options.includeAuth) {
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(userDataRoutes, { prefix: '/api' });
  }

  return app;
}
