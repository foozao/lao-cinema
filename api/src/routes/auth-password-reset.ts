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
import { validatePassword } from '../lib/auth-utils.js';
import { checkRateLimit, recordAttempt, RATE_LIMITS } from '../lib/rate-limiter.js';
import { validateBody, validateQuery, forgotPasswordSchema, resetPasswordSchema, nonEmptyString } from '../lib/validation.js';
import { z } from 'zod';

const forgotPasswordBodySchema = forgotPasswordSchema.extend({
  locale: z.enum(['en', 'lo']).optional(),
});

const tokenQuerySchema = z.object({
  token: nonEmptyString,
});

export default async function authPasswordResetRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /api/auth/forgot-password
   * Request a password reset email
   */
  fastify.post('/auth/forgot-password', async (request, reply) => {
    const body = validateBody(forgotPasswordBodySchema, request.body, reply);
    if (!body) return;
    
    const { email, locale } = body;
    
    // Check rate limit
    const ipAddress = request.ip;
    const rateLimitCheck = checkRateLimit('forgot-password', ipAddress, RATE_LIMITS.FORGOT_PASSWORD);
    
    if (!rateLimitCheck.allowed) {
      const now = new Date();
      const retryAfter = rateLimitCheck.retryAfter!;
      const minutesRemaining = Math.ceil((retryAfter.getTime() - now.getTime()) / (60 * 1000));
      
      return reply.code(429).send({
        error: `Too many password reset attempts. Please wait ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''} before trying again.`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: rateLimitCheck.retryAfter,
        minutesRemaining,
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
    const body = validateBody(resetPasswordSchema, request.body, reply);
    if (!body) return;
    
    const { token, newPassword } = body;
    
    // Additional password policy validation
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return sendBadRequest(reply, 'Invalid password', passwordValidation.errors);
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
    const query = validateQuery(tokenQuerySchema, request.query, reply);
    if (!query) return;
    
    const { token } = query;
    
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
