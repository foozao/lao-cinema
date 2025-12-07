// Build Fastify app for testing
import 'dotenv/config';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import movieRoutes from '../routes/movies.js';
import authRoutes from '../routes/auth.js';
import userDataRoutes from '../routes/user-data.js';
import rentalRoutes from '../routes/rentals.js';
import watchProgressRoutes from '../routes/watch-progress.js';
import peopleRoutes from '../routes/people.js';
import homepageRoutes from '../routes/homepage.js';

interface BuildOptions {
  includeAuth?: boolean;
  includeRentals?: boolean;
  includeWatchProgress?: boolean;
  includePeople?: boolean;
  includeHomepage?: boolean;
}

/**
 * Build a Fastify app instance for testing
 * This creates a fresh app for each test to ensure isolation
 */
export async function build(options: BuildOptions = {}): Promise<FastifyInstance> {
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
  
  if (options.includeRentals) {
    await app.register(rentalRoutes, { prefix: '/api' });
  }
  
  if (options.includeWatchProgress) {
    await app.register(watchProgressRoutes, { prefix: '/api' });
  }
  
  if (options.includePeople) {
    await app.register(peopleRoutes, { prefix: '/api' });
  }
  
  if (options.includeHomepage) {
    await app.register(homepageRoutes, { prefix: '/api' });
  }

  return app;
}
