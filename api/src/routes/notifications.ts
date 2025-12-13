/**
 * Movie Notification Routes
 * 
 * Handles user requests to be notified when movies become available
 */

import { FastifyInstance } from 'fastify';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { movieNotifications, movies, movieTranslations, users } from '../db/schema.js';
import { requireAuth, requireAdmin } from '../lib/auth-middleware.js';
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

  /**
   * GET /api/admin/notifications/movies/:movieId/subscribers
   * Get all users who subscribed to notifications for a movie (admin only)
   * Returns users who haven't been notified yet (notifiedAt is null)
   */
  fastify.get('/admin/notifications/movies/:movieId/subscribers', { preHandler: [requireAuth, requireAdmin] }, async (request, reply) => {
    const { movieId } = request.params as { movieId: string };
    
    try {
      // Get all subscribers who haven't been notified yet
      const subscribers = await db.select({
        id: movieNotifications.id,
        userId: movieNotifications.userId,
        createdAt: movieNotifications.createdAt,
        email: users.email,
        displayName: users.displayName,
      })
        .from(movieNotifications)
        .innerJoin(users, eq(movieNotifications.userId, users.id))
        .where(and(
          eq(movieNotifications.movieId, movieId),
          isNull(movieNotifications.notifiedAt)
        ))
        .orderBy(movieNotifications.createdAt);
      
      return reply.send({
        movieId,
        subscriberCount: subscribers.length,
        subscribers: subscribers.map(s => ({
          id: s.id,
          userId: s.userId,
          email: s.email,
          displayName: s.displayName,
          subscribedAt: s.createdAt,
        })),
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch notification subscribers');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch notification subscribers',
      });
    }
  });

  /**
   * POST /api/admin/notifications/movies/:movieId/mark-notified
   * Mark all subscribers for a movie as notified (admin only)
   */
  fastify.post('/admin/notifications/movies/:movieId/mark-notified', { preHandler: [requireAuth, requireAdmin] }, async (request, reply) => {
    const { movieId } = request.params as { movieId: string };
    
    try {
      const updated = await db.update(movieNotifications)
        .set({ notifiedAt: new Date() })
        .where(and(
          eq(movieNotifications.movieId, movieId),
          isNull(movieNotifications.notifiedAt)
        ))
        .returning();
      
      return reply.send({
        success: true,
        markedCount: updated.length,
        message: `Marked ${updated.length} subscribers as notified`,
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to mark subscribers as notified');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to mark subscribers as notified',
      });
    }
  });
}
