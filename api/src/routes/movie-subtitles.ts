import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { sendBadRequest, sendNotFound, sendInternalError, sendCreated } from '../lib/response-helpers.js';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';

const subtitleTrackSchema = z.object({
  language: z.string().min(2).max(10),
  label: z.string().min(1).max(100),
  url: z.string().url(),
  isDefault: z.boolean().optional().default(false),
  kind: z.enum(['subtitles', 'captions', 'descriptions']).optional().default('subtitles'),
});

export default async function movieSubtitleRoutes(fastify: FastifyInstance) {
  
  // GET /api/movies/:id/subtitles - Get all subtitle tracks for a movie
  fastify.get('/api/movies/:id/subtitles', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      const tracks = await db
        .select()
        .from(schema.subtitleTracks)
        .where(eq(schema.subtitleTracks.movieId, id))
        .orderBy(schema.subtitleTracks.language);
      
      return reply.send(tracks);
    } catch (error) {
      console.error('Error fetching subtitle tracks:', error);
      return sendInternalError(reply, 'Failed to fetch subtitle tracks');
    }
  });
  
  // POST /api/movies/:id/subtitles - Add a subtitle track (admin only)
  fastify.post('/api/movies/:id/subtitles', {
    preHandler: [requireEditorOrAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const validation = subtitleTrackSchema.safeParse(request.body);
    if (!validation.success) {
      return sendBadRequest(reply, 'Invalid subtitle track data', validation.error.errors);
    }
    
    const { language, label, url, isDefault, kind } = validation.data;
    
    try {
      // If this is set as default, unset any existing default for this language
      if (isDefault) {
        await db
          .update(schema.subtitleTracks)
          .set({ isDefault: false })
          .where(and(
            eq(schema.subtitleTracks.movieId, id),
            eq(schema.subtitleTracks.language, language)
          ));
      }
      
      const [track] = await db
        .insert(schema.subtitleTracks)
        .values({
          movieId: id,
          language,
          label,
          url,
          isDefault,
          kind,
        })
        .returning();
      
      return sendCreated(reply, track);
    } catch (error) {
      console.error('Error adding subtitle track:', error);
      return sendInternalError(reply, 'Failed to add subtitle track');
    }
  });
  
  // PUT /api/movies/:id/subtitles/:trackId - Update a subtitle track (admin only)
  fastify.put('/api/movies/:id/subtitles/:trackId', {
    preHandler: [requireEditorOrAdmin],
  }, async (request, reply) => {
    const { id, trackId } = request.params as { id: string; trackId: string };
    
    const validation = subtitleTrackSchema.partial().safeParse(request.body);
    if (!validation.success) {
      return sendBadRequest(reply, 'Invalid subtitle track data', validation.error.errors);
    }
    
    const updates = validation.data;
    
    try {
      // If setting as default, unset other defaults for this language
      if (updates.isDefault && updates.language) {
        await db
          .update(schema.subtitleTracks)
          .set({ isDefault: false })
          .where(and(
            eq(schema.subtitleTracks.movieId, id),
            eq(schema.subtitleTracks.language, updates.language)
          ));
      }
      
      const [track] = await db
        .update(schema.subtitleTracks)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(
          eq(schema.subtitleTracks.id, trackId),
          eq(schema.subtitleTracks.movieId, id)
        ))
        .returning();
      
      if (!track) {
        return sendNotFound(reply, 'Subtitle track not found');
      }
      
      return reply.send(track);
    } catch (error) {
      console.error('Error updating subtitle track:', error);
      return sendInternalError(reply, 'Failed to update subtitle track');
    }
  });
  
  // DELETE /api/movies/:id/subtitles/:trackId - Delete a subtitle track (admin only)
  fastify.delete('/api/movies/:id/subtitles/:trackId', {
    preHandler: [requireEditorOrAdmin],
  }, async (request, reply) => {
    const { id, trackId } = request.params as { id: string; trackId: string };
    
    try {
      const [deleted] = await db
        .delete(schema.subtitleTracks)
        .where(and(
          eq(schema.subtitleTracks.id, trackId),
          eq(schema.subtitleTracks.movieId, id)
        ))
        .returning();
      
      if (!deleted) {
        return sendNotFound(reply, 'Subtitle track not found');
      }
      
      return reply.status(204).send();
    } catch (error) {
      console.error('Error deleting subtitle track:', error);
      return sendInternalError(reply, 'Failed to delete subtitle track');
    }
  });
}
