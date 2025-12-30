/**
 * CSRF Protection Middleware
 * 
 * Implements double-submit cookie pattern:
 * 1. Server sets a CSRF token in a non-HttpOnly cookie
 * 2. Client reads cookie and sends token in X-CSRF-Token header
 * 3. Server validates header matches cookie on state-changing requests
 * 
 * This protects against CSRF attacks when using HttpOnly session cookies.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';

// =============================================================================
// CONSTANTS
// =============================================================================

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32; // bytes

// Methods that don't require CSRF protection (safe methods)
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Routes that don't require CSRF protection (public endpoints)
const EXEMPT_ROUTES = new Set([
  '/health',
  '/robots.txt',
]);

const isProduction = process.env.NODE_ENV === 'production';

// =============================================================================
// TOKEN GENERATION
// =============================================================================

/**
 * Generate a cryptographically secure random CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Extract CSRF token from cookie header
 */
function getCsrfTokenFromCookie(request: FastifyRequest): string | null {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  return cookies[CSRF_COOKIE_NAME] || null;
}

/**
 * Extract CSRF token from request header
 */
function getCsrfTokenFromHeader(request: FastifyRequest): string | null {
  return request.headers[CSRF_HEADER_NAME] as string || null;
}

/**
 * Set CSRF token cookie
 */
export function setCsrfTokenCookie(reply: FastifyReply, token: string): void {
  const cookieOptions = [
    `${CSRF_COOKIE_NAME}=${token}`,
    `Path=/`,
    `SameSite=Lax`,
    // Note: NOT HttpOnly - client needs to read this
  ];

  // Only set Secure flag in production (HTTPS required)
  if (isProduction) {
    cookieOptions.push('Secure');
  }

  reply.header('Set-Cookie', cookieOptions.join('; '));
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * CSRF Protection Middleware
 * 
 * Ensures CSRF token is present and validates it for state-changing requests.
 * Automatically sets token cookie if not present.
 */
export async function csrfProtection(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const method = request.method;
  const path = request.url.split('?')[0]; // Remove query params

  // Skip CSRF check for exempt routes
  if (EXEMPT_ROUTES.has(path)) {
    return;
  }

  // Skip CSRF check for safe methods (GET, HEAD, OPTIONS)
  if (SAFE_METHODS.has(method)) {
    // Still ensure CSRF token cookie exists for future requests
    const existingToken = getCsrfTokenFromCookie(request);
    if (!existingToken) {
      const newToken = generateCsrfToken();
      setCsrfTokenCookie(reply, newToken);
    }
    return;
  }

  // For state-changing methods (POST, PUT, PATCH, DELETE), validate CSRF token
  const cookieToken = getCsrfTokenFromCookie(request);
  const headerToken = getCsrfTokenFromHeader(request);

  // Both tokens must be present
  if (!cookieToken || !headerToken) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'CSRF token missing',
      code: 'CSRF_TOKEN_MISSING',
    });
  }

  // Tokens must match (constant-time comparison to prevent timing attacks)
  if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'CSRF token invalid',
      code: 'CSRF_TOKEN_INVALID',
    });
  }

  // Valid CSRF token - allow request to proceed
}

/**
 * Optional middleware to ensure CSRF token exists
 * Useful for initial page loads to set the token cookie
 */
export async function ensureCsrfToken(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const existingToken = getCsrfTokenFromCookie(request);
  if (!existingToken) {
    const newToken = generateCsrfToken();
    setCsrfTokenCookie(reply, newToken);
  }
}
