/**
 * Anonymous ID Routes
 * 
 * Handles generation of cryptographically signed anonymous IDs.
 */

import { FastifyInstance } from 'fastify';
import { generateAnonymousId } from '../lib/anonymous-id.js';

export default async function anonymousIdRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/anonymous-id
   * Generate a new signed anonymous ID
   * 
   * No authentication required - this is how users get their initial anonymous ID.
   */
  fastify.post('/anonymous-id', async (request, reply) => {
    try {
      const signedId = generateAnonymousId();
      
      return reply.send({
        anonymousId: signedId,
        expiresInDays: 90,
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to generate anonymous ID');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to generate anonymous ID',
      });
    }
  });
}
