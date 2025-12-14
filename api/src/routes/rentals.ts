/**
 * Rentals Routes
 * 
 * Handles movie rental management for both authenticated and anonymous users.
 * Supports dual-mode: users can rent movies without an account.
 */

import { FastifyInstance } from 'fastify';
import { eq, and, or, gt, desc, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { rentals, movies, watchProgress, shortPacks, shortPackItems, shortPackTranslations } from '../db/schema.js';
import { requireAuthOrAnonymous, getUserContext } from '../lib/auth-middleware.js';
import { buildMovieWithRelations } from '../lib/movie-builder.js';
import * as schema from '../db/schema.js';

// Rental duration: 24 hours
const RENTAL_DURATION_MS = 24 * 60 * 60 * 1000;

export default async function rentalRoutes(fastify: FastifyInstance) {
  
  // =============================================================================
  // GET ALL RENTALS
  // =============================================================================
  
  /**
   * GET /api/rentals
   * Get all active rentals for current user/anonymous
   * Query params:
   * - includeRecent: boolean (default: false) - include recently expired rentals (within 24 hours)
   */
  fastify.get('/rentals', { preHandler: requireAuthOrAnonymous }, async (request, reply) => {
    const { userId, anonymousId } = getUserContext(request);
    const { includeRecent } = request.query as { includeRecent?: string };
    
    try {
      // Build where clause for dual-mode
      const whereClause = userId 
        ? eq(rentals.userId, userId)
        : eq(rentals.anonymousId, anonymousId!);
      
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
      
      // Filter rentals based on includeRecent parameter
      const now = new Date();
      const recentCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      const filteredRentals = userRentals.filter(rental => {
        const expiresAt = new Date(rental.expiresAt);
        
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
              const packTranslations = await db.select()
                .from(shortPackTranslations)
                .where(eq(shortPackTranslations.packId, rental.shortPackId));
              
              const title: Record<string, string> = {};
              const description: Record<string, string> = {};
              for (const trans of packTranslations) {
                title[trans.language] = trans.title;
                if (trans.description) {
                  description[trans.language] = trans.description;
                }
              }
              
              // Get shorts posters for montage
              const packItems = await db.select({
                movieId: shortPackItems.movieId,
                order: shortPackItems.order,
                posterPath: movies.posterPath,
              })
              .from(shortPackItems)
              .leftJoin(movies, eq(shortPackItems.movieId, movies.id))
              .where(eq(shortPackItems.packId, rental.shortPackId))
              .orderBy(shortPackItems.order)
              .limit(4);
              
              const shortPosters = packItems
                .map(item => item.posterPath)
                .filter(Boolean);
              
              completePack = {
                id: rental.pack.id,
                slug: rental.pack.slug,
                posterPath: rental.pack.posterPath || (rental.pack as any).poster_path,
                backdropPath: rental.pack.backdropPath || (rental.pack as any).backdrop_path,
                isPublished: rental.pack.isPublished,
                short_posters: shortPosters,
                short_count: packItems.length,
                title,
                description: Object.keys(description).length > 0 ? description : undefined,
              };
            }
          } catch (err) {
            request.log.error({ err, movieId: rental.movieId }, 'Failed to build relations');
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
            watchProgress: rental.watchProgress,
          };
        })
      );
      
      return reply.send({
        rentals: rentalsWithMovies,
        total: rentalsWithMovies.length,
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
  // CHECK ACCESS (Movie or Pack) - Must be before :movieId route
  // =============================================================================
  
  /**
   * GET /api/rentals/access/:movieId
   * Check if user has access to a movie (via direct rental or pack rental)
   */
  fastify.get('/rentals/access/:movieId', { preHandler: requireAuthOrAnonymous }, async (request, reply) => {
    const { movieId } = request.params as { movieId: string };
    const { userId, anonymousId } = getUserContext(request);
    
    try {
      const userClause = userId 
        ? eq(rentals.userId, userId)
        : eq(rentals.anonymousId, anonymousId!);
      
      // Check for direct movie rental
      const [directRental] = await db.select()
        .from(rentals)
        .where(
          and(
            eq(rentals.movieId, movieId),
            userClause,
            gt(rentals.expiresAt, new Date())
          )
        )
        .limit(1);
      
      if (directRental) {
        return reply.send({
          hasAccess: true,
          accessType: 'movie',
          rental: {
            id: directRental.id,
            expiresAt: directRental.expiresAt,
          },
        });
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
            hasAccess: true,
            accessType: 'pack',
            rental: {
              id: packRental.id,
              shortPackId: packRental.shortPackId,
              expiresAt: packRental.expiresAt,
            },
          });
        }
      }
      
      return reply.send({
        hasAccess: false,
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to check access');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to check access',
      });
    }
  });
  
  // =============================================================================
  // GET PACK RENTAL STATUS - Must be before :movieId route
  // =============================================================================
  
  /**
   * GET /api/rentals/packs/:packId
   * Check if user has active rental for a specific pack
   */
  fastify.get('/rentals/packs/:packId', { preHandler: requireAuthOrAnonymous }, async (request, reply) => {
    const { packId } = request.params as { packId: string };
    const { userId, anonymousId } = getUserContext(request);
    
    try {
      const userClause = userId 
        ? eq(rentals.userId, userId)
        : eq(rentals.anonymousId, anonymousId!);
      
      const [rental] = await db.select({
        id: rentals.id,
        userId: rentals.userId,
        anonymousId: rentals.anonymousId,
        movieId: rentals.movieId,
        shortPackId: rentals.shortPackId,
        currentShortId: rentals.currentShortId,
        purchasedAt: rentals.purchasedAt,
        expiresAt: rentals.expiresAt,
        transactionId: rentals.transactionId,
        amount: rentals.amount,
        currency: rentals.currency,
        paymentMethod: rentals.paymentMethod,
      })
        .from(rentals)
        .where(
          and(
            eq(rentals.shortPackId, packId),
            userClause
          )
        )
        .orderBy(desc(rentals.purchasedAt))
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
          shortPackId: rental.shortPackId,
          currentShortId: rental.currentShortId ?? null,
          purchasedAt: rental.purchasedAt,
          expiresAt: rental.expiresAt,
          transactionId: rental.transactionId,
          amount: rental.amount,
          currency: rental.currency,
          paymentMethod: rental.paymentMethod,
        },
      });
    } catch (error) {
      request.log.error({ err: error }, 'Failed to fetch pack rental');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch pack rental',
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
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch rental',
      });
    }
  });
  
  // =============================================================================
  // CREATE PACK RENTAL - Must be before :movieId route
  // =============================================================================
  
  /**
   * POST /api/rentals/packs/:packId
   * Create a new rental for a short pack (grants access to all shorts in the pack)
   */
  fastify.post('/rentals/packs/:packId', { preHandler: requireAuthOrAnonymous }, async (request, reply) => {
    const { packId } = request.params as { packId: string };
    const { transactionId, paymentMethod = 'demo' } = request.body as {
      transactionId: string;
      paymentMethod?: string;
    };
    const { userId, anonymousId } = getUserContext(request);
    
    if (!transactionId) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Transaction ID is required',
      });
    }
    
    try {
      // Check if pack exists
      const [pack] = await db.select()
        .from(shortPacks)
        .where(eq(shortPacks.id, packId))
        .limit(1);
      
      if (!pack) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Short pack not found',
        });
      }
      
      // Check if user already has an active rental for this pack
      const userClause = userId 
        ? eq(rentals.userId, userId)
        : eq(rentals.anonymousId, anonymousId!);
      
      const [existingRental] = await db.select()
        .from(rentals)
        .where(
          and(
            eq(rentals.shortPackId, packId),
            userClause,
            gt(rentals.expiresAt, new Date())
          )
        )
        .limit(1);
      
      if (existingRental) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'You already have an active rental for this pack',
          rental: existingRental,
        });
      }
      
      // Create rental
      const now = new Date();
      const expiresAt = new Date(now.getTime() + RENTAL_DURATION_MS);
      
      const [rental] = await db.insert(rentals).values({
        userId: userId || null,
        anonymousId: anonymousId || null,
        shortPackId: packId,
        movieId: null,
        purchasedAt: now,
        expiresAt,
        transactionId,
        amount: 499, // Default price in cents ($4.99) - pricing TBD
        currency: 'USD',
        paymentMethod,
      }).returning();
      
      // Get pack title for response
      const translations = await db.select()
        .from(shortPackTranslations)
        .where(eq(shortPackTranslations.packId, packId));
      
      const title: Record<string, string> = {};
      for (const t of translations) {
        title[t.language] = t.title;
      }
      
      return reply.status(201).send({
        rental: {
          id: rental.id,
          shortPackId: rental.shortPackId,
          purchasedAt: rental.purchasedAt,
          expiresAt: rental.expiresAt,
          transactionId: rental.transactionId,
          amount: rental.amount,
          currency: rental.currency,
          paymentMethod: rental.paymentMethod,
        },
        pack: {
          id: pack.id,
          slug: pack.slug,
          title,
        },
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to create pack rental');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create pack rental',
      });
    }
  });
  
  // =============================================================================
  // DATA MIGRATION - Must be before :movieId route
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
  // UPDATE PACK POSITION
  // =============================================================================
  
  /**
   * PATCH /api/rentals/:rentalId/position
   * Update the current short position for a pack rental
   */
  fastify.patch('/rentals/:rentalId/position', { preHandler: requireAuthOrAnonymous }, async (request, reply) => {
    const { rentalId } = request.params as { rentalId: string };
    const { currentShortId } = request.body as { currentShortId: string };
    const { userId, anonymousId } = getUserContext(request);
    
    try {
      // Verify rental belongs to user
      const userClause = userId 
        ? eq(rentals.userId, userId)
        : eq(rentals.anonymousId, anonymousId!);
      
      const [rental] = await db.select()
        .from(rentals)
        .where(
          and(
            eq(rentals.id, rentalId),
            userClause,
            gt(rentals.expiresAt, new Date())
          )
        )
        .limit(1);
      
      if (!rental) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Rental not found or expired',
        });
      }
      
      // Update the current short position
      await db.update(rentals)
        .set({ currentShortId })
        .where(eq(rentals.id, rentalId));
      
      return reply.send({ success: true });
    } catch (error) {
      request.log.error({ error }, 'Failed to update pack position');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update pack position',
      });
    }
  });
}
