/**
 * Authentication Password Reset Routes
 * 
 * Handles forgot password and password reset flows.
 */

import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendInternalError } from '../lib/response-helpers.js';
import { 
  findUserByEmail,
  createPasswordResetToken,
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
  updateUserPassword,
  deleteAllUserSessions,
} from '../lib/auth-service.js';
import { sendPasswordResetEmail } from '../lib/email-service.js';
import { 
  isValidEmail, 
  validatePassword,
} from '../lib/auth-utils.js';
import { checkRateLimit, recordAttempt, RATE_LIMITS } from '../lib/rate-limiter.js';

export default async function authPasswordResetRoutes(fastify: FastifyInstance) {
  
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
}
