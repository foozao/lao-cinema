/**
 * Watch Progress Routes
 * 
 * Handles watch progress tracking for both authenticated and anonymous users.
 * Enables "continue watching" feature across devices (for authenticated users).
 */

import { FastifyInstance } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { watchProgress, movies } from '../db/schema.js';
import { requireAuthOrAnonymous, getUserContext } from '../lib/auth-middleware.js';
import { buildDualModeWhereClause } from '../lib/auth-helpers.js';

export default async function watchProgressRoutes(fastify: FastifyInstance) {
  
  // =============================================================================
  // GET ALL WATCH PROGRESS
  // =============================================================================
  
  /**
   * GET /api/watch-progress
   * Get all watch progress for current user/anonymous
   */
  fastify.get('/watch-progress', { preHandler: requireAuthOrAnonymous }, async (request, reply) => {
    const { userId, anonymousId } = getUserContext(request);
    
    try {
      const whereClause = buildDualModeWhereClause(request, watchProgress);
      
      const progressRecords = await db.select({
        id: watchProgress.id,
        movieId: watchProgress.movieId,
        progressSeconds: watchProgress.progressSeconds,
        durationSeconds: watchProgress.durationSeconds,
        completed: watchProgress.completed,
        lastWatchedAt: watchProgress.lastWatchedAt,
        createdAt: watchProgress.createdAt,
        updatedAt: watchProgress.updatedAt,
        // Include movie info
        movieTitle: movies.originalTitle,
        moviePosterPath: movies.posterPath,
        movieBackdropPath: movies.backdropPath,
      })
      .from(watchProgress)
      .leftJoin(movies, eq(watchProgress.movieId, movies.id))
      .where(whereClause)
      .orderBy(desc(watchProgress.lastWatchedAt));
      
      return reply.send({
        progress: progressRecords,
        total: progressRecords.length,
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch watch progress');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch watch progress',
      });
    }
  });
  
  // =============================================================================
  // GET WATCH PROGRESS BY MOVIE ID
  // =============================================================================
  
  /**
   * GET /api/watch-progress/:movieId
   * Get watch progress for a specific movie
   */
  fastify.get('/watch-progress/:movieId', { preHandler: requireAuthOrAnonymous }, async (request, reply) => {
    const { movieId } = request.params as { movieId: string };
    const { userId, anonymousId } = getUserContext(request);
    
    try {
      const userClause = buildDualModeWhereClause(request, watchProgress);
      
      const [progress] = await db.select()
        .from(watchProgress)
        .where(
          and(
            eq(watchProgress.movieId, movieId),
            userClause
          )
        )
        .limit(1);
      
      if (!progress) {
        return reply.send({ progress: null });
      }
      
      return reply.send({
        progress: {
          id: progress.id,
          movieId: progress.movieId,
          progressSeconds: progress.progressSeconds,
          durationSeconds: progress.durationSeconds,
          completed: progress.completed,
          lastWatchedAt: progress.lastWatchedAt,
          createdAt: progress.createdAt,
          updatedAt: progress.updatedAt,
        },
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch watch progress');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch watch progress',
      });
    }
  });
  
  // =============================================================================
  // UPDATE WATCH PROGRESS
  // =============================================================================
  
  /**
   * PUT /api/watch-progress/:movieId
   * Update or create watch progress for a movie
   */
  fastify.put('/watch-progress/:movieId', { preHandler: requireAuthOrAnonymous }, async (request, reply) => {
    const { movieId } = request.params as { movieId: string };
    const { progressSeconds, durationSeconds, completed } = request.body as {
      progressSeconds: number;
      durationSeconds: number;
      completed?: boolean;
    };
    const { userId, anonymousId } = getUserContext(request);
    
    // Validate input
    if (progressSeconds === undefined || durationSeconds === undefined) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'progressSeconds and durationSeconds are required',
      });
    }
    
    if (progressSeconds < 0 || durationSeconds < 0) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Progress and duration must be non-negative',
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
      
      // Auto-calculate completion if > 90%
      const isCompleted = completed !== undefined 
        ? completed 
        : (progressSeconds / durationSeconds) > 0.9;
      
      const userClause = buildDualModeWhereClause(request, watchProgress);
      
      const [existingProgress] = await db.select()
        .from(watchProgress)
        .where(
          and(
            eq(watchProgress.movieId, movieId),
            userClause
          )
        )
        .limit(1);
      
      let progress;
      
      if (existingProgress) {
        // Only update if new progress is greater than existing (prevents race conditions)
        // Exception: always update if marking as completed
        const shouldUpdate = 
          progressSeconds > existingProgress.progressSeconds || 
          (isCompleted && !existingProgress.completed);
        
        if (shouldUpdate) {
          [progress] = await db.update(watchProgress)
            .set({
              progressSeconds: Math.max(progressSeconds, existingProgress.progressSeconds),
              durationSeconds,
              completed: isCompleted || existingProgress.completed,
              lastWatchedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(watchProgress.id, existingProgress.id))
            .returning();
        } else {
          // Return existing progress without updating
          progress = existingProgress;
        }
      } else {
        // Create new progress
        [progress] = await db.insert(watchProgress).values({
          userId: userId || null,
          anonymousId: anonymousId || null,
          movieId,
          progressSeconds,
          durationSeconds,
          completed: isCompleted,
          lastWatchedAt: new Date(),
        }).returning();
      }
      
      return reply.send({
        progress: {
          id: progress.id,
          movieId: progress.movieId,
          progressSeconds: progress.progressSeconds,
          durationSeconds: progress.durationSeconds,
          completed: progress.completed,
          lastWatchedAt: progress.lastWatchedAt,
          createdAt: progress.createdAt,
          updatedAt: progress.updatedAt,
        },
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to update watch progress');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update watch progress',
      });
    }
  });
  
  // =============================================================================
  // DELETE WATCH PROGRESS
  // =============================================================================
  
  /**
   * DELETE /api/watch-progress/:movieId
   * Delete watch progress for a specific movie
   */
  fastify.delete('/watch-progress/:movieId', { preHandler: requireAuthOrAnonymous }, async (request, reply) => {
    const { movieId } = request.params as { movieId: string };
    const { userId, anonymousId } = getUserContext(request);
    
    try {
      const userClause = userId 
        ? eq(watchProgress.userId, userId)
        : eq(watchProgress.anonymousId, anonymousId!);
      
      await db.delete(watchProgress)
        .where(
          and(
            eq(watchProgress.movieId, movieId),
            userClause
          )
        );
      
      return reply.send({
        success: true,
        message: 'Watch progress deleted',
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to delete watch progress');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete watch progress',
      });
    }
  });
  
  // =============================================================================
  // DATA MIGRATION
  // =============================================================================
  
  /**
   * POST /api/watch-progress/migrate
   * Migrate anonymous watch progress to authenticated user
   * Called automatically after first login/registration
   */
  fastify.post('/watch-progress/migrate', { preHandler: requireAuthOrAnonymous }, async (request, reply) => {
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
      // Update all watch progress from anonymousId to userId
      const migratedProgress = await db.update(watchProgress)
        .set({
          userId,
          anonymousId: null,
          updatedAt: new Date(),
        })
        .where(eq(watchProgress.anonymousId, bodyAnonymousId))
        .returning();
      
      return reply.send({
        success: true,
        migratedProgress: migratedProgress.length,
        message: `Migrated ${migratedProgress.length} watch progress record(s) to your account`,
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to migrate watch progress');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to migrate watch progress',
      });
    }
  });
}
