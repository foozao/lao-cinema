import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendUnauthorized, sendForbidden, sendNotFound, sendConflict, sendInternalError, sendCreated } from '../lib/response-helpers.js';
import { z } from 'zod';
import { db } from '../db/index.js';
import { rentals, movies, videoSources, shortPackItems } from '../db/schema.js';
import { eq, and, gte, inArray } from 'drizzle-orm';
import { generateVideoToken } from '../lib/video-token.js';
import { requireAuthOrAnonymous } from '../lib/auth-middleware.js';

const requestSchema = z.object({
  movieId: z.string().uuid(),
  videoSourceId: z.string().uuid(),
});

export default async function videoTokenRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/video-tokens
   * Generate a signed URL for video streaming
   * Validates rental status before issuing token
   */
  fastify.post(
    '/video-tokens',
    {
      preHandler: requireAuthOrAnonymous,
    },
    async (request, reply) => {
      const { movieId, videoSourceId } = requestSchema.parse(request.body);
      const { userId, anonymousId } = request;

      // 1. Verify the video source exists and belongs to the movie
      const [videoSource] = await db
        .select()
        .from(videoSources)
        .where(
          and(
            eq(videoSources.id, videoSourceId),
            eq(videoSources.movieId, movieId)
          )
        )
        .limit(1);

      if (!videoSource) {
        return sendNotFound(reply, 'Video source not found');
      }

      // 2. Check rental validity (direct rental OR pack rental)
      const now = new Date();
      const userClause = userId
        ? eq(rentals.userId, userId)
        : eq(rentals.anonymousId, anonymousId!);

      // Check for direct movie rental
      const [directRental] = await db
        .select()
        .from(rentals)
        .where(
          and(
            eq(rentals.movieId, movieId),
            gte(rentals.expiresAt, now),
            userClause
          )
        )
        .limit(1);

      if (directRental) {
        // Valid direct rental found
      } else {
        // Check for pack rental that includes this movie
        const packItems = await db
          .select({ packId: shortPackItems.packId })
          .from(shortPackItems)
          .where(eq(shortPackItems.movieId, movieId));

        if (packItems.length > 0) {
          const packIds = packItems.map(p => p.packId);

          const [packRental] = await db
            .select()
            .from(rentals)
            .where(
              and(
                inArray(rentals.shortPackId, packIds),
                gte(rentals.expiresAt, now),
                userClause
              )
            )
            .limit(1);

          if (!packRental) {
            return sendForbidden(reply, 'No valid rental found', 'RENTAL_REQUIRED');
          }
        } else {
          // No pack rental found either
          return sendForbidden(reply, 'No valid rental found', 'RENTAL_REQUIRED');
        }
      }

      // 3. Construct video path
      // videoSource.url contains just the slug (e.g., "chanthaly")
      // We need to construct the full path: hls/{slug}/master.m3u8
      const movieSlug = videoSource.url;
      const videoPath = `hls/${movieSlug}/master.m3u8`;

      // 4. Generate signed token
      const token = generateVideoToken({
        movieId,
        userId,
        anonymousId,
        videoPath,
      });

      // 5. Return signed URL
      const videoBaseUrl = process.env.VIDEO_SERVER_URL || 'http://localhost:3002';
      
      // For local development, add /videos/ prefix
      // For cloud storage (GCS), the base URL already includes the bucket path
      const isCloudStorage = videoBaseUrl.includes('storage.googleapis.com');
      const signedUrl = isCloudStorage
        ? `${videoBaseUrl}/${videoPath}?token=${token}`
        : `${videoBaseUrl}/videos/${videoPath}?token=${token}`;

      return reply.send({
        url: signedUrl,
        expiresIn: 900, // 15 minutes in seconds
      });
    }
  );

  /**
   * GET /api/video-tokens/validate?token=...
   * Validate a video token (used by video server)
   * Using query param instead of path param because token contains '.' which breaks Fastify routing
   */
  fastify.get('/video-tokens/validate', async (request, reply) => {
    const { token } = request.query as { token: string };
    
    if (!token) {
      return reply.status(400).send({
        valid: false,
        error: 'Token is required',
      });
    }

    try {
      const { verifyVideoToken } = await import('../lib/video-token.js');
      const payload = verifyVideoToken(token);

      // Token is valid, return payload for video server to use
      return reply.send({
        valid: true,
        movieId: payload.movieId,
        videoPath: payload.videoPath,
      });
    } catch (error) {
      // Special format for token validation - includes valid: false
      return reply.status(401).send({
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid token',
      });
    }
  });
}
