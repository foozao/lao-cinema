/**
 * Authentication Registration Routes
 * 
 * Handles user registration.
 */

import { FastifyInstance } from 'fastify';
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
      
      // Return user and session
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
