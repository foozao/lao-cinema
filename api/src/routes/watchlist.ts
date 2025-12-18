/**
 * Watchlist Routes
 * 
 * Handles user watchlist (movies to watch later)
 */

import { FastifyInstance } from 'fastify';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { userWatchlist, movies, movieTranslations } from '../db/schema.js';
import { requireAuth } from '../lib/auth-middleware.js';
import { sendNotFound, sendInternalError, sendCreated } from '../lib/response-helpers.js';

export default async function watchlistRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/watchlist/:movieId
   * Add a movie to user's watchlist
   */
  fastify.post('/watchlist/:movieId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { movieId } = request.params as { movieId: string };
    const user = (request as any).user;
    
    try {
      // Verify movie exists
      const movie = await db.select()
        .from(movies)
        .where(eq(movies.id, movieId))
        .limit(1)
        .then(rows => rows[0]);
      
      if (!movie) {
        return sendNotFound(reply, 'Movie not found');
      }
      
      // Check if already in watchlist
      const existing = await db.select()
        .from(userWatchlist)
        .where(and(
          eq(userWatchlist.userId, user.id),
          eq(userWatchlist.movieId, movieId)
        ))
        .limit(1)
        .then(rows => rows[0]);
      
      if (existing) {
        return reply.send({
          success: true,
          message: 'Already in watchlist',
          item: existing,
        });
      }
      
      // Add to watchlist
      const [item] = await db.insert(userWatchlist).values({
        userId: user.id,
        movieId,
      }).returning();
      
      return sendCreated(reply, {
        success: true,
        message: 'Added to watchlist',
        item,
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to add to watchlist');
      return sendInternalError(reply, 'Failed to add to watchlist');
    }
  });

  /**
   * DELETE /api/watchlist/:movieId
   * Remove a movie from user's watchlist
   */
  fastify.delete('/watchlist/:movieId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { movieId } = request.params as { movieId: string };
    const user = (request as any).user;
    
    try {
      const deleted = await db.delete(userWatchlist)
        .where(and(
          eq(userWatchlist.userId, user.id),
          eq(userWatchlist.movieId, movieId)
        ))
        .returning();
      
      if (deleted.length === 0) {
        return sendNotFound(reply, 'Movie not in watchlist');
      }
      
      return reply.send({
        success: true,
        message: 'Removed from watchlist',
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to remove from watchlist');
      return sendInternalError(reply, 'Failed to remove from watchlist');
    }
  });

  /**
   * GET /api/watchlist/:movieId
   * Check if a movie is in user's watchlist
   */
  fastify.get('/watchlist/:movieId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { movieId } = request.params as { movieId: string };
    const user = (request as any).user;
    
    try {
      const item = await db.select()
        .from(userWatchlist)
        .where(and(
          eq(userWatchlist.userId, user.id),
          eq(userWatchlist.movieId, movieId)
        ))
        .limit(1)
        .then(rows => rows[0]);
      
      return reply.send({
        inWatchlist: !!item,
        item: item || null,
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to check watchlist status');
      return sendInternalError(reply, 'Failed to check watchlist status');
    }
  });

  /**
   * GET /api/watchlist
   * Get user's full watchlist with movie details
   */
  fastify.get('/watchlist', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = (request as any).user;
    
    try {
      const items = await db.select({
        item: userWatchlist,
        movie: movies,
      })
        .from(userWatchlist)
        .innerJoin(movies, eq(userWatchlist.movieId, movies.id))
        .where(eq(userWatchlist.userId, user.id))
        .orderBy(desc(userWatchlist.createdAt));
      
      // Fetch translations for all movies
      const movieIds = items.map(i => i.movie.id);
      const allTranslations = movieIds.length > 0
        ? await db.select()
            .from(movieTranslations)
            .where(inArray(movieTranslations.movieId, movieIds))
        : [];
      
      // Group translations by movieId
      const translationsByMovie = new Map<string, { en?: { title: string; overview: string; tagline?: string }; lo?: { title: string; overview: string; tagline?: string } }>();
      for (const trans of allTranslations) {
        if (!translationsByMovie.has(trans.movieId)) {
          translationsByMovie.set(trans.movieId, {});
        }
        const translations = translationsByMovie.get(trans.movieId)!;
        if (trans.language === 'en') {
          translations.en = { title: trans.title, overview: trans.overview, tagline: trans.tagline || undefined };
        }
        if (trans.language === 'lo') {
          translations.lo = { title: trans.title, overview: trans.overview, tagline: trans.tagline || undefined };
        }
      }
      
      return reply.send({
        watchlist: items.map(i => {
          const translations = translationsByMovie.get(i.movie.id) || {};
          return {
            id: i.item.id,
            addedAt: i.item.createdAt,
            movie: {
              id: i.movie.id,
              tmdb_id: i.movie.tmdbId,
              title: {
                en: translations.en?.title || i.movie.originalTitle || 'Untitled',
                lo: translations.lo?.title,
              },
              overview: {
                en: translations.en?.overview || '',
                lo: translations.lo?.overview,
              },
              poster_path: i.movie.posterPath,
              backdrop_path: i.movie.backdropPath,
              release_date: i.movie.releaseDate,
              runtime: i.movie.runtime,
              vote_average: i.movie.voteAverage,
              availability_status: i.movie.availabilityStatus,
            },
          };
        }),
        count: items.length,
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch watchlist');
      return sendInternalError(reply, 'Failed to fetch watchlist');
    }
  });

  /**
   * GET /api/watchlist/count
   * Get count of movies in user's watchlist
   */
  fastify.get('/watchlist/count', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = (request as any).user;
    
    try {
      const items = await db.select()
        .from(userWatchlist)
        .where(eq(userWatchlist.userId, user.id));
      
      return reply.send({
        count: items.length,
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to get watchlist count');
      return sendInternalError(reply, 'Failed to get watchlist count');
    }
  });
}
