/**
 * Authentication Registration Routes
 * 
 * Handles user registration.
 */

import { FastifyInstance, FastifyReply } from 'fastify';
import { sendBadRequest, sendConflict, sendInternalError, sendCreated } from '../lib/response-helpers.js';
import { 
  createUser, 
  findUserByEmail,
  createSession,
} from '../lib/auth-service.js';
import { validatePassword } from '../lib/auth-utils.js';
import { validateBody, registerSchema } from '../lib/validation.js';

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
  
  if (isProduction) {
    cookieOptions.push('Secure');
  }
  
  reply.header('Set-Cookie', cookieOptions.join('; '));
}

export default async function authRegistrationRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/auth/register
   * Register a new user with email/password
   */
  fastify.post('/auth/register', async (request, reply) => {
    // Validate input with Zod
    const body = validateBody(registerSchema, request.body, reply);
    if (!body) return;
    
    const { email, password, displayName } = body;
    
    // Additional password policy validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return sendBadRequest(reply, 'Invalid password', passwordValidation.errors);
    }
    
    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return sendConflict(reply, 'User with this email already exists');
    }
    
    try {
      // Create user
      const user = await createUser({
        email,
        password,
        displayName,
      });
      
      // Create session
      const session = await createSession(
        user.id,
        request.ip,
        request.headers['user-agent']
      );
      
      // Set HttpOnly cookie for web clients
      setSessionCookie(reply, session.token, session.expiresAt);
      
      // Return user and session (token still returned for mobile clients)
      return sendCreated(reply, {
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
      request.log.error({ error }, 'Registration failed');
      return sendInternalError(reply, 'Failed to create user');
    }
  });
}
