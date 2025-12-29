/**
 * Authentication Session Routes
 * 
 * Handles login, logout, and session management.
 */

import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendUnauthorized, sendInternalError } from '../lib/response-helpers.js';
import { 
  authenticateUser, 
  createSession,
  deleteSession,
  deleteAllUserSessions,
} from '../lib/auth-service.js';
import { requireAuth } from '../lib/auth-middleware.js';
import { checkRateLimit, recordAttempt, resetRateLimit, RATE_LIMITS } from '../lib/rate-limiter.js';

export default async function authSessionRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/auth/login
   * Login with email/password
   */
  fastify.post('/auth/login', async (request, reply) => {
    const { email, password } = request.body as {
      email: string;
      password: string;
    };
    
    // Validate input
    if (!email || !password) {
      return sendBadRequest(reply, 'Email and password are required');
    }
    
    // Check rate limit
    const ipAddress = request.ip;
    const rateLimitCheck = checkRateLimit('login', ipAddress, RATE_LIMITS.LOGIN);
    
    if (!rateLimitCheck.allowed) {
      return reply.code(429).send({
        error: 'Too many login attempts. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: rateLimitCheck.retryAfter,
      });
    }
    
    try {
      // Authenticate user
      const user = await authenticateUser(email, password);
      
      if (!user) {
        // Record failed attempt
        recordAttempt('login', ipAddress, RATE_LIMITS.LOGIN);
        return sendUnauthorized(reply, 'Invalid email or password');
      }
      
      // Reset rate limit on successful login
      resetRateLimit('login', ipAddress);
      
      // Create session
      const session = await createSession(
        user.id,
        request.ip,
        request.headers['user-agent']
      );
      
      // Return user and session
      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          profileImageUrl: user.profileImageUrl,
          timezone: user.timezone,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
        session: {
          token: session.token,
          expiresAt: session.expiresAt,
        },
      });
    } catch (error) {
      request.log.error({ error }, 'Login failed');
      return sendInternalError(reply, 'Login failed');
    }
  });
  
  /**
   * POST /api/auth/logout
   * Logout (delete current session)
   */
  fastify.post('/auth/logout', { preHandler: requireAuth }, async (request, reply) => {
    const authHeader = request.headers.authorization;
    const token = authHeader?.substring(7);
    
    if (!token) {
      return sendBadRequest(reply, 'No session token provided');
    }
    
    try {
      await deleteSession(token);
      
      return reply.send({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      request.log.error({ error }, 'Logout failed');
      return sendInternalError(reply, 'Logout failed');
    }
  });
  
  /**
   * POST /api/auth/logout-all
   * Logout from all devices (delete all sessions)
   */
  fastify.post('/auth/logout-all', { preHandler: requireAuth }, async (request, reply) => {
    try {
      await deleteAllUserSessions(request.userId!);
      
      return reply.send({
        success: true,
        message: 'Logged out from all devices',
      });
    } catch (error) {
      request.log.error({ error }, 'Logout all failed');
      return sendInternalError(reply, 'Logout failed');
    }
  });
}
