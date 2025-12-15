// Movie image management routes: Set primary image, add images
// Split from movies.ts for better maintainability

import { FastifyInstance } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { logAuditFromRequest } from '../lib/audit-service.js';
import { unlink } from 'fs/promises';
import { join } from 'path';

const addImageSchema = z.object({
  type: z.enum(['poster', 'backdrop', 'logo']),
  filePath: z.string(),
  aspectRatio: z.number().optional(),
  height: z.number().int().optional(),
  width: z.number().int().optional(),
  isPrimary: z.boolean().default(false),
});

export default async function movieImageRoutes(fastify: FastifyInstance) {
  // Add a new image to a movie
  fastify.post<{ 
    Params: { id: string }; 
    Body: z.infer<typeof addImageSchema> 
  }>(
    '/movies/:id/images',
    { preHandler: [requireEditorOrAdmin] },
    async (request, reply) => {
      try {
        const { id: movieId } = request.params;
        const validation = addImageSchema.safeParse(request.body);
        
        if (!validation.success) {
          return reply.status(400).send({ 
            error: 'Invalid request body',
            details: validation.error.errors,
          });
        }
        
        const imageData = validation.data;

        // Verify movie exists
        const [movie] = await db.select()
          .from(schema.movies)
          .where(eq(schema.movies.id, movieId))
          .limit(1);

        if (!movie) {
          return reply.status(404).send({ error: 'Movie not found' });
        }

        // If this image is set as primary, unset other primary images of the same type
        if (imageData.isPrimary) {
          await db.update(schema.movieImages)
            .set({ isPrimary: false })
            .where(sql`${schema.movieImages.movieId} = ${movieId} AND ${schema.movieImages.type} = ${imageData.type}`);
        }

        // Insert the new image
        const [newImage] = await db.insert(schema.movieImages)
          .values({
            movieId,
            type: imageData.type,
            filePath: imageData.filePath,
            aspectRatio: imageData.aspectRatio ?? null,
            height: imageData.height ?? null,
            width: imageData.width ?? null,
            isPrimary: imageData.isPrimary,
            iso6391: null,
            voteAverage: null,
            voteCount: null,
          })
          .returning();

        // Update the movie's poster_path or backdrop_path if this is the primary image
        if (imageData.isPrimary) {
          if (imageData.type === 'poster') {
            await db.update(schema.movies)
              .set({ posterPath: imageData.filePath })
              .where(eq(schema.movies.id, movieId));
          } else if (imageData.type === 'backdrop') {
            await db.update(schema.movies)
              .set({ backdropPath: imageData.filePath })
              .where(eq(schema.movies.id, movieId));
          }
        }

        // Log audit event
        await logAuditFromRequest(
          request, 
          'add_image', 
          'movie', 
          movieId, 
          `Added ${imageData.type}${imageData.isPrimary ? ' (primary)' : ''}`,
          {
            image_id: { before: null, after: newImage.id },
            image_type: { before: null, after: imageData.type },
            file_path: { before: null, after: imageData.filePath },
            is_primary: { before: null, after: imageData.isPrimary },
          }
        );

        return reply.status(201).send({ 
          success: true,
          image: newImage,
        });
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to add image' });
      }
    }
  );

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

        // Log audit event with details
        await logAuditFromRequest(
          request, 
          'set_primary_image', 
          'movie', 
          movieId, 
          `Set primary ${type}`,
          {
            image_id: { before: null, after: imageId },
            image_type: { before: null, after: type },
            file_path: { before: null, after: image.filePath },
          }
        );

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

  // Delete an image
  fastify.delete<{ 
    Params: { id: string; imageId: string }; 
  }>(
    '/movies/:id/images/:imageId',
    { preHandler: [requireEditorOrAdmin] },
    async (request, reply) => {
      try {
        const { id: movieId, imageId } = request.params;

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

        // Delete the database record
        await db.delete(schema.movieImages)
          .where(eq(schema.movieImages.id, imageId));

        // Delete the physical file if it's a local upload (not TMDB)
        if (image.filePath.startsWith('http://') || image.filePath.startsWith('https://')) {
          try {
            // Extract filename from URL
            const filename = image.filePath.split('/').pop();
            if (filename) {
              const VIDEO_SERVER_PUBLIC_DIR = process.env.VIDEO_SERVER_PUBLIC_DIR || '../video-server/public';
              // Determine subdirectory based on image type
              const subdir = image.type === 'poster' ? 'posters' : 
                            image.type === 'backdrop' ? 'backdrops' : 'logos';
              const filePath = join(VIDEO_SERVER_PUBLIC_DIR, subdir, filename);
              await unlink(filePath);
              fastify.log.info(`Deleted file: ${filePath}`);
            }
          } catch (error) {
            // Log error but don't fail the request if file doesn't exist
            fastify.log.warn(`Failed to delete file for image ${imageId}:`, error);
          }
        }

        // If this was the primary image, we might need to update the movie's poster/backdrop path
        // But we'll leave it as is - the frontend will need to select a new primary

        // Log audit event
        await logAuditFromRequest(
          request, 
          'delete_image', 
          'movie', 
          movieId, 
          `Deleted ${image.type}${image.isPrimary ? ' (was primary)' : ''}`,
          {
            image_id: { before: imageId, after: null },
            image_type: { before: image.type, after: null },
            file_path: { before: image.filePath, after: null },
            was_primary: { before: image.isPrimary, after: null },
          }
        );

        return reply.status(200).send({ 
          success: true,
          message: 'Image deleted successfully',
        });
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to delete image' });
      }
    }
  );
}
