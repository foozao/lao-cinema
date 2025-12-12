// Movie image management routes: Set primary image
// Split from movies.ts for better maintainability

import { FastifyInstance } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { logAuditFromRequest } from '../lib/audit-service.js';

export default async function movieImageRoutes(fastify: FastifyInstance) {
  // Set primary image
  fastify.put<{ 
    Params: { id: string; imageId: string }; 
    Body: { type: 'poster' | 'backdrop' | 'logo' } 
  }>(
    '/movies/:id/images/:imageId/primary',
    { preHandler: [requireEditorOrAdmin] },
    async (request, reply) => {
      try {
        const { id: movieId, imageId } = request.params;
        const { type } = request.body;

        // Verify movie exists
        const [movie] = await db.select()
          .from(schema.movies)
          .where(eq(schema.movies.id, movieId))
          .limit(1);

        if (!movie) {
          return reply.status(404).send({ error: 'Movie not found' });
        }

        // Verify image exists and belongs to this movie
        const [image] = await db.select()
          .from(schema.movieImages)
          .where(sql`${schema.movieImages.id} = ${imageId} AND ${schema.movieImages.movieId} = ${movieId}`)
          .limit(1);

        if (!image) {
          return reply.status(404).send({ error: 'Image not found' });
        }

        if (image.type !== type) {
          return reply.status(400).send({ error: 'Image type mismatch' });
        }

        // Unset all primary flags for this type
        await db.update(schema.movieImages)
          .set({ isPrimary: false })
          .where(sql`${schema.movieImages.movieId} = ${movieId} AND ${schema.movieImages.type} = ${type}`);

        // Set the selected image as primary
        await db.update(schema.movieImages)
          .set({ isPrimary: true })
          .where(eq(schema.movieImages.id, imageId));

        // Update the movie's poster_path or backdrop_path if applicable
        if (type === 'poster') {
          await db.update(schema.movies)
            .set({ posterPath: image.filePath })
            .where(eq(schema.movies.id, movieId));
        } else if (type === 'backdrop') {
          await db.update(schema.movies)
            .set({ backdropPath: image.filePath })
            .where(eq(schema.movies.id, movieId));
        }

        // Log audit event
        await logAuditFromRequest(request, 'set_primary_image', 'movie', movieId, `Set primary ${type}: ${image.filePath}`);

        return reply.status(200).send({ 
          success: true,
          message: `Primary ${type} updated successfully`,
        });
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to update primary image' });
      }
    }
  );
}
