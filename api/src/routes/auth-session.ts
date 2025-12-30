/**
 * Authentication Session Routes
 * 
 * Handles login, logout, and session management.
 */

import { FastifyInstance, FastifyReply } from 'fastify';
import { sendBadRequest, sendUnauthorized, sendInternalError } from '../lib/response-helpers.js';
import { 
  authenticateUser, 
  createSession,
  deleteSession,
  deleteAllUserSessions,
} from '../lib/auth-service.js';
import { requireAuth } from '../lib/auth-middleware.js';
import { checkRateLimit, recordAttempt, resetRateLimit, RATE_LIMITS } from '../lib/rate-limiter.js';
import { validateBody, loginSchema } from '../lib/validation.js';

// Cookie configuration
const SESSION_COOKIE_NAME = 'session';
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Set HttpOnly session cookie
 */
function setSessionCookie(reply: FastifyReply, token: string, expiresAt: Date): void {
  const cookieOptions = [
    `${SESSION_COOKIE_NAME}=${token}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Expires=${expiresAt.toUTCString()}`,
  ];
  
  // Only set Secure flag in production (HTTPS required)
  if (isProduction) {
    cookieOptions.push('Secure');
  }
  
  reply.header('Set-Cookie', cookieOptions.join('; '));
}

/**
 * Clear session cookie
 */
function clearSessionCookie(reply: FastifyReply): void {
  const cookieOptions = [
    `${SESSION_COOKIE_NAME}=`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
  ];
  
  if (isProduction) {
    cookieOptions.push('Secure');
  }
  
  reply.header('Set-Cookie', cookieOptions.join('; '));
}

export default async function authSessionRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/auth/login
   * Login with email/password
   */
  fastify.post('/auth/login', async (request, reply) => {
    // Validate input with Zod
    const body = validateBody(loginSchema, request.body, reply);
    if (!body) return;
    
    const { email, password } = body;
    
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
      
      // Set HttpOnly cookie for web clients
      setSessionCookie(reply, session.token, session.expiresAt);
      
      // Return user and session (token still returned for mobile clients)
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
    // Extract token from cookie or Authorization header
    let token: string | null = null;
    
    // Check cookie first
    const cookieHeader = request.headers.cookie;
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        if (key && value) acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      token = cookies[SESSION_COOKIE_NAME] || null;
    }
    
    // Fall back to Authorization header
    if (!token) {
      const authHeader = request.headers.authorization;
      token = authHeader?.substring(7) || null;
    }
    
    if (!token) {
      return sendBadRequest(reply, 'No session token provided');
    }
    
    try {
      await deleteSession(token);
      
      // Clear the cookie
      clearSessionCookie(reply);
      
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
      
      // Clear the cookie
      clearSessionCookie(reply);
      
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
