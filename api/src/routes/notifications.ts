/**
 * Movie Notification Routes
 * 
 * Handles user requests to be notified when movies become available
 */

import { FastifyInstance } from 'fastify';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { movieNotifications, movies, movieTranslations } from '../db/schema.js';
import { requireAuth } from '../lib/auth-middleware.js';
import type { MovieNotification } from '../db/schema.js';

export default async function notificationRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/notifications/movies/:movieId
   * Request notification when a movie becomes available
   */
  fastify.post('/notifications/movies/:movieId', { preHandler: [requireAuth] }, async (request, reply) => {
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
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Movie not found',
        });
      }
      
      // Check if already subscribed
      const existing = await db.select()
        .from(movieNotifications)
        .where(and(
          eq(movieNotifications.userId, user.id),
          eq(movieNotifications.movieId, movieId)
        ))
        .limit(1)
        .then(rows => rows[0]);
      
      if (existing) {
        return reply.send({
          success: true,
          message: 'Already subscribed to notifications',
          notification: existing,
        });
      }
      
      // Create notification request
      const [notification] = await db.insert(movieNotifications).values({
        userId: user.id,
        movieId,
      }).returning();
      
      return reply.status(201).send({
        success: true,
        message: 'Notification request created',
        notification,
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to create notification request');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create notification request',
      });
    }
  });

  /**
   * DELETE /api/notifications/movies/:movieId
   * Cancel notification request for a movie
   */
  fastify.delete('/notifications/movies/:movieId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { movieId } = request.params as { movieId: string };
    const user = (request as any).user;
    
    try {
      const deleted = await db.delete(movieNotifications)
        .where(and(
          eq(movieNotifications.userId, user.id),
          eq(movieNotifications.movieId, movieId)
        ))
        .returning();
      
      if (deleted.length === 0) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Notification request not found',
        });
      }
      
      return reply.send({
        success: true,
        message: 'Notification request cancelled',
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to cancel notification request');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to cancel notification request',
      });
    }
  });

  /**
   * GET /api/notifications/movies/:movieId
   * Check if user is subscribed to a movie notification
   */
  fastify.get('/notifications/movies/:movieId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { movieId } = request.params as { movieId: string };
    const user = (request as any).user;
    
    try {
      const notification = await db.select()
        .from(movieNotifications)
        .where(and(
          eq(movieNotifications.userId, user.id),
          eq(movieNotifications.movieId, movieId)
        ))
        .limit(1)
        .then(rows => rows[0]);
      
      return reply.send({
        subscribed: !!notification,
        notification: notification || null,
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to check notification status');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to check notification status',
      });
    }
  });

  /**
   * GET /api/notifications/movies
   * Get all movie notification requests for current user
   */
  fastify.get('/notifications/movies', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = (request as any).user;
    
    try {
      const notifications = await db.select({
        notification: movieNotifications,
        movie: movies,
      })
        .from(movieNotifications)
        .innerJoin(movies, eq(movieNotifications.movieId, movies.id))
        .where(eq(movieNotifications.userId, user.id))
        .orderBy(movieNotifications.createdAt);
      
      // Fetch translations for all movies
      const movieIds = notifications.map(n => n.movie.id);
      const allTranslations = movieIds.length > 0
        ? await db.select()
            .from(movieTranslations)
            .where(inArray(movieTranslations.movieId, movieIds))
        : [];
      
      // Group translations by movieId
      const translationsByMovie = new Map<string, { en?: string; lo?: string }>();
      for (const trans of allTranslations) {
        if (!translationsByMovie.has(trans.movieId)) {
          translationsByMovie.set(trans.movieId, {});
        }
        const titles = translationsByMovie.get(trans.movieId)!;
        if (trans.language === 'en') titles.en = trans.title;
        if (trans.language === 'lo') titles.lo = trans.title;
      }
      
      return reply.send({
        notifications: notifications.map(n => {
          const titles = translationsByMovie.get(n.movie.id) || {};
          return {
            ...n.notification,
            movie: {
              id: n.movie.id,
              tmdb_id: n.movie.tmdbId,
              title: {
                en: titles.en || n.movie.originalTitle || 'Untitled',
                lo: titles.lo,
              },
              poster_path: n.movie.posterPath,
              release_date: n.movie.releaseDate,
              availability_status: n.movie.availabilityStatus,
            },
          };
        }),
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch notifications');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch notifications',
      });
    }
  });
}
