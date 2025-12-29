// Short Pack Items routes: Manage shorts within a pack (add, remove, reorder)

import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendNotFound, sendInternalError } from '../lib/response-helpers.js';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { logAuditFromRequest } from '../lib/audit-service.js';

// Zod schemas for validation
export const AddShortToPackSchema = z.object({
  movie_id: z.string().uuid(),
  order: z.number().int().min(0).optional(),
});

export const ReorderShortsSchema = z.object({
  shorts: z.array(z.object({
    movie_id: z.string().uuid(),
    order: z.number().int().min(0),
  })),
});

export default async function shortPackItemsRoutes(fastify: FastifyInstance) {
  // Add short to pack
  fastify.post<{ Params: { id: string }; Body: z.infer<typeof AddShortToPackSchema> }>(
    '/short-packs/:id/shorts',
    { preHandler: [requireEditorOrAdmin] },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const data = AddShortToPackSchema.parse(request.body);

        // Check pack exists
        const [pack] = await db.select()
          .from(schema.shortPacks)
          .where(eq(schema.shortPacks.id, id))
          .limit(1);

        if (!pack) {
          return sendNotFound(reply, 'Short pack not found');
        }

        // Check movie exists and is a short
        const [movie] = await db.select()
          .from(schema.movies)
          .where(eq(schema.movies.id, data.movie_id))
          .limit(1);

        if (!movie) {
          return sendNotFound(reply, 'Movie not found');
        }

        // Short films are those with runtime <= 40 minutes
        const SHORT_FILM_THRESHOLD_MINUTES = 40;
        if (!movie.runtime || movie.runtime > SHORT_FILM_THRESHOLD_MINUTES) {
          return sendBadRequest(reply, `Movie is not a short film. Short films must have runtime ≤ ${SHORT_FILM_THRESHOLD_MINUTES} minutes.`);
        }

        // Get current max order if not provided
        let order = data.order;
        if (order === undefined) {
          const [maxOrder] = await db.select({ max: sql<number>`COALESCE(MAX("order"), -1)` })
            .from(schema.shortPackItems)
            .where(eq(schema.shortPackItems.packId, id));
          order = (maxOrder?.max ?? -1) + 1;
        }

        // Insert item
        await db.insert(schema.shortPackItems)
          .values({
            packId: id,
            movieId: data.movie_id,
            order,
          })
          .onConflictDoUpdate({
            target: [schema.shortPackItems.packId, schema.shortPackItems.movieId],
            set: { order },
          });

        // Return updated pack
        const response = await fastify.inject({
          method: 'GET',
          url: `/api/short-packs/${id}`,
        });

        // Log audit event
        const translations = await db.select().from(schema.shortPackTranslations)
          .where(eq(schema.shortPackTranslations.packId, id));
        const packTitle = translations.find(t => t.language === 'en')?.title || 'Unknown';
        await logAuditFromRequest(
          request,
          'update',
          'settings',
          id,
          `${packTitle}: added movie ${data.movie_id}`,
          {
            movie_id: { before: null, after: data.movie_id },
            order: { before: null, after: order },
          }
        );

        return JSON.parse(response.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return sendBadRequest(reply, 'Validation error', error.errors);
        }
        fastify.log.error(error);
        return sendInternalError(reply, 'Failed to add short to pack');
      }
    }
  );

  // Remove short from pack
  fastify.delete<{ Params: { id: string; movieId: string } }>(
    '/short-packs/:id/shorts/:movieId',
    { preHandler: [requireEditorOrAdmin] },
    async (request, reply) => {
      try {
        const { id, movieId } = request.params;

        const [deleted] = await db.delete(schema.shortPackItems)
          .where(and(
            eq(schema.shortPackItems.packId, id),
            eq(schema.shortPackItems.movieId, movieId)
          ))
          .returning();

        if (!deleted) {
          return sendNotFound(reply, 'Short not found in pack');
        }

        // Log audit event
        const translations = await db.select().from(schema.shortPackTranslations)
          .where(eq(schema.shortPackTranslations.packId, id));
        const packTitle = translations.find(t => t.language === 'en')?.title || 'Unknown';
        await logAuditFromRequest(
          request,
          'update',
          'settings',
          id,
          `${packTitle}: removed movie ${movieId}`,
          {
            movie_id: { before: movieId, after: null },
          }
        );

        // Return updated pack
        const response = await fastify.inject({
          method: 'GET',
          url: `/api/short-packs/${id}`,
        });
        
        if (response.statusCode !== 200) {
          fastify.log.error({ statusCode: response.statusCode }, 'Failed to fetch updated pack');
          return sendInternalError(reply, 'Failed to fetch updated pack details');
        }

        return JSON.parse(response.body);
      } catch (error) {
        fastify.log.error(error);
        return sendInternalError(reply, 'Failed to remove short from pack');
      }
    }
  );

  // Reorder shorts in pack
  fastify.put<{ Params: { id: string }; Body: z.infer<typeof ReorderShortsSchema> }>(
    '/short-packs/:id/reorder',
    { preHandler: [requireEditorOrAdmin] },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const data = ReorderShortsSchema.parse(request.body);

        // Check pack exists
        const [pack] = await db.select()
          .from(schema.shortPacks)
          .where(eq(schema.shortPacks.id, id))
          .limit(1);

        if (!pack) {
          return sendNotFound(reply, 'Short pack not found');
        }

        // Update order for each short
        for (const item of data.shorts) {
          await db.update(schema.shortPackItems)
            .set({ order: item.order })
            .where(and(
              eq(schema.shortPackItems.packId, id),
              eq(schema.shortPackItems.movieId, item.movie_id)
            ));
        }

        // Return updated pack
        const response = await fastify.inject({
          method: 'GET',
          url: `/api/short-packs/${id}`,
        });

        // Log audit event
        const translations = await db.select().from(schema.shortPackTranslations)
          .where(eq(schema.shortPackTranslations.packId, id));
        const packTitle = translations.find(t => t.language === 'en')?.title || 'Unknown';
        await logAuditFromRequest(
          request,
          'update',
          'settings',
          id,
          `${packTitle}: reordered shorts`
        );

        return JSON.parse(response.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return sendBadRequest(reply, 'Validation error', error.errors);
        }
        fastify.log.error(error);
        return sendInternalError(reply, 'Failed to reorder shorts');
      }
    }
  );
}
