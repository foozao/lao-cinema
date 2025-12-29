/**
 * Authentication Profile Routes
 * 
 * Handles profile viewing and management (get, update, password change, email change, delete).
 */

import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendUnauthorized, sendNotFound, sendConflict, sendInternalError } from '../lib/response-helpers.js';
import { 
  findUserByEmail,
  findUserById,
  updateUser,
  updateUserPassword,
  updateUserEmail,
  deleteUser,
} from '../lib/auth-service.js';
import { 
  isValidEmail, 
  validatePassword,
  verifyPassword,
} from '../lib/auth-utils.js';
import { requireAuth } from '../lib/auth-middleware.js';

export default async function authProfileRoutes(fastify: FastifyInstance) {
  
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
        timezone: request.user!.timezone,
        preferredSubtitleLanguage: request.user!.preferredSubtitleLanguage,
        alwaysShowSubtitles: request.user!.alwaysShowSubtitles,
        role: request.user!.role,
        emailVerified: request.user!.emailVerified,
        createdAt: request.user!.createdAt,
        lastLoginAt: request.user!.lastLoginAt,
      },
    });
  });
  
  /**
   * PATCH /api/auth/me
   * Update current user profile
   */
  fastify.patch('/auth/me', { preHandler: requireAuth }, async (request, reply) => {
    const { displayName, profileImageUrl, timezone, preferredSubtitleLanguage, alwaysShowSubtitles } = request.body as {
      displayName?: string;
      profileImageUrl?: string;
      timezone?: string;
      preferredSubtitleLanguage?: string | null;
      alwaysShowSubtitles?: boolean;
    };
    
    try {
      const user = await updateUser(request.userId!, {
        displayName,
        profileImageUrl,
        timezone,
        preferredSubtitleLanguage,
        alwaysShowSubtitles,
      });
      
      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          profileImageUrl: user.profileImageUrl,
          timezone: user.timezone,
          preferredSubtitleLanguage: user.preferredSubtitleLanguage,
          alwaysShowSubtitles: user.alwaysShowSubtitles,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      request.log.error({ error }, 'Profile update failed');
      return sendInternalError(reply, 'Failed to update profile');
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
      return sendBadRequest(reply, 'Current password and new password are required');
    }
    
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return sendBadRequest(reply, 'Invalid new password', passwordValidation.errors,
      );
    }
    
    try {
      // Verify current password
      const user = await findUserById(request.userId!);
      
      if (!user || !user.passwordHash) {
        return sendBadRequest(reply, 'Cannot change password for OAuth-only accounts');
      }
      
      const isValid = await verifyPassword(currentPassword, user.passwordHash);
      
      if (!isValid) {
        return sendUnauthorized(reply, 'Current password is incorrect');
      }
      
      // Update password
      await updateUserPassword(request.userId!, newPassword);
      
      return reply.send({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      request.log.error({ error }, 'Password change failed');
      return sendInternalError(reply, 'Failed to change password');
    }
  });
  
  /**
   * PATCH /api/auth/me/email
   * Change email address
   * Requires password confirmation and resets email verified status
   */
  fastify.patch('/auth/me/email', { preHandler: requireAuth }, async (request, reply) => {
    const { newEmail, password } = request.body as {
      newEmail: string;
      password: string;
    };
    
    // Validate input
    if (!newEmail || !password) {
      return sendBadRequest(reply, 'New email and password are required');
    }
    
    if (!isValidEmail(newEmail)) {
      return sendBadRequest(reply, 'Invalid email format');
    }
    
    try {
      // Verify password
      const user = await findUserById(request.userId!);
      
      if (!user || !user.passwordHash) {
        return sendBadRequest(reply, 'Cannot change email for OAuth-only accounts');
      }
      
      const isValid = await verifyPassword(password, user.passwordHash);
      
      if (!isValid) {
        return sendUnauthorized(reply, 'Password is incorrect');
      }
      
      // Check if new email is same as current
      if (user.email.toLowerCase() === newEmail.toLowerCase()) {
        return sendBadRequest(reply, 'New email must be different from current email');
      }
      
      // Check if email is already in use
      const existingUser = await findUserByEmail(newEmail);
      if (existingUser) {
        return sendConflict(reply, 'Email is already in use');
      }
      
      // Update email (this also resets emailVerified to false)
      const updatedUser = await updateUserEmail(request.userId!, newEmail);
      
      return reply.send({
        success: true,
        message: 'Email changed successfully. Please verify your new email address.',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          displayName: updatedUser.displayName,
          profileImageUrl: updatedUser.profileImageUrl,
          timezone: updatedUser.timezone,
          role: updatedUser.role,
          emailVerified: updatedUser.emailVerified,
          createdAt: updatedUser.createdAt,
        },
      });
    } catch (error) {
      request.log.error({ error }, 'Email change failed');
      return sendInternalError(reply, 'Failed to change email');
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
      return sendBadRequest(reply, 'Password is required to delete account');
    }
    
    try {
      const user = await findUserById(request.userId!);
      
      if (!user) {
        return sendNotFound(reply, 'User not found');
      }
      
      // For OAuth-only users, skip password check
      if (user.passwordHash) {
        const isValid = await verifyPassword(password, user.passwordHash);
        
        if (!isValid) {
          return sendUnauthorized(reply, 'Password is incorrect');
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
      return sendInternalError(reply, 'Failed to delete account');
    }
  });
}
