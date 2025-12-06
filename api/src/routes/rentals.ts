/**
 * Rentals Routes
 * 
 * Handles movie rental management for both authenticated and anonymous users.
 * Supports dual-mode: users can rent movies without an account.
 */

import { FastifyInstance } from 'fastify';
import { eq, and, or, gt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { rentals, movies } from '../../../db/src/schema.js';
import { requireAuthOrAnonymous, getUserContext } from '../lib/auth-middleware.js';

// Rental duration: 24 hours
const RENTAL_DURATION_MS = 24 * 60 * 60 * 1000;

export default async function rentalRoutes(fastify: FastifyInstance) {
  
  // =============================================================================
  // GET ALL RENTALS
  // =============================================================================
  
  /**
   * GET /api/rentals
   * Get all active rentals for current user/anonymous
   */
  fastify.get('/rentals', { preHandler: requireAuthOrAnonymous }, async (request, reply) => {
    const { userId, anonymousId } = getUserContext(request);
    
    try {
      // Build where clause for dual-mode
      const whereClause = userId 
        ? eq(rentals.userId, userId)
        : eq(rentals.anonymousId, anonymousId!);
      
      const userRentals = await db.select({
        id: rentals.id,
        movieId: rentals.movieId,
        purchasedAt: rentals.purchasedAt,
        expiresAt: rentals.expiresAt,
        transactionId: rentals.transactionId,
        amount: rentals.amount,
        currency: rentals.currency,
        paymentMethod: rentals.paymentMethod,
        // Include movie info
        movieTitle: movies.originalTitle,
        moviePosterPath: movies.posterPath,
      })
      .from(rentals)
      .leftJoin(movies, eq(rentals.movieId, movies.id))
      .where(whereClause)
      .orderBy(rentals.purchasedAt);
      
      // Filter active rentals (not expired)
      const now = new Date();
      const activeRentals = userRentals.filter(rental => 
        new Date(rental.expiresAt) > now
      );
      
      return reply.send({
        rentals: activeRentals,
        total: activeRentals.length,
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch rentals');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch rentals',
      });
    }
  });
  
  // =============================================================================
  // GET RENTAL BY MOVIE ID
  // =============================================================================
  
  /**
   * GET /api/rentals/:movieId
   * Check if user has active rental for a specific movie
   */
  fastify.get('/rentals/:movieId', { preHandler: requireAuthOrAnonymous }, async (request, reply) => {
    const { movieId } = request.params as { movieId: string };
    const { userId, anonymousId } = getUserContext(request);
    
    try {
      // Build where clause for dual-mode
      const userClause = userId 
        ? eq(rentals.userId, userId)
        : eq(rentals.anonymousId, anonymousId!);
      
      const [rental] = await db.select()
        .from(rentals)
        .where(
          and(
            eq(rentals.movieId, movieId),
            userClause
          )
        )
        .orderBy(rentals.purchasedAt)
        .limit(1);
      
      if (!rental) {
        return reply.send({ rental: null });
      }
      
      // Check if rental is expired
      const now = new Date();
      const isExpired = new Date(rental.expiresAt) <= now;
      
      if (isExpired) {
        return reply.send({ 
          rental: null,
          expired: true,
          expiredAt: rental.expiresAt,
        });
      }
      
      return reply.send({
        rental: {
          id: rental.id,
          movieId: rental.movieId,
          purchasedAt: rental.purchasedAt,
          expiresAt: rental.expiresAt,
          transactionId: rental.transactionId,
          amount: rental.amount,
          currency: rental.currency,
          paymentMethod: rental.paymentMethod,
        },
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch rental');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch rental',
      });
    }
  });
  
  // =============================================================================
  // CREATE RENTAL
  // =============================================================================
  
  /**
   * POST /api/rentals/:movieId
   * Create a new rental for a movie
   */
  fastify.post('/rentals/:movieId', { preHandler: requireAuthOrAnonymous }, async (request, reply) => {
    const { movieId } = request.params as { movieId: string };
    const { transactionId, amount = 500, paymentMethod = 'demo' } = request.body as {
      transactionId: string;
      amount?: number;
      paymentMethod?: string;
    };
    const { userId, anonymousId } = getUserContext(request);
    
    // Validate input
    if (!transactionId) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Transaction ID is required',
      });
    }
    
    try {
      // Check if movie exists
      const [movie] = await db.select()
        .from(movies)
        .where(eq(movies.id, movieId))
        .limit(1);
      
      if (!movie) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Movie not found',
        });
      }
      
      // Check if user already has an active rental
      const userClause = userId 
        ? eq(rentals.userId, userId)
        : eq(rentals.anonymousId, anonymousId!);
      
      const [existingRental] = await db.select()
        .from(rentals)
        .where(
          and(
            eq(rentals.movieId, movieId),
            userClause,
            gt(rentals.expiresAt, new Date())
          )
        )
        .limit(1);
      
      if (existingRental) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'You already have an active rental for this movie',
          rental: existingRental,
        });
      }
      
      // Create rental
      const now = new Date();
      const expiresAt = new Date(now.getTime() + RENTAL_DURATION_MS);
      
      const [rental] = await db.insert(rentals).values({
        userId: userId || null,
        anonymousId: anonymousId || null,
        movieId,
        purchasedAt: now,
        expiresAt,
        transactionId,
        amount,
        currency: 'USD',
        paymentMethod,
      }).returning();
      
      return reply.status(201).send({
        rental: {
          id: rental.id,
          movieId: rental.movieId,
          purchasedAt: rental.purchasedAt,
          expiresAt: rental.expiresAt,
          transactionId: rental.transactionId,
          amount: rental.amount,
          currency: rental.currency,
          paymentMethod: rental.paymentMethod,
        },
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to create rental');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create rental',
      });
    }
  });
  
  // =============================================================================
  // DATA MIGRATION
  // =============================================================================
  
  /**
   * POST /api/rentals/migrate
   * Migrate anonymous rentals to authenticated user
   * Called automatically after first login/registration
   */
  fastify.post('/rentals/migrate', { preHandler: requireAuthOrAnonymous }, async (request, reply) => {
    const { anonymousId: bodyAnonymousId } = request.body as { anonymousId: string };
    const { userId } = getUserContext(request);
    
    // Must be authenticated to migrate
    if (!userId) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required to migrate data',
      });
    }
    
    // Must provide anonymous ID
    if (!bodyAnonymousId) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Anonymous ID is required',
      });
    }
    
    try {
      // Update all rentals from anonymousId to userId
      const migratedRentals = await db.update(rentals)
        .set({
          userId,
          anonymousId: null,
        })
        .where(eq(rentals.anonymousId, bodyAnonymousId))
        .returning();
      
      return reply.send({
        success: true,
        migratedRentals: migratedRentals.length,
        message: `Migrated ${migratedRentals.length} rental(s) to your account`,
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to migrate rentals');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to migrate rentals',
      });
    }
  });
}
