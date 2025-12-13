// Short Packs routes: CRUD operations for curated short film collections

import { FastifyInstance } from 'fastify';
import { eq, asc, desc, and, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { requireEditorOrAdmin } from '../lib/auth-middleware.js';
import { z } from 'zod';

// Zod schemas for validation
const LocalizedTextSchema = z.object({
  en: z.string(),
  lo: z.string().optional(),
});

const CreateShortPackSchema = z.object({
  slug: z.string().optional(),
  title: LocalizedTextSchema,
  description: LocalizedTextSchema.optional(),
  tagline: LocalizedTextSchema.optional(),
  poster_path: z.string().optional(),
  backdrop_path: z.string().optional(),
  price_usd: z.number().int().min(0).default(499),
  is_published: z.boolean().default(false),
});

const UpdateShortPackSchema = CreateShortPackSchema.partial();

const AddShortToPackSchema = z.object({
  movie_id: z.string().uuid(),
  order: z.number().int().min(0).optional(),
});

const ReorderShortsSchema = z.object({
  shorts: z.array(z.object({
    movie_id: z.string().uuid(),
    order: z.number().int().min(0),
  })),
});

export default async function shortPackRoutes(fastify: FastifyInstance) {
  // Get all short packs (with optional filter for published only)
  fastify.get<{ Querystring: { published?: string } }>('/short-packs', async (request, reply) => {
    try {
      const { published } = request.query;
      const showPublishedOnly = published === 'true';

      // Get all packs
      let query = db.select().from(schema.shortPacks);
      
      const packs = showPublishedOnly
        ? await query.where(eq(schema.shortPacks.isPublished, true))
        : await query;

      // Build response with translations and short counts
      const packsWithData = await Promise.all(
        packs.map(async (pack) => {
          // Get translations
          const translations = await db.select()
            .from(schema.shortPackTranslations)
            .where(eq(schema.shortPackTranslations.packId, pack.id));

          const titleEn = translations.find(t => t.language === 'en');
          const titleLo = translations.find(t => t.language === 'lo');

          // Get short count and total runtime
          const items = await db.select({
            movieId: schema.shortPackItems.movieId,
            runtime: schema.movies.runtime,
          })
            .from(schema.shortPackItems)
            .innerJoin(schema.movies, eq(schema.shortPackItems.movieId, schema.movies.id))
            .where(eq(schema.shortPackItems.packId, pack.id));

          const totalRuntime = items.reduce((sum, item) => sum + (item.runtime || 0), 0);

          return {
            id: pack.id,
            slug: pack.slug,
            title: {
              en: titleEn?.title || '',
              lo: titleLo?.title,
            },
            tagline: {
              en: titleEn?.tagline || undefined,
              lo: titleLo?.tagline || undefined,
            },
            poster_path: pack.posterPath,
            backdrop_path: pack.backdropPath,
            price_usd: pack.priceUsd,
            is_published: pack.isPublished,
            short_count: items.length,
            total_runtime: totalRuntime,
            created_at: pack.createdAt.toISOString(),
            updated_at: pack.updatedAt.toISOString(),
          };
        })
      );

      return { short_packs: packsWithData };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch short packs' });
    }
  });

  // Get single short pack by ID or slug (with full shorts data)
  fastify.get<{ Params: { id: string } }>('/short-packs/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      // Check if id is a UUID or a slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      const [pack] = await db.select()
        .from(schema.shortPacks)
        .where(isUUID ? eq(schema.shortPacks.id, id) : eq(schema.shortPacks.slug, id))
        .limit(1);

      if (!pack) {
        return reply.status(404).send({ error: 'Short pack not found' });
      }

      // Get translations
      const translations = await db.select()
        .from(schema.shortPackTranslations)
        .where(eq(schema.shortPackTranslations.packId, pack.id));

      const titleEn = translations.find(t => t.language === 'en');
      const titleLo = translations.find(t => t.language === 'lo');

      // Get shorts in this pack with full movie data
      const packItems = await db.select()
        .from(schema.shortPackItems)
        .where(eq(schema.shortPackItems.packId, pack.id))
        .orderBy(asc(schema.shortPackItems.order));

      // Build full movie data for each short
      const shorts = await Promise.all(
        packItems.map(async (item) => {
          const [movie] = await db.select()
            .from(schema.movies)
            .where(eq(schema.movies.id, item.movieId))
            .limit(1);

          if (!movie) return null;

          // Get movie translations
          const movieTranslations = await db.select()
            .from(schema.movieTranslations)
            .where(eq(schema.movieTranslations.movieId, movie.id));

          const movieTitleEn = movieTranslations.find(t => t.language === 'en');
          const movieTitleLo = movieTranslations.find(t => t.language === 'lo');

          return {
            movie: {
              id: movie.id,
              slug: movie.slug,
              type: movie.type,
              original_title: movie.originalTitle,
              poster_path: movie.posterPath,
              backdrop_path: movie.backdropPath,
              runtime: movie.runtime,
              release_date: movie.releaseDate,
              title: {
                en: movieTitleEn?.title || movie.originalTitle,
                lo: movieTitleLo?.title,
              },
              overview: {
                en: movieTitleEn?.overview || '',
                lo: movieTitleLo?.overview,
              },
            },
            order: item.order,
          };
        })
      );

      const validShorts = shorts.filter(Boolean);
      const totalRuntime = validShorts.reduce((sum, s) => sum + (s?.movie.runtime || 0), 0);

      return {
        id: pack.id,
        slug: pack.slug,
        title: {
          en: titleEn?.title || '',
          lo: titleLo?.title,
        },
        description: {
          en: titleEn?.description || undefined,
          lo: titleLo?.description || undefined,
        },
        tagline: {
          en: titleEn?.tagline || undefined,
          lo: titleLo?.tagline || undefined,
        },
        poster_path: pack.posterPath,
        backdrop_path: pack.backdropPath,
        price_usd: pack.priceUsd,
        is_published: pack.isPublished,
        shorts: validShorts,
        total_runtime: totalRuntime,
        short_count: validShorts.length,
        created_at: pack.createdAt.toISOString(),
        updated_at: pack.updatedAt.toISOString(),
      };
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch short pack' });
    }
  });

  // Create short pack
  fastify.post<{ Body: z.infer<typeof CreateShortPackSchema> }>(
    '/short-packs',
    { preHandler: [requireEditorOrAdmin] },
    async (request, reply) => {
      try {
        const data = CreateShortPackSchema.parse(request.body);

        // Insert pack
        const [newPack] = await db.insert(schema.shortPacks).values({
          slug: data.slug || null,
          posterPath: data.poster_path || null,
          backdropPath: data.backdrop_path || null,
          priceUsd: data.price_usd,
          isPublished: data.is_published,
        }).returning();

        // Insert English translation (required)
        await db.insert(schema.shortPackTranslations).values({
          packId: newPack.id,
          language: 'en',
          title: data.title.en,
          description: data.description?.en || null,
          tagline: data.tagline?.en || null,
        });

        // Insert Lao translation if provided
        if (data.title.lo) {
          await db.insert(schema.shortPackTranslations).values({
            packId: newPack.id,
            language: 'lo',
            title: data.title.lo,
            description: data.description?.lo || null,
            tagline: data.tagline?.lo || null,
          });
        }

        // Return the created pack
        const response = await fastify.inject({
          method: 'GET',
          url: `/api/short-packs/${newPack.id}`,
        });

        return reply.status(201).send(JSON.parse(response.body));
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Validation error', details: error.errors });
        }
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to create short pack' });
      }
    }
  );

  // Update short pack
  fastify.put<{ Params: { id: string }; Body: z.infer<typeof UpdateShortPackSchema> }>(
    '/short-packs/:id',
    { preHandler: [requireEditorOrAdmin] },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const data = UpdateShortPackSchema.parse(request.body);

        // Check pack exists
        const [existingPack] = await db.select()
          .from(schema.shortPacks)
          .where(eq(schema.shortPacks.id, id))
          .limit(1);

        if (!existingPack) {
          return reply.status(404).send({ error: 'Short pack not found' });
        }

        // Update pack
        const updateData: any = { updatedAt: new Date() };
        if (data.slug !== undefined) updateData.slug = data.slug;
        if (data.poster_path !== undefined) updateData.posterPath = data.poster_path;
        if (data.backdrop_path !== undefined) updateData.backdropPath = data.backdrop_path;
        if (data.price_usd !== undefined) updateData.priceUsd = data.price_usd;
        if (data.is_published !== undefined) updateData.isPublished = data.is_published;

        await db.update(schema.shortPacks)
          .set(updateData)
          .where(eq(schema.shortPacks.id, id));

        // Update translations if provided
        if (data.title || data.description || data.tagline) {
          // Update English translation
          const enUpdate: any = { updatedAt: new Date() };
          if (data.title?.en) enUpdate.title = data.title.en;
          if (data.description?.en !== undefined) enUpdate.description = data.description.en;
          if (data.tagline?.en !== undefined) enUpdate.tagline = data.tagline.en;

          await db.insert(schema.shortPackTranslations)
            .values({
              packId: id,
              language: 'en',
              title: data.title?.en || '',
              description: data.description?.en || null,
              tagline: data.tagline?.en || null,
            })
            .onConflictDoUpdate({
              target: [schema.shortPackTranslations.packId, schema.shortPackTranslations.language],
              set: enUpdate,
            });

          // Update Lao translation if provided
          if (data.title?.lo || data.description?.lo || data.tagline?.lo) {
            const loUpdate: any = { updatedAt: new Date() };
            if (data.title?.lo) loUpdate.title = data.title.lo;
            if (data.description?.lo !== undefined) loUpdate.description = data.description.lo;
            if (data.tagline?.lo !== undefined) loUpdate.tagline = data.tagline.lo;

            await db.insert(schema.shortPackTranslations)
              .values({
                packId: id,
                language: 'lo',
                title: data.title?.lo || '',
                description: data.description?.lo || null,
                tagline: data.tagline?.lo || null,
              })
              .onConflictDoUpdate({
                target: [schema.shortPackTranslations.packId, schema.shortPackTranslations.language],
                set: loUpdate,
              });
          }
        }

        // Return updated pack
        const response = await fastify.inject({
          method: 'GET',
          url: `/api/short-packs/${id}`,
        });

        return JSON.parse(response.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Validation error', details: error.errors });
        }
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to update short pack' });
      }
    }
  );

  // Delete short pack
  fastify.delete<{ Params: { id: string } }>(
    '/short-packs/:id',
    { preHandler: [requireEditorOrAdmin] },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const [deletedPack] = await db.delete(schema.shortPacks)
          .where(eq(schema.shortPacks.id, id))
          .returning();

        if (!deletedPack) {
          return reply.status(404).send({ error: 'Short pack not found' });
        }

        return { message: 'Short pack deleted successfully', id };
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to delete short pack' });
      }
    }
  );

  // ==========================================================================
  // SHORT PACK ITEMS (manage shorts within a pack)
  // ==========================================================================

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
          return reply.status(404).send({ error: 'Short pack not found' });
        }

        // Check movie exists and is a short
        const [movie] = await db.select()
          .from(schema.movies)
          .where(eq(schema.movies.id, data.movie_id))
          .limit(1);

        if (!movie) {
          return reply.status(404).send({ error: 'Movie not found' });
        }

        // Short films are those with runtime <= 40 minutes
        const SHORT_FILM_THRESHOLD_MINUTES = 40;
        if (!movie.runtime || movie.runtime > SHORT_FILM_THRESHOLD_MINUTES) {
          return reply.status(400).send({ error: `Movie is not a short film. Short films must have runtime ≤ ${SHORT_FILM_THRESHOLD_MINUTES} minutes.` });
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

        return JSON.parse(response.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Validation error', details: error.errors });
        }
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to add short to pack' });
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
          return reply.status(404).send({ error: 'Short not found in pack' });
        }

        // Return updated pack
        const response = await fastify.inject({
          method: 'GET',
          url: `/api/short-packs/${id}`,
        });

        return JSON.parse(response.body);
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to remove short from pack' });
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
          return reply.status(404).send({ error: 'Short pack not found' });
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

        return JSON.parse(response.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Validation error', details: error.errors });
        }
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to reorder shorts' });
      }
    }
  );
}
