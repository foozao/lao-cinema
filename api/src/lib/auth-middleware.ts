/**
 * Authentication Middleware
 * 
 * Fastify middleware for handling authentication and authorization.
 * Supports both session-based auth (for authenticated users) and anonymous ID tracking.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { findSessionByToken } from './auth-service.js';
import { User } from '../db/schema.js';
import { extractAnonymousId, isValidAnonymousId } from './anonymous-id.js';

// =============================================================================
// TYPE EXTENSIONS
// =============================================================================

declare module 'fastify' {
  interface FastifyRequest {
    user: User | undefined;
    userId?: string;
    anonymousId?: string;
  }
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Extract session token from request
 * Priority: 1. HttpOnly cookie (web), 2. Bearer token (mobile)
 */
function extractSessionToken(request: FastifyRequest): string | null {
  // 1. Check HttpOnly cookie first (web clients)
  const cookieHeader = request.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    if (cookies['session']) {
      return cookies['session'];
    }
  }
  
  // 2. Fall back to Authorization header (mobile clients)
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

/**
 * Extract user from session token (optional)
 * Adds user to request if valid session token is provided
 * Does not block request if no token is provided
 */
export async function optionalAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = extractSessionToken(request);
  
  if (token) {
    try {
      const session = await findSessionByToken(token);
      
      if (session) {
        request.user = session.user;
        request.userId = session.user.id;
      }
    } catch (error) {
      // Invalid token, but don't block request
      request.log.warn({ error }, 'Invalid session token');
    }
  }
  
  // Extract and validate anonymous ID from header (for anonymous users)
  const signedAnonymousId = request.headers['x-anonymous-id'] as string;
  if (signedAnonymousId) {
    // Validate the signed anonymous ID
    if (isValidAnonymousId(signedAnonymousId)) {
      // Extract the actual ID (UUID) for database operations
      try {
        request.anonymousId = extractAnonymousId(signedAnonymousId);
      } catch (error) {
        // Invalid or expired anonymous ID - ignore it
        request.log.warn({ error, signedAnonymousId }, 'Invalid anonymous ID provided');
      }
    } else {
      // Invalid anonymous ID format - log and ignore
      request.log.warn({ signedAnonymousId }, 'Anonymous ID failed validation');
    }
  }
}

/**
 * Require authenticated user
 * Blocks request if no valid session token is provided
 * Supports both HttpOnly cookie (web) and Bearer token (mobile)
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = extractSessionToken(request);
  
  if (!token) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }
  
  try {
    const session = await findSessionByToken(token);
    
    if (!session) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired session',
      });
    }
    
    request.user = session.user;
    request.userId = session.user.id;
  } catch (error) {
    request.log.error({ error }, 'Authentication error');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
}

/**
 * Require admin role
 * Must be used after requireAuth
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }
  
  if (request.user.role !== 'admin') {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Admin access required',
    });
  }
}

/**
 * Require editor role (or higher)
 * Must be used after requireAuth
 * Allows both editors and admins
 */
export async function requireEditor(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }
  
  if (request.user.role !== 'editor' && request.user.role !== 'admin') {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Editor access required',
    });
  }
}

/**
 * Require editor or admin role
 * Self-contained middleware that authenticates and checks role
 */
export async function requireEditorOrAdmin(request: FastifyRequest, reply: FastifyReply) {
  // First authenticate
  await optionalAuth(request, reply);
  
  // Then check role
  if (!request.user) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }
  
  if (request.user.role !== 'editor' && request.user.role !== 'admin') {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Editor access required',
    });
  }
}

/**
 * Require either authenticated user OR anonymous ID
 * Used for dual-mode endpoints (rentals, watch progress)
 */
export async function requireAuthOrAnonymous(request: FastifyRequest, reply: FastifyReply) {
  // Try to authenticate first
  await optionalAuth(request, reply);
  
  // Check if we have either userId or anonymousId
  if (!request.userId && !request.anonymousId) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication or anonymous ID required',
    });
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get user context from request
 * Returns userId and anonymousId (whichever is available)
 */
export function getUserContext(request: FastifyRequest): {
  userId?: string;
  anonymousId?: string;
  isAuthenticated: boolean;
} {
  return {
    userId: request.userId,
    anonymousId: request.anonymousId,
    isAuthenticated: !!request.userId,
  };
}
