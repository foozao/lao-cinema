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
import { 
  isValidEmail, 
  validatePassword,
} from '../lib/auth-utils.js';

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
    const { email, password, displayName } = request.body as {
      email: string;
      password: string;
      displayName?: string;
    };
    
    // Validate input
    if (!email || !password) {
      return sendBadRequest(reply, 'Email and password are required');
    }
    
    if (!isValidEmail(email)) {
      return sendBadRequest(reply, 'Invalid email format');
    }
    
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return sendBadRequest(reply, 'Invalid password', passwordValidation.errors,
      );
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
