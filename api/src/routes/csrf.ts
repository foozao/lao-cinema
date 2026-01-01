/**
 * CSRF Token Routes
 * 
 * Provides endpoint to get CSRF token for cross-origin requests.
 * The token is returned in the response body since cross-origin
 * cookies cannot be read via document.cookie.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateCsrfToken, setCsrfTokenCookie } from '../lib/csrf-protection.js';

export default async function csrfRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/csrf
   * Get a CSRF token for cross-origin requests.
   * Sets the token as a cookie AND returns it in the response body.
   */
  fastify.get('/csrf', async (request: FastifyRequest, reply: FastifyReply) => {
    // Check if token already exists in cookie
    const cookieHeader = request.headers.cookie || '';
    const existingToken = cookieHeader
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('csrf_token='))
      ?.split('=')[1];

    // Use existing token or generate new one
    const token = existingToken || generateCsrfToken();

    // Set/refresh the cookie
    if (!existingToken) {
      setCsrfTokenCookie(reply, token);
    }

    // Return token in response body for cross-origin access
    return { token };
  });
}
