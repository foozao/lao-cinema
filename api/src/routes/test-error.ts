import { FastifyInstance } from 'fastify';
import { captureError } from '../lib/sentry.js';

export default async function testErrorRoutes(fastify: FastifyInstance) {
  // Test endpoint that deliberately throws an error
  fastify.get('/test-error', async (request, reply) => {
    try {
      // Intentionally throw an error
      throw new Error('Test error from Fastify API');
    } catch (error) {
      // Capture the error with Sentry
      captureError(error as Error, {
        endpoint: '/test-error',
        method: 'GET',
        timestamp: new Date().toISOString(),
      });
      
      // Return error response
      return reply.status(500).send({
        message: 'Fastify API error sent to Sentry! Check your dashboard.',
        error: 'Test error triggered successfully',
      });
    }
  });
}
