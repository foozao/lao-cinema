// Movie genre management routes
import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { sendBadRequest, sendNotFound, sendInternalError } from '../lib/response-helpers.js';
import { logAuditFromRequest } from '../lib/audit-service.js';

export default async function movieGenresRoutes(fastify: FastifyInstance) {
  
  // POST /movies/:id/genres - Add a genre to a movie
  fastify.post('/movies/:id/genres', { preHandler: requireEditorOrAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { genreId } = request.body as { genreId: number };
    
    if (typeof genreId !== 'number') {
      return sendBadRequest(reply, 'genreId must be a number');
    }
    
    try {
      // Check if movie exists
      const [movie] = await db.select()
        .from(schema.movies)
        .where(eq(schema.movies.id, id))
        .limit(1);
      
      if (!movie) {
        return sendNotFound(reply, 'Movie not found');
      }
      
      // Check if genre exists
      const [genre] = await db.select()
        .from(schema.genres)
        .where(eq(schema.genres.id, genreId))
        .limit(1);
      
      if (!genre) {
        return sendNotFound(reply, 'Genre not found');
      }
      
      // Check if association already exists
      const [existing] = await db.select()
        .from(schema.movieGenres)
        .where(and(
          eq(schema.movieGenres.movieId, id),
          eq(schema.movieGenres.genreId, genreId)
        ))
        .limit(1);
      
      if (existing) {
        return reply.status(200).send({ message: 'Genre already associated with movie' });
      }
      
      // Add genre to movie
      await db.insert(schema.movieGenres).values({
        movieId: id,
        genreId,
      });
      
      // Get genre translations for audit log
      const genreTranslations = await db.select()
        .from(schema.genreTranslations)
        .where(eq(schema.genreTranslations.genreId, genreId));
      
      const genreName: any = {};
      for (const trans of genreTranslations) {
        genreName[trans.language] = trans.name;
      }
      
      // Log audit
      const genreNameStr = genreName.en || genreName.lo || 'Unknown';
      await logAuditFromRequest(
        request,
        'add_genre',
        'movie',
        id,
        `Added genre: ${genreNameStr}`
      );
      
      return {
        message: 'Genre added to movie',
        genre: {
          id: genre.id,
          name: genreName,
          isVisible: genre.isVisible,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to add genre to movie');
    }
  });
  
  // DELETE /movies/:id/genres/:genreId - Remove a genre from a movie
  fastify.delete('/movies/:id/genres/:genreId', { preHandler: requireEditorOrAdmin }, async (request, reply) => {
    const { id, genreId } = request.params as { id: string; genreId: string };
    const genreIdNum = parseInt(genreId, 10);
    
    if (isNaN(genreIdNum)) {
      return sendBadRequest(reply, 'Invalid genre ID');
    }
    
    try {
      // Check if movie exists
      const [movie] = await db.select()
        .from(schema.movies)
        .where(eq(schema.movies.id, id))
        .limit(1);
      
      if (!movie) {
        return sendNotFound(reply, 'Movie not found');
      }
      
      // Get genre info before deleting for audit log
      const [genre] = await db.select()
        .from(schema.genres)
        .where(eq(schema.genres.id, genreIdNum))
        .limit(1);
      
      const genreTranslations = genre ? await db.select()
        .from(schema.genreTranslations)
        .where(eq(schema.genreTranslations.genreId, genreIdNum)) : [];
      
      const genreName: any = {};
      for (const trans of genreTranslations) {
        genreName[trans.language] = trans.name;
      }
      
      // Delete the association
      const result = await db.delete(schema.movieGenres)
        .where(and(
          eq(schema.movieGenres.movieId, id),
          eq(schema.movieGenres.genreId, genreIdNum)
        ));
      
      // Log audit if genre was found and removed
      if (genre && Object.keys(genreName).length > 0) {
        const genreNameStr = genreName.en || genreName.lo || 'Unknown';
        await logAuditFromRequest(
          request,
          'remove_genre',
          'movie',
          id,
          `Removed genre: ${genreNameStr}`
        );
      }
      
      return { message: 'Genre removed from movie' };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to remove genre from movie');
    }
  });
}
