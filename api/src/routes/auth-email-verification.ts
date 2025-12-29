/**
 * Authentication Email Verification Routes
 * 
 * Handles email verification flows.
 */

import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendInternalError } from '../lib/response-helpers.js';
import { 
  createEmailVerificationToken,
  findValidEmailVerificationToken,
  verifyUserEmail,
} from '../lib/auth-service.js';
import { sendEmailVerificationEmail } from '../lib/email-service.js';
import { requireAuth } from '../lib/auth-middleware.js';

export default async function authEmailVerificationRoutes(fastify: FastifyInstance) {

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
