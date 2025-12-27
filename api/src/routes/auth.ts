/**
 * Authentication Routes
 * 
 * Handles user registration, login, logout, and profile management.
 * Designed to be extensible for OAuth providers (Google, Apple).
 */

import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendUnauthorized, sendForbidden, sendNotFound, sendConflict, sendInternalError, sendCreated } from '../lib/response-helpers.js';
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
  updateUserEmail,
  deleteUser,
  createPasswordResetToken,
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
  createEmailVerificationToken,
  findValidEmailVerificationToken,
  verifyUserEmail,
} from '../lib/auth-service.js';
import { sendPasswordResetEmail, sendEmailVerificationEmail } from '../lib/email-service.js';
import { 
  isValidEmail, 
  isValidPassword, 
  validatePassword,
  verifyPassword,
} from '../lib/auth-utils.js';
import { requireAuth } from '../lib/auth-middleware.js';
import { checkRateLimit, recordAttempt, resetRateLimit, RATE_LIMITS } from '../lib/rate-limiter.js';

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
  
  // =============================================================================
  // PROFILE MANAGEMENT
  // =============================================================================
  
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
  
  // =============================================================================
  // PASSWORD RESET (FORGOT PASSWORD)
  // =============================================================================
  
  /**
   * POST /api/auth/forgot-password
   * Request a password reset email
   */
  fastify.post('/auth/forgot-password', async (request, reply) => {
    const { email, locale } = request.body as {
      email: string;
      locale?: 'en' | 'lo';
    };
    
    // Validate input
    if (!email) {
      return sendBadRequest(reply, 'Email is required');
    }
    
    if (!isValidEmail(email)) {
      return sendBadRequest(reply, 'Invalid email format');
    }
    
    // Check rate limit
    const ipAddress = request.ip;
    const rateLimitCheck = checkRateLimit('forgot-password', ipAddress, RATE_LIMITS.FORGOT_PASSWORD);
    
    if (!rateLimitCheck.allowed) {
      return reply.code(429).send({
        error: 'Too many password reset requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: rateLimitCheck.retryAfter,
      });
    }
    
    // Record attempt (do this early to prevent enumeration via timing)
    recordAttempt('forgot-password', ipAddress, RATE_LIMITS.FORGOT_PASSWORD);
    
    try {
      // Find user by email
      const user = await findUserByEmail(email);
      
      // Always return success to prevent email enumeration attacks
      // Even if user doesn't exist or is OAuth-only
      if (!user || !user.passwordHash) {
        request.log.info({ email }, 'Password reset requested for non-existent or OAuth user');
        return reply.send({
          success: true,
          message: 'If an account exists with this email, a password reset link will be sent.',
        });
      }
      
      // Create password reset token
      const resetToken = await createPasswordResetToken(user.id);
      
      // Send password reset email
      const emailResult = await sendPasswordResetEmail(
        user.email,
        resetToken.token,
        locale || 'en'
      );
      
      if (!emailResult.success) {
        request.log.error({ error: emailResult.error }, 'Failed to send password reset email');
        // Still return success to prevent enumeration
      } else {
        request.log.info({ email: user.email }, 'Password reset email sent');
      }
      
      return reply.send({
        success: true,
        message: 'If an account exists with this email, a password reset link will be sent.',
      });
    } catch (error) {
      request.log.error({ error }, 'Password reset request failed');
      return sendInternalError(reply, 'Failed to process password reset request');
    }
  });
  
  /**
   * POST /api/auth/reset-password
   * Reset password using a valid token
   */
  fastify.post('/auth/reset-password', async (request, reply) => {
    const { token, newPassword } = request.body as {
      token: string;
      newPassword: string;
    };
    
    // Validate input
    if (!token || !newPassword) {
      return sendBadRequest(reply, 'Token and new password are required');
    }
    
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return sendBadRequest(reply, 'Invalid password', passwordValidation.errors,
      );
    }
    
    try {
      // Find and validate the reset token
      const resetTokenData = await findValidPasswordResetToken(token);
      
      if (!resetTokenData) {
        return sendBadRequest(reply, 'Invalid or expired reset token. Please request a new password reset.');
      }
      
      // Update the user's password
      await updateUserPassword(resetTokenData.userId, newPassword);
      
      // Mark the token as used
      await markPasswordResetTokenUsed(resetTokenData.id);
      
      // Optionally: Delete all existing sessions to force re-login
      await deleteAllUserSessions(resetTokenData.userId);
      
      request.log.info({ userId: resetTokenData.userId }, 'Password reset successfully');
      
      return reply.send({
        success: true,
        message: 'Password has been reset successfully. Please log in with your new password.',
      });
    } catch (error) {
      request.log.error({ error }, 'Password reset failed');
      return sendInternalError(reply, 'Failed to reset password');
    }
  });
  
  /**
   * GET /api/auth/verify-reset-token
   * Verify if a password reset token is valid (for frontend validation)
   */
  fastify.get('/auth/verify-reset-token', async (request, reply) => {
    const { token } = request.query as { token: string };
    
    if (!token) {
      return sendBadRequest(reply, 'Token is required');
    }
    
    try {
      const resetTokenData = await findValidPasswordResetToken(token);
      
      return reply.send({
        valid: !!resetTokenData,
      });
    } catch (error) {
      request.log.error({ error }, 'Token verification failed');
      return sendInternalError(reply, 'Failed to verify token');
    }
  });

  // =============================================================================
  // EMAIL VERIFICATION
  // =============================================================================

  /**
   * POST /api/auth/send-verification-email
   * Send email verification link to logged-in user
   */
  fastify.post('/auth/send-verification-email', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = (request as any).user;
    const { locale } = request.body as { locale?: 'en' | 'lo' };
    
    // Check if already verified
    if (user.emailVerified) {
      return sendBadRequest(reply, 'Email is already verified');
    }
    
    try {
      // Create verification token
      const verificationToken = await createEmailVerificationToken(user.id);
      
      // Send verification email
      const emailResult = await sendEmailVerificationEmail(
        user.email,
        verificationToken.token,
        locale || 'en'
      );
      
      if (!emailResult.success) {
        request.log.error({ error: emailResult.error }, 'Failed to send verification email');
        return sendInternalError(reply, 'Failed to send verification email');
      }
      
      return reply.send({
        success: true,
        message: 'Verification email sent',
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to send verification email');
      return sendInternalError(reply, 'Failed to send verification email');
    }
  });

  /**
   * POST /api/auth/verify-email
   * Verify email with token from email link
   */
  fastify.post('/auth/verify-email', async (request, reply) => {
    const { token } = request.body as { token: string };
    
    if (!token) {
      return sendBadRequest(reply, 'Token is required');
    }
    
    try {
      // Find valid token
      const tokenData = await findValidEmailVerificationToken(token);
      
      if (!tokenData) {
        return sendBadRequest(reply, 'Invalid or expired verification link');
      }
      
      // Verify email
      const updatedUser = await verifyUserEmail(tokenData.token.id, tokenData.user.id);
      
      return reply.send({
        success: true,
        message: 'Email verified successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          displayName: updatedUser.displayName,
          emailVerified: updatedUser.emailVerified,
        },
      });
    } catch (error) {
      request.log.error({ error }, 'Email verification failed');
      return sendInternalError(reply, 'Failed to verify email');
    }
  });

  /**
   * GET /api/auth/verify-email-token
   * Check if email verification token is valid (before showing form)
   */
  fastify.get('/auth/verify-email-token', async (request, reply) => {
    const { token } = request.query as { token: string };
    
    if (!token) {
      return sendBadRequest(reply, 'Token is required');
    }
    
    try {
      const tokenData = await findValidEmailVerificationToken(token);
      
      return reply.send({
        valid: !!tokenData,
      });
    } catch (error) {
      request.log.error({ error }, 'Token verification failed');
      return sendInternalError(reply, 'Failed to verify token');
    }
  });
}
