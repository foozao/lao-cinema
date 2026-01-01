/**
 * Rental CRUD Routes
 * 
 * Basic rental operations: list all, get by movie, create movie rental
 */

import { FastifyInstance } from 'fastify';
import { sendNotFound, sendForbidden, sendInternalError, sendCreated } from '../lib/response-helpers.js';
import { eq, and, gt, desc, inArray, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { rentals, movies, watchProgress, shortPacks, shortPackItems } from '../db/schema.js';
import { requireAuthOrAnonymous, getUserContext } from '../lib/auth-middleware.js';
import { buildDualModeWhereClause } from '../lib/auth-helpers.js';
import { buildMovieWithRelations } from '../lib/movie-builder.js';
import { MAX_RENTALS_PER_MOVIE, isPerMovieRentalLimitEnabled, RENTAL_DURATION_MS } from '../config.js';
import * as schema from '../db/schema.js';
import { buildRentalPackResponse, calculatePackWatchProgress } from '../lib/rental-helpers.js';
import { validateBody, validateParams, createRentalSchema, movieIdParamSchema } from '../lib/validation.js';

export default async function rentalCrudRoutes(fastify: FastifyInstance) {
  
  // =============================================================================
  // GET ALL RENTALS
  // =============================================================================
  
  /**
   * GET /api/rentals
   * Get all active rentals for current user/anonymous
   * Query params:
   * - includeRecent: boolean (default: false) - include recently expired rentals (within 24 hours)
   * - includeAll: boolean (default: false) - include all rentals (active and expired)
   */
  fastify.get('/rentals', { preHandler: requireAuthOrAnonymous }, async (request, reply) => {
    const { userId, anonymousId } = getUserContext(request);
    const { includeRecent, includeAll } = request.query as { includeRecent?: string; includeAll?: string };
    
    try {
      const whereClause = buildDualModeWhereClause(request, rentals);
      
      const userRentals = await db.select({
        id: rentals.id,
        movieId: rentals.movieId,
        shortPackId: rentals.shortPackId,
        currentShortId: rentals.currentShortId,
        purchasedAt: rentals.purchasedAt,
        expiresAt: rentals.expiresAt,
        transactionId: rentals.transactionId,
        amount: rentals.amount,
        currency: rentals.currency,
        paymentMethod: rentals.paymentMethod,
        // Include full movie data
        movie: movies,
        // Include pack data
        pack: shortPacks,
        // Include watch progress
        watchProgress: watchProgress,
      })
      .from(rentals)
      .leftJoin(movies, eq(rentals.movieId, movies.id))
      .leftJoin(shortPacks, eq(rentals.shortPackId, shortPacks.id))
      .leftJoin(watchProgress, and(
        eq(watchProgress.movieId, rentals.movieId),
        userId 
          ? eq(watchProgress.userId, userId)
          : eq(watchProgress.anonymousId, anonymousId!)
      ))
      .where(whereClause)
      .orderBy(desc(rentals.purchasedAt));
      
      // Filter rentals based on query parameters
      const now = new Date();
      const recentCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      const filteredRentals = userRentals.filter(rental => {
        const expiresAt = new Date(rental.expiresAt);
        
        // If includeAll is true, return all rentals
        if (includeAll === 'true') {
          return true;
        }
        
        if (expiresAt > now) {
          // Active rental
          return true;
        }
        
        if (includeRecent === 'true' && expiresAt > recentCutoff) {
          // Recently expired (within 24 hours)
          return true;
        }
        
        return false;
      });
      
      // Build complete movie/pack objects with translations
      const rentalsWithMovies = await Promise.all(
        filteredRentals.map(async (rental) => {
          let completeMovie = null;
          let completePack = null;
          
          try {
            if (rental.movie) {
              completeMovie = await buildMovieWithRelations(rental.movie, db, schema, {
                includeCast: false,
                includeCrew: false,
                includeGenres: false,
              });
            }
            
            // Build pack with translations if this is a pack rental
            if (rental.pack && rental.shortPackId) {
              completePack = await buildRentalPackResponse(rental.pack, rental.shortPackId);
            }
          } catch (err) {
            request.log.error({ err, movieId: rental.movieId }, 'Failed to build relations');
          }
          
          // Calculate aggregate watch progress for pack rentals
          let packWatchProgress = null;
          if (rental.shortPackId && completePack) {
            try {
              packWatchProgress = await calculatePackWatchProgress(rental.shortPackId, userId ?? null, anonymousId ?? null);
            } catch (err) {
              request.log.error({ err, packId: rental.shortPackId }, 'Failed to calculate pack watch progress');
            }
          }
          
          return {
            id: rental.id,
            movieId: rental.movieId,
            shortPackId: rental.shortPackId,
            currentShortId: rental.currentShortId ?? null,
            purchasedAt: rental.purchasedAt,
            expiresAt: rental.expiresAt,
            transactionId: rental.transactionId,
            amount: rental.amount,
            currency: rental.currency,
            paymentMethod: rental.paymentMethod,
            movie: completeMovie,
            pack: completePack,
            watchProgress: packWatchProgress || rental.watchProgress,
          };
        })
      );
      
      return reply.send({
        rentals: rentalsWithMovies,
        total: rentalsWithMovies.length,
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch rentals');
      return sendInternalError(reply, 'Failed to fetch rentals');
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
      const userClause = buildDualModeWhereClause(request, rentals);
      
      // Check for direct movie rental first
      const [directRental] = await db.select()
        .from(rentals)
        .where(
          and(
            eq(rentals.movieId, movieId),
            userClause
          )
        )
        .orderBy(desc(rentals.purchasedAt))
        .limit(1);
      
      if (directRental) {
        // Check if rental is expired
        const now = new Date();
        const isExpired = new Date(directRental.expiresAt) <= now;
        
        if (isExpired) {
          // Don't return early - check for pack rental below
        } else {
          return reply.send({
            rental: {
              id: directRental.id,
              movieId: directRental.movieId,
              purchasedAt: directRental.purchasedAt,
              expiresAt: directRental.expiresAt,
              transactionId: directRental.transactionId,
              amount: directRental.amount,
              currency: directRental.currency,
              paymentMethod: directRental.paymentMethod,
            },
          });
        }
      }
      
      // Check for pack rental that includes this movie
      const packItems = await db.select({ packId: shortPackItems.packId })
        .from(shortPackItems)
        .where(eq(shortPackItems.movieId, movieId));
      
      if (packItems.length > 0) {
        const packIds = packItems.map(p => p.packId);
        
        const [packRental] = await db.select()
          .from(rentals)
          .where(
            and(
              inArray(rentals.shortPackId, packIds),
              userClause,
              gt(rentals.expiresAt, new Date())
            )
          )
          .limit(1);
        
        if (packRental) {
          return reply.send({
            rental: {
              id: packRental.id,
              movieId: null, // This is a pack rental, not direct
              shortPackId: packRental.shortPackId,
              purchasedAt: packRental.purchasedAt,
              expiresAt: packRental.expiresAt,
              transactionId: packRental.transactionId,
              amount: packRental.amount,
              currency: packRental.currency,
              paymentMethod: packRental.paymentMethod,
            },
          });
        }
      }
      
      // Check if direct rental was expired
      if (directRental) {
        return reply.send({ 
          rental: null,
          expired: true,
          expiredAt: directRental.expiresAt,
        });
      }
      
      return reply.send({ rental: null });
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch rental');
      return sendInternalError(reply, 'Failed to fetch rental');
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
    const params = validateParams(movieIdParamSchema, request.params, reply);
    if (!params) return;
    
    const body = validateBody(createRentalSchema, request.body, reply);
    if (!body) return;
    
    const { movieId } = params;
    const { transactionId, amount, paymentMethod } = body;
    const { userId, anonymousId } = getUserContext(request);
    
    try {
      // Check if movie exists
      const [movie] = await db.select()
        .from(movies)
        .where(eq(movies.id, movieId))
        .limit(1);
      
      if (!movie) {
        return sendNotFound(reply, 'Movie not found');
      }
      
      // Check per-movie rental limit (pre-alpha protection)
      if (isPerMovieRentalLimitEnabled()) {
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(rentals)
          .where(eq(rentals.movieId, movieId));
        
        if (count >= MAX_RENTALS_PER_MOVIE) {
          return sendForbidden(reply, `This movie has reached its rental limit for testing (${MAX_RENTALS_PER_MOVIE} rentals). Please try another film.`, 'MOVIE_RENTAL_LIMIT_REACHED');
        }
      }
      
      // Check if user already has an active rental
      const userClause = buildDualModeWhereClause(request, rentals);
      
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
        return reply.status(409).type('application/problem+json').send({
          type: 'about:blank',
          title: 'Conflict',
          status: 409,
          detail: 'You already have an active rental for this movie',
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
        amount: amount ?? 500,
        currency: 'USD',
        paymentMethod,
      }).returning();
      
      return sendCreated(reply, {
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
      return sendInternalError(reply, 'Failed to create rental');
    }
  });
}
