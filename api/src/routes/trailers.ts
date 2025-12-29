import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendUnauthorized, sendForbidden, sendNotFound, sendConflict, sendInternalError, sendCreated } from '../lib/response-helpers.js';
import { z } from 'zod';
import { db } from '../db/index.js';
import { trailers, movies } from '../db/schema.js';
import { eq, and, asc } from 'drizzle-orm';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { logAuditFromRequest } from '../lib/audit-service.js';

// Validation schemas
const youtubeTrailerSchema = z.object({
  type: z.literal('youtube'),
  youtube_key: z.string().min(1),
  name: z.string().min(1),
  official: z.boolean().default(false),
  language: z.string().optional(),
  published_at: z.string().optional(),
  order: z.number().int().default(0),
});

const videoTrailerSchema = z.object({
  type: z.literal('video'),
  video_url: z.string().min(1), // Can be slug or full URL
  video_format: z.enum(['mp4', 'hls', 'dash']),
  video_quality: z.enum(['original', '1080p', '720p', '480p', '360p']).default('original'),
  size_bytes: z.number().int().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  duration_seconds: z.number().int().optional(),
  thumbnail_url: z.string().optional(), // Thumbnail image (slug or full URL)
  name: z.string().min(1),
  official: z.boolean().default(true),
  language: z.string().optional(),
  published_at: z.string().optional(),
  order: z.number().int().default(0),
});

const createTrailerSchema = z.discriminatedUnion('type', [
  youtubeTrailerSchema,
  videoTrailerSchema,
]);

const updateTrailerSchema = z.object({
  name: z.string().min(1).optional(),
  official: z.boolean().optional(),
  language: z.string().optional(),
  published_at: z.string().optional(),
  order: z.number().int().optional(),
  // Allow updating video-specific fields
  video_url: z.string().min(1).optional(), // Can be slug or full URL
  video_format: z.enum(['mp4', 'hls', 'dash']).optional(),
  video_quality: z.enum(['original', '1080p', '720p', '480p', '360p']).optional(),
  size_bytes: z.number().int().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  duration_seconds: z.number().int().optional(),
  thumbnail_url: z.string().optional(), // Thumbnail image (slug or full URL)
});

export default async function trailersRoutes(fastify: FastifyInstance) {
  // GET /api/trailers/:movieId - Get all trailers for a movie
  fastify.get('/trailers/:movieId', async (request, reply) => {
    const { movieId } = request.params as { movieId: string };

    // Verify movie exists
    const [movie] = await db.select().from(movies).where(eq(movies.id, movieId)).limit(1);
    if (!movie) {
      return sendNotFound(reply, 'Movie not found');
    }

    const movieTrailers = await db
      .select()
      .from(trailers)
      .where(eq(trailers.movieId, movieId))
      .orderBy(asc(trailers.order));

    return movieTrailers;
  });

  // POST /api/trailers/:movieId - Create a new trailer (admin only)
  fastify.post(
    '/trailers/:movieId',
    { preHandler: requireEditorOrAdmin },
    async (request, reply) => {
      const { movieId } = request.params as { movieId: string };

      // Verify movie exists
      const [movie] = await db.select().from(movies).where(eq(movies.id, movieId)).limit(1);
      if (!movie) {
        return sendNotFound(reply, 'Movie not found');
      }

      // Validate request body
      const validation = createTrailerSchema.safeParse(request.body);
      if (!validation.success) {
        return sendBadRequest(reply, 'Invalid trailer data', validation.error.issues);
      }

      const data = validation.data;

      // Insert trailer
      const [newTrailer] = await db
        .insert(trailers)
        .values({
          movieId,
          type: data.type,
          youtubeKey: data.type === 'youtube' ? data.youtube_key : null,
          videoUrl: data.type === 'video' ? data.video_url : null,
          videoFormat: data.type === 'video' ? data.video_format : null,
          videoQuality: data.type === 'video' ? data.video_quality : null,
          sizeBytes: data.type === 'video' ? data.size_bytes : null,
          width: data.type === 'video' ? data.width : null,
          height: data.type === 'video' ? data.height : null,
          durationSeconds: data.type === 'video' ? data.duration_seconds : null,
          thumbnailUrl: data.type === 'video' ? data.thumbnail_url : null,
          name: data.name,
          official: data.official,
          language: data.language || null,
          publishedAt: data.published_at || null,
          order: data.order,
        })
        .returning();

      // Log audit event
      await logAuditFromRequest(
        request,
        'create',
        'movie',
        movieId,
        `Added trailer: ${data.name}`,
        {
          trailer_id: { before: null, after: newTrailer.id },
          trailer_type: { before: null, after: data.type },
          trailer_name: { before: null, after: data.name },
          youtube_key: { before: null, after: data.type === 'youtube' ? data.youtube_key : null },
          video_url: { before: null, after: data.type === 'video' ? data.video_url : null },
        }
      );

      return sendCreated(reply, newTrailer);
    }
  );

  // PATCH /api/trailers/:trailerId - Update a trailer (admin only)
  fastify.patch(
    '/trailers/:trailerId',
    { preHandler: requireEditorOrAdmin },
    async (request, reply) => {
      const { trailerId } = request.params as { trailerId: string };

      // Verify trailer exists
      const [existingTrailer] = await db
        .select()
        .from(trailers)
        .where(eq(trailers.id, trailerId))
        .limit(1);

      if (!existingTrailer) {
        return sendNotFound(reply, 'Trailer not found');
      }

      // Validate request body
      const validation = updateTrailerSchema.safeParse(request.body);
      if (!validation.success) {
        return sendBadRequest(reply, 'Invalid update data', validation.error.issues);
      }

      const data = validation.data;

      // Map snake_case to camelCase for Drizzle
      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.official !== undefined) updateData.official = data.official;
      if (data.language !== undefined) updateData.language = data.language;
      if (data.published_at !== undefined) updateData.publishedAt = data.published_at;
      if (data.order !== undefined) updateData.order = data.order;
      if (data.video_url !== undefined) updateData.videoUrl = data.video_url;
      if (data.video_format !== undefined) updateData.videoFormat = data.video_format;
      if (data.video_quality !== undefined) updateData.videoQuality = data.video_quality;
      if (data.size_bytes !== undefined) updateData.sizeBytes = data.size_bytes;
      if (data.width !== undefined) updateData.width = data.width;
      if (data.height !== undefined) updateData.height = data.height;
      if (data.duration_seconds !== undefined) updateData.durationSeconds = data.duration_seconds;
      if (data.thumbnail_url !== undefined) updateData.thumbnailUrl = data.thumbnail_url;

      // Update trailer
      const [updatedTrailer] = await db
        .update(trailers)
        .set(updateData)
        .where(eq(trailers.id, trailerId))
        .returning();

      // Log audit event with changes
      const changes: Record<string, { before: any; after: any }> = {
        trailer_id: { before: existingTrailer.id, after: updatedTrailer.id },
      };
      if (data.name !== undefined && data.name !== existingTrailer.name) {
        changes.trailer_name = { before: existingTrailer.name, after: data.name };
      }
      if (data.video_url !== undefined && data.video_url !== existingTrailer.videoUrl) {
        changes.video_url = { before: existingTrailer.videoUrl, after: data.video_url };
      }
      if (data.official !== undefined && data.official !== existingTrailer.official) {
        changes.official = { before: existingTrailer.official, after: data.official };
      }
      
      await logAuditFromRequest(
        request,
        'update',
        'movie',
        existingTrailer.movieId,
        `Updated trailer: ${updatedTrailer.name}`,
        Object.keys(changes).length > 1 ? changes : undefined
      );

      return updatedTrailer;
    }
  );

  // DELETE /api/trailers/:trailerId - Delete a trailer (admin only)
  fastify.delete(
    '/trailers/:trailerId',
    { preHandler: requireEditorOrAdmin },
    async (request, reply) => {
      const { trailerId } = request.params as { trailerId: string };

      const [deletedTrailer] = await db
        .delete(trailers)
        .where(eq(trailers.id, trailerId))
        .returning();

      if (!deletedTrailer) {
        return sendNotFound(reply, 'Trailer not found');
      }

      // Log audit event
      await logAuditFromRequest(
        request,
        'delete',
        'movie',
        deletedTrailer.movieId,
        `Removed trailer: ${deletedTrailer.name}`,
        {
          trailer_id: { before: deletedTrailer.id, after: null },
          trailer_type: { before: deletedTrailer.type, after: null },
          trailer_name: { before: deletedTrailer.name, after: null },
          youtube_key: { before: deletedTrailer.youtubeKey, after: null },
          video_url: { before: deletedTrailer.videoUrl, after: null },
        }
      );

      return { success: true, deleted: deletedTrailer };
    }
  );

  // POST /api/trailers/:trailerId/select-thumbnail - Select thumbnail and cleanup unused ones (admin only)
  fastify.post(
    '/trailers/:trailerId/select-thumbnail',
    { preHandler: requireEditorOrAdmin },
    async (request, reply) => {
      const { trailerId } = request.params as { trailerId: string };
      const { thumbnail_number } = request.body as { thumbnail_number: number };

      // Validate thumbnail number (1-9)
      if (!thumbnail_number || thumbnail_number < 1 || thumbnail_number > 9) {
        return sendBadRequest(reply, 'thumbnail_number must be between 1 and 9');
      }

      // Get trailer
      const [trailer] = await db
        .select()
        .from(trailers)
        .where(eq(trailers.id, trailerId))
        .limit(1);

      if (!trailer) {
        return sendNotFound(reply, 'Trailer not found');
      }

      if (trailer.type !== 'video') {
        return sendBadRequest(reply, 'Thumbnail selection only applies to video trailers');
      }

      // Extract slug from video URL
      const videoUrl = trailer.videoUrl;
      if (!videoUrl || videoUrl.startsWith('http')) {
        return sendBadRequest(reply, 'Trailer must use slug-based URL for thumbnail selection');
      }

      // Update trailer with selected thumbnail
      const selectedThumbnail = `${videoUrl}/thumbnail-${thumbnail_number}.jpg`;
      const [updatedTrailer] = await db
        .update(trailers)
        .set({ 
          thumbnailUrl: selectedThumbnail,
          updatedAt: new Date() 
        })
        .where(eq(trailers.id, trailerId))
        .returning();

      // Note: Cleanup of unused thumbnails should be done via a separate cleanup script
      // or GCS lifecycle policy, as the API doesn't have direct filesystem access in production

      return { 
        success: true, 
        trailer: updatedTrailer,
        selected_thumbnail: thumbnail_number,
        message: 'Thumbnail selected. Unused thumbnails can be cleaned up via cleanup script.'
      };
    }
  );

  // POST /api/trailers/:movieId/reorder - Reorder trailers (admin only)
  fastify.post(
    '/trailers/:movieId/reorder',
    { preHandler: requireEditorOrAdmin },
    async (request, reply) => {
      const { movieId } = request.params as { movieId: string };
      const { trailer_ids } = request.body as { trailer_ids: string[] };

      if (!Array.isArray(trailer_ids)) {
        return sendBadRequest(reply, 'trailer_ids must be an array');
      }

      // Update order for each trailer
      const updates = trailer_ids.map((trailerId, index) =>
        db
          .update(trailers)
          .set({ order: index, updatedAt: new Date() })
          .where(and(eq(trailers.id, trailerId), eq(trailers.movieId, movieId)))
      );

      await Promise.all(updates);

      // Return updated trailers
      const updatedTrailers = await db
        .select()
        .from(trailers)
        .where(eq(trailers.movieId, movieId))
        .orderBy(asc(trailers.order));

      return updatedTrailers;
    }
  );
}
