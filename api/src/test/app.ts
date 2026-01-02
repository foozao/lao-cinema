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
import auditLogRoutes from '../routes/audit-logs.js';
import notificationRoutes from '../routes/notifications.js';
import shortPackRoutes from '../routes/short-packs.js';
import trailersRoutes from '../routes/trailers.js';
import trailerTokenRoutes from '../routes/trailer-tokens.js';
import videoTokenRoutes from '../routes/video-tokens.js';
import genreRoutes from '../routes/genres.js';
import movieGenresRoutes from '../routes/movie-genres.js';
import accoladesRoutes from '../routes/accolades.js';
import personAccoladesRoutes from '../routes/person-accolades.js';
import movieSubtitleRoutes from '../routes/movie-subtitles.js';
import anonymousIdRoutes from '../routes/anonymous-id.js';
import pricingRoutes from '../routes/pricing.js';
import { db, schema } from '../db/index.js';
import { hashPassword, generateSessionToken } from '../lib/auth-utils.js';

interface BuildOptions {
  includeAuth?: boolean;
  includeRentals?: boolean;
  includeWatchProgress?: boolean;
  includePeople?: boolean;
  includeHomepage?: boolean;
  includeProductionCompanies?: boolean;
  includeAuditLogs?: boolean;
  includeNotifications?: boolean;
  includeShortPacks?: boolean;
  includeTrailers?: boolean;
  includeTrailerTokens?: boolean;
  includeVideoTokens?: boolean;
  includeUserData?: boolean;
  includeGenres?: boolean;
  includeMovieGenres?: boolean;
  includeAccolades?: boolean;
  includeSubtitles?: boolean;
  includePricing?: boolean;
}

/**
 * Build a Fastify app instance for testing
 * This creates a fresh app for each test to ensure isolation
 */
export async function build(options: BuildOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env.TEST_LOGGING === 'true', // Enable with TEST_LOGGING=true
  });

  // Register CORS
  await app.register(cors, {
    origin: '*', // Allow all origins in tests
  });

  // Register routes
  await app.register(anonymousIdRoutes, { prefix: '/api' });
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
  
  if (options.includeAuditLogs) {
    // Audit logs require auth middleware, so also register auth routes
    if (!options.includeAuth) {
      await app.register(authRoutes, { prefix: '/api' });
    }
    await app.register(auditLogRoutes, { prefix: '/api' });
  }
  
  if (options.includeNotifications) {
    // Notifications require auth middleware
    if (!options.includeAuth) {
      await app.register(authRoutes, { prefix: '/api' });
    }
    await app.register(notificationRoutes, { prefix: '/api' });
  }
  
  if (options.includeShortPacks) {
    // Short packs require auth middleware for CUD operations
    if (!options.includeAuth) {
      await app.register(authRoutes, { prefix: '/api' });
    }
    await app.register(shortPackRoutes, { prefix: '/api' });
  }
  
  if (options.includeTrailers) {
    // Trailers require auth middleware for CUD operations
    if (!options.includeAuth) {
      await app.register(authRoutes, { prefix: '/api' });
    }
    await app.register(trailersRoutes, { prefix: '/api' });
  }
  
  if (options.includeTrailerTokens) {
    // Trailer tokens require auth/anonymous middleware (no rentals needed)
    if (!options.includeAuth) {
      await app.register(authRoutes, { prefix: '/api' });
    }
    if (!options.includeTrailers) {
      await app.register(trailersRoutes, { prefix: '/api' });
    }
    await app.register(trailerTokenRoutes, { prefix: '/api' });
  }
  
  if (options.includeVideoTokens) {
    // Video tokens require auth/anonymous middleware and rentals
    if (!options.includeAuth) {
      await app.register(authRoutes, { prefix: '/api' });
    }
    if (!options.includeRentals) {
      await app.register(rentalRoutes, { prefix: '/api' });
    }
    await app.register(videoTokenRoutes, { prefix: '/api' });
  }
  
  if (options.includeUserData) {
    // User data routes require auth
    if (!options.includeAuth) {
      await app.register(authRoutes, { prefix: '/api' });
    }
    await app.register(userDataRoutes, { prefix: '/api' });
  }
  
  if (options.includeGenres) {
    // Genres routes require admin auth
    if (!options.includeAuth) {
      await app.register(authRoutes, { prefix: '/api' });
    }
    await app.register(genreRoutes, { prefix: '/api' });
  }
  
  if (options.includeMovieGenres) {
    // Movie genres routes require editor/admin auth
    if (!options.includeAuth) {
      await app.register(authRoutes, { prefix: '/api' });
    }
    await app.register(movieGenresRoutes, { prefix: '/api' });
  }
  
  if (options.includeAccolades) {
    // Accolades routes require editor/admin auth
    if (!options.includeAuth) {
      await app.register(authRoutes, { prefix: '/api' });
    }
    await app.register(accoladesRoutes, { prefix: '/api' });
  }
  
  if (options.includePeople) {
    // Person accolades route is public (read-only)
    await app.register(personAccoladesRoutes, { prefix: '/api' });
  }
  
  if (options.includeSubtitles) {
    // Subtitle routes require editor/admin auth
    if (!options.includeAuth) {
      await app.register(authRoutes, { prefix: '/api' });
    }
    await app.register(movieSubtitleRoutes);
  }
  
  if (options.includePricing) {
    // Pricing routes require admin auth
    if (!options.includeAuth) {
      await app.register(authRoutes, { prefix: '/api' });
    }
    await app.register(pricingRoutes, { prefix: '/api' });
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
