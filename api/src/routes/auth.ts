/**
 * Authentication Routes
 * 
 * Handles user registration, login, logout, and profile management.
 * Designed to be extensible for OAuth providers (Google, Apple).
 */

import { FastifyInstance } from 'fastify';
import { 
  createUser, 
  authenticateUser, 
  findUserByEmail,
  findUserById,
  createSession,
  deleteSession,
  deleteAllUserSessions,
  updateUser,
  updateUserPassword,
  deleteUser,
} from '../lib/auth-service.js';
import { 
  isValidEmail, 
  isValidPassword, 
  validatePassword,
  verifyPassword,
} from '../lib/auth-utils.js';
import { requireAuth } from '../lib/auth-middleware.js';

export default async function authRoutes(fastify: FastifyInstance) {
  
  // =============================================================================
  // REGISTRATION
  // =============================================================================
  
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
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Email and password are required',
      });
    }
    
    if (!isValidEmail(email)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid email format',
      });
    }
    
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid password',
        errors: passwordValidation.errors,
      });
    }
    
    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'User with this email already exists',
      });
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
      return reply.status(201).send({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          profileImageUrl: user.profileImageUrl,
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
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create user',
      });
    }
  });
  
  // =============================================================================
  // LOGIN
  // =============================================================================
  
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
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Email and password are required',
      });
    }
    
    try {
      // Authenticate user
      const user = await authenticateUser(email, password);
      
      if (!user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }
      
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
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Login failed',
      });
    }
  });
  
  // =============================================================================
  // LOGOUT
  // =============================================================================
  
  /**
   * POST /api/auth/logout
   * Logout (delete current session)
   */
  fastify.post('/auth/logout', { preHandler: requireAuth }, async (request, reply) => {
    const authHeader = request.headers.authorization;
    const token = authHeader?.substring(7);
    
    if (!token) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'No session token provided',
      });
    }
    
    try {
      await deleteSession(token);
      
      return reply.send({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      request.log.error({ error }, 'Logout failed');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Logout failed',
      });
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
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Logout failed',
      });
    }
  });
  
  // =============================================================================
  // CURRENT USER
  // =============================================================================
  
  /**
   * GET /api/auth/me
   * Get current user profile
   */
  fastify.get('/auth/me', { preHandler: requireAuth }, async (request, reply) => {
    return reply.send({
      user: {
        id: request.user!.id,
        email: request.user!.email,
        displayName: request.user!.displayName,
        profileImageUrl: request.user!.profileImageUrl,
        role: request.user!.role,
        emailVerified: request.user!.emailVerified,
        createdAt: request.user!.createdAt,
        lastLoginAt: request.user!.lastLoginAt,
      },
    });
  });
  
  // =============================================================================
  // PROFILE MANAGEMENT
  // =============================================================================
  
  /**
   * PATCH /api/auth/me
   * Update current user profile
   */
  fastify.patch('/auth/me', { preHandler: requireAuth }, async (request, reply) => {
    const { displayName, profileImageUrl } = request.body as {
      displayName?: string;
      profileImageUrl?: string;
    };
    
    try {
      const user = await updateUser(request.userId!, {
        displayName,
        profileImageUrl,
      });
      
      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          profileImageUrl: user.profileImageUrl,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      request.log.error({ error }, 'Profile update failed');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update profile',
      });
    }
  });
  
  /**
   * PATCH /api/auth/me/password
   * Change password
   */
  fastify.patch('/auth/me/password', { preHandler: requireAuth }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body as {
      currentPassword: string;
      newPassword: string;
    };
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Current password and new password are required',
      });
    }
    
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid new password',
        errors: passwordValidation.errors,
      });
    }
    
    try {
      // Verify current password
      const user = await findUserById(request.userId!);
      
      if (!user || !user.passwordHash) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Cannot change password for OAuth-only accounts',
        });
      }
      
      const isValid = await verifyPassword(currentPassword, user.passwordHash);
      
      if (!isValid) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Current password is incorrect',
        });
      }
      
      // Update password
      await updateUserPassword(request.userId!, newPassword);
      
      return reply.send({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      request.log.error({ error }, 'Password change failed');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to change password',
      });
    }
  });
  
  /**
   * DELETE /api/auth/me
   * Delete account
   */
  fastify.delete('/auth/me', { preHandler: requireAuth }, async (request, reply) => {
    const { password } = request.body as {
      password: string;
    };
    
    // Verify password before deletion
    if (!password) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Password is required to delete account',
      });
    }
    
    try {
      const user = await findUserById(request.userId!);
      
      if (!user) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
      }
      
      // For OAuth-only users, skip password check
      if (user.passwordHash) {
        const isValid = await verifyPassword(password, user.passwordHash);
        
        if (!isValid) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Password is incorrect',
          });
        }
      }
      
      // Delete user (cascades to sessions, rentals, etc.)
      await deleteUser(request.userId!);
      
      return reply.send({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      request.log.error({ error }, 'Account deletion failed');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete account',
      });
    }
  });
}
