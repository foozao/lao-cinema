/**
 * Trailer Token Routes
 * Generate signed URLs for trailer streaming (no rental validation)
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { trailers } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { generateTrailerToken } from '../lib/trailer-token.js';
import { requireAuthOrAnonymous } from '../lib/auth-middleware.js';
import { checkRateLimit, recordAttempt, RATE_LIMITS } from '../lib/rate-limiter.js';
import { sendBadRequest, sendNotFound } from '../lib/response-helpers.js';

const trailerTokenRequestSchema = z.object({
  trailerId: z.string().uuid(),
});

export default async function trailerTokenRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/trailer-tokens
   * Generate a signed URL for trailer streaming
   * No rental validation required (trailers are marketing content)
   */
  fastify.post(
    '/trailer-tokens',
    {
      preHandler: requireAuthOrAnonymous,
    },
    async (request, reply) => {
      const { userId, anonymousId } = request;

      // Rate limiting: use userId or anonymousId as identifier
      const rateLimitIdentifier = userId || anonymousId || request.ip;
      const rateLimitCheck = checkRateLimit('trailer-token', rateLimitIdentifier, RATE_LIMITS.TRAILER_TOKEN);
      
      if (!rateLimitCheck.allowed) {
        const retryAfterSeconds = rateLimitCheck.retryAfter 
          ? Math.ceil((rateLimitCheck.retryAfter.getTime() - Date.now()) / 1000) 
          : 60;
        
        return reply
          .status(429)
          .header('Retry-After', retryAfterSeconds.toString())
          .send({
            type: 'about:blank',
            title: 'Too Many Requests',
            status: 429,
            detail: `Rate limit exceeded. Please try again in ${retryAfterSeconds} seconds.`,
            code: 'RATE_LIMIT_EXCEEDED',
          });
      }
      
      // Record this attempt
      recordAttempt('trailer-token', rateLimitIdentifier, RATE_LIMITS.TRAILER_TOKEN);

      // Parse and validate request
      const parseResult = trailerTokenRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendBadRequest(reply, 'Invalid request body', parseResult.error.errors);
      }

      const { trailerId } = parseResult.data;

      // 1. Verify the trailer exists
      const [trailer] = await db
        .select()
        .from(trailers)
        .where(eq(trailers.id, trailerId))
        .limit(1);

      if (!trailer) {
        return sendNotFound(reply, 'Trailer not found');
      }

      // Only generate tokens for self-hosted video trailers
      if (trailer.type !== 'video') {
        return sendBadRequest(reply, 'Trailer tokens are only for self-hosted videos');
      }

      // 2. Extract or build trailer path from video URL
      // Supports:
      //   - Full URL: "http://localhost:3002/trailers/hls/chanthaly/master.m3u8"
      //   - Relative with /trailers/: "/trailers/hls/chanthaly/master.m3u8"
      //   - Slug only: "chanthaly" -> builds to "trailers/hls/chanthaly/master.m3u8"
      const videoUrl = trailer.videoUrl;
      if (!videoUrl) {
        return sendBadRequest(reply, 'Trailer has no video URL');
      }

      let trailerPath: string;

      if (videoUrl.includes('/trailers/')) {
        // Extract path after /trailers/
        const parts = videoUrl.split('/trailers/');
        trailerPath = `trailers/${parts[1]}`;
      } else if (videoUrl.startsWith('http')) {
        // Full URL without /trailers/ - extract just the path
        const url = new URL(videoUrl);
        const pathWithoutLeadingSlash = url.pathname.replace(/^\//, '');
        trailerPath = `trailers/${pathWithoutLeadingSlash}`;
      } else if (!videoUrl.includes('/') && !videoUrl.includes('.')) {
        // Just a slug (e.g., "chanthaly") - build full HLS path
        // Trailers follow same structure as videos: hls/{slug}/master.m3u8
        trailerPath = `trailers/hls/${videoUrl}/master.m3u8`;
      } else {
        // Relative path - assume it's already in the trailers directory
        trailerPath = `trailers/${videoUrl}`;
      }

      // 3. Generate signed token (2-hour expiry, no rental check)
      const token = generateTrailerToken({
        trailerId,
        movieId: trailer.movieId,
        userId,
        anonymousId,
        trailerPath,
      });

      // 4. Return signed URL
      const videoBaseUrl = process.env.VIDEO_SERVER_URL || 'http://localhost:3002';
      const signedUrl = `${videoBaseUrl}/${trailerPath}?token=${token}`;

      return reply.send({
        url: signedUrl,
        expiresIn: 7200, // 2 hours in seconds
      });
    }
  );

  /**
   * GET /api/trailer-tokens/validate?token=...
   * Validate a trailer token (used by video server)
   */
  fastify.get('/trailer-tokens/validate', async (request, reply) => {
    const { token } = request.query as { token: string };
    
    if (!token) {
      return reply.status(400).send({
        type: 'about:blank',
        title: 'Bad Request',
        status: 400,
        detail: 'Token parameter is required',
      });
    }

    try {
      const { verifyTrailerToken } = await import('../lib/trailer-token.js');
      const payload = verifyTrailerToken(token);

      // Token is valid, return payload for video server to use
      return reply.send({
        valid: true,
        payload,
      });
    } catch (error: any) {
      // Token is invalid or expired
      return reply.status(401).send({
        valid: false,
        error: error.message || 'Invalid or expired token',
      });
    }
  });
}
