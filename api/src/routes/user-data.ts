/**
 * User Data Routes
 * 
 * Handles user data migration and management.
 * Provides unified endpoint for migrating anonymous data to authenticated accounts.
 */

import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { rentals, watchProgress } from '../db/schema.js';
import { requireAuth } from '../lib/auth-middleware.js';

export default async function userDataRoutes(fastify: FastifyInstance) {
  
  // =============================================================================
  // UNIFIED DATA MIGRATION
  // =============================================================================
  
  /**
   * POST /api/users/migrate
   * Migrate all anonymous data (rentals, watch progress) to authenticated user
   * Called automatically after first login/registration
   */
  fastify.post('/users/migrate', { preHandler: requireAuth }, async (request, reply) => {
    const { anonymousId } = request.body as { anonymousId: string };
    const userId = request.userId!;
    
    // Validate input
    if (!anonymousId) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Anonymous ID is required',
      });
    }
    
    try {
      // Migrate rentals
      const migratedRentals = await db.update(rentals)
        .set({
          userId,
          anonymousId: null,
        })
        .where(eq(rentals.anonymousId, anonymousId))
        .returning();
      
      // Migrate watch progress
      const migratedProgress = await db.update(watchProgress)
        .set({
          userId,
          anonymousId: null,
          updatedAt: new Date(),
        })
        .where(eq(watchProgress.anonymousId, anonymousId))
        .returning();
      
      const totalMigrated = migratedRentals.length + migratedProgress.length;
      
      return reply.send({
        success: true,
        migratedRentals: migratedRentals.length,
        migratedProgress: migratedProgress.length,
        totalMigrated,
        message: `Successfully migrated ${migratedRentals.length} rental(s) and ${migratedProgress.length} watch progress record(s) to your account`,
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to migrate user data');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to migrate user data',
      });
    }
  });
  
  // =============================================================================
  // USER STATISTICS
  // =============================================================================
  
  /**
   * GET /api/users/me/stats
   * Get user statistics (rentals count, watch progress count, etc.)
   */
  fastify.get('/users/me/stats', { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.userId!;
    
    try {
      // Count rentals
      const userRentals = await db.select()
        .from(rentals)
        .where(eq(rentals.userId, userId));
      
      const activeRentals = userRentals.filter(rental => 
        new Date(rental.expiresAt) > new Date()
      );
      
      // Count watch progress
      const userProgress = await db.select()
        .from(watchProgress)
        .where(eq(watchProgress.userId, userId));
      
      const completedMovies = userProgress.filter(p => p.completed);
      
      return reply.send({
        stats: {
          totalRentals: userRentals.length,
          activeRentals: activeRentals.length,
          totalWatchProgress: userProgress.length,
          completedMovies: completedMovies.length,
        },
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch user stats');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch user statistics',
      });
    }
  });
}
