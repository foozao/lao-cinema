/**
 * Rental Migration Routes
 * 
 * Handles migration of anonymous rentals to authenticated user accounts
 */

import { FastifyInstance } from 'fastify';
import { sendUnauthorized, sendInternalError } from '../lib/response-helpers.js';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { rentals } from '../db/schema.js';
import { requireAuthOrAnonymous, getUserContext } from '../lib/auth-middleware.js';
import { validateBody, migrationSchema } from '../lib/validation.js';

export default async function rentalMigrationRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/rentals/migrate
   * Migrate anonymous rentals to authenticated user
   * Called automatically after first login/registration
   */
  fastify.post('/rentals/migrate', { preHandler: requireAuthOrAnonymous }, async (request, reply) => {
    const body = validateBody(migrationSchema, request.body, reply);
    if (!body) return;
    
    const { anonymousId: bodyAnonymousId } = body;
    const { userId } = getUserContext(request);
    
    // Must be authenticated to migrate
    if (!userId) {
      return sendUnauthorized(reply, 'Authentication required to migrate data');
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
      return sendInternalError(reply, 'Failed to migrate rentals');
    }
  });
}
