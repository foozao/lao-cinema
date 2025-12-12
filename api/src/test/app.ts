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
import { productionCompaniesRoutes } from '../routes/production-companies.js';
import movieProductionCompaniesRoutes from '../routes/movie-production-companies.js';
import { db, schema } from '../db/index.js';
import { hashPassword, generateSessionToken } from '../lib/auth-utils.js';

interface BuildOptions {
  includeAuth?: boolean;
  includeRentals?: boolean;
  includeWatchProgress?: boolean;
  includePeople?: boolean;
  includeHomepage?: boolean;
  includeProductionCompanies?: boolean;
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
  
  if (options.includeProductionCompanies) {
    await app.register(productionCompaniesRoutes, { prefix: '/api' });
    await app.register(movieProductionCompaniesRoutes, { prefix: '/api' });
  }

  return app;
}

/**
 * Create an editor user and return auth headers for testing protected routes
 */
export async function createTestEditor(): Promise<{ headers: { authorization: string }, userId: string }> {
  const email = `editor-${Date.now()}@test.com`;
  const passwordHash = await hashPassword('testpassword123');
  
  const [user] = await db.insert(schema.users).values({
    email,
    passwordHash,
    displayName: 'Test Editor',
    role: 'editor',
  }).returning();
  
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  await db.insert(schema.userSessions).values({
    userId: user.id,
    token,
    expiresAt,
  });
  
  return {
    headers: { authorization: `Bearer ${token}` },
    userId: user.id,
  };
}

/**
 * Create an admin user and return auth headers for testing admin-only routes
 */
export async function createTestAdmin(): Promise<{ headers: { authorization: string }, userId: string }> {
  const email = `admin-${Date.now()}@test.com`;
  const passwordHash = await hashPassword('testpassword123');
  
  const [user] = await db.insert(schema.users).values({
    email,
    passwordHash,
    displayName: 'Test Admin',
    role: 'admin',
  }).returning();
  
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  await db.insert(schema.userSessions).values({
    userId: user.id,
    token,
    expiresAt,
  });
  
  return {
    headers: { authorization: `Bearer ${token}` },
    userId: user.id,
  };
}
