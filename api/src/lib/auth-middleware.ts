/**
 * Authentication Middleware
 * 
 * Fastify middleware for handling authentication and authorization.
 * Supports both session-based auth (for authenticated users) and anonymous ID tracking.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { findSessionByToken } from './auth-service.js';
import type { User } from '../db/schema.js';

// =============================================================================
// TYPE EXTENSIONS
// =============================================================================

declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
    userId?: string;
    anonymousId?: string;
  }
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Extract user from session token (optional)
 * Adds user to request if valid session token is provided
 * Does not block request if no token is provided
 */
export async function optionalAuth(request: FastifyRequest, reply: FastifyReply) {
  // Try to get token from Authorization header
  const authHeader = request.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
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
  
  // Extract anonymous ID from header (for anonymous users)
  const anonymousId = request.headers['x-anonymous-id'] as string;
  if (anonymousId) {
    request.anonymousId = anonymousId;
  }
}

/**
 * Require authenticated user
 * Blocks request if no valid session token is provided
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }
  
  const token = authHeader.substring(7);
  
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
