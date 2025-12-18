// Short Packs routes: CRUD operations for curated short film collections

import { FastifyInstance } from 'fastify';
import { sendBadRequest, sendUnauthorized, sendForbidden, sendNotFound, sendConflict, sendInternalError, sendCreated } from '../lib/response-helpers.js';
import { eq, asc, sql, and, gt, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { requireEditor, requireEditorOrAdmin, requireAuthOrAnonymous, getUserContext } from '../lib/auth-middleware.js';
import { buildMovieWithRelations } from '../lib/movie-builder.js';

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

          // Get short count, total runtime, and posters
          const items = await db.select({
            movieId: schema.shortPackItems.movieId,
            runtime: schema.movies.runtime,
            posterPath: schema.movies.posterPath,
            order: schema.shortPackItems.order,
          })
            .from(schema.shortPackItems)
            .innerJoin(schema.movies, eq(schema.shortPackItems.movieId, schema.movies.id))
            .where(eq(schema.shortPackItems.packId, pack.id))
            .orderBy(asc(schema.shortPackItems.order));

          const totalRuntime = items.reduce((sum, item) => sum + (item.runtime || 0), 0);
          const shortPosters = items
            .map(item => item.posterPath)
            .filter((p): p is string => p !== null)
            .slice(0, 4); // Max 4 posters for collage

          // Get unique directors from all shorts in pack
          const directors: { en: string; lo?: string }[] = [];
          for (const item of items) {
            const crewMembers = await db.select({
              personId: schema.movieCrewTranslations.personId,
            })
              .from(schema.movieCrewTranslations)
              .where(
                and(
                  eq(schema.movieCrewTranslations.movieId, item.movieId),
                  eq(schema.movieCrewTranslations.language, 'en'),
                  eq(schema.movieCrewTranslations.job, 'Director')
                )
              );
            
            for (const crew of crewMembers) {
              const personTranslations = await db.select()
                .from(schema.peopleTranslations)
                .where(eq(schema.peopleTranslations.personId, crew.personId));
              
              const nameEn = personTranslations.find(t => t.language === 'en')?.name || '';
              const nameLo = personTranslations.find(t => t.language === 'lo')?.name;
              
              // Check if director already added
              if (nameEn && !directors.some(d => d.en === nameEn)) {
                directors.push({ en: nameEn, lo: nameLo || undefined });
              }
            }
          }

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
            is_published: pack.isPublished,
            short_count: items.length,
            total_runtime: totalRuntime,
            short_posters: shortPosters,
            directors: directors,
            created_at: pack.createdAt.toISOString(),
            updated_at: pack.updatedAt.toISOString(),
          };
        })
      );

      return { short_packs: packsWithData };
    } catch (error) {
      fastify.log.error(error);
      sendInternalError(reply, 'Failed to fetch short packs');
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
        return sendNotFound(reply, 'Short pack not found');
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

      // Build full movie data for each short (including cast, crew, video_sources for MovieCard)
      const shorts = await Promise.all(
        packItems.map(async (item) => {
          const [movie] = await db.select()
            .from(schema.movies)
            .where(eq(schema.movies.id, item.movieId))
            .limit(1);

          if (!movie) return null;

          // Use buildMovieWithRelations for full movie data
          const fullMovie = await buildMovieWithRelations(movie, db, schema, {
            includeCast: true,
            includeCrew: true,
            includeGenres: true,
          });

          return {
            movie: fullMovie,
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
        is_published: pack.isPublished,
        shorts: validShorts,
        total_runtime: totalRuntime,
        short_count: validShorts.length,
        created_at: pack.createdAt.toISOString(),
        updated_at: pack.updatedAt.toISOString(),
      };
    } catch (error) {
      fastify.log.error(error);
      sendInternalError(reply, 'Failed to fetch short pack');
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

        return sendCreated(reply, JSON.parse(response.body));
      } catch (error) {
        if (error instanceof z.ZodError) {
          return sendBadRequest(reply, 'Validation error', error.errors);
        }
        fastify.log.error(error);
        return sendInternalError(reply, 'Failed to create short pack');
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
          return sendNotFound(reply, 'Short pack not found');
        }

        // Update pack
        const updateData: any = { updatedAt: new Date() };
        if (data.slug !== undefined) updateData.slug = data.slug;
        if (data.poster_path !== undefined) updateData.posterPath = data.poster_path;
        if (data.backdrop_path !== undefined) updateData.backdropPath = data.backdrop_path;
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
          return sendBadRequest(reply, 'Validation error', error.errors);
        }
        fastify.log.error(error);
        return sendInternalError(reply, 'Failed to update short pack');
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
          return sendNotFound(reply, 'Short pack not found');
        }

        return { message: 'Short pack deleted successfully', id };
      } catch (error) {
        fastify.log.error(error);
        sendInternalError(reply, 'Failed to delete short pack');
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

        // Return updated pack
        const response = await fastify.inject({
          method: 'GET',
          url: `/api/short-packs/${id}`,
        });

        return JSON.parse(response.body);
      } catch (error) {
        fastify.log.error(error);
        sendInternalError(reply, 'Failed to remove short from pack');
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

  // =============================================================================
  // GET PACK CONTEXT FOR A MOVIE
  // =============================================================================

  /**
   * GET /api/short-packs/for-movie/:movieId
   * Get published packs that contain a movie (public, no auth required)
   * Used for displaying pack info on movie detail page
   */
  fastify.get('/short-packs/for-movie/:movieId', async (request, reply) => {
    const { movieId } = request.params as { movieId: string };

    try {
      // Find which published packs contain this movie
      const packItems = await db.select({
        packId: schema.shortPackItems.packId,
        order: schema.shortPackItems.order,
      })
        .from(schema.shortPackItems)
        .innerJoin(schema.shortPacks, eq(schema.shortPackItems.packId, schema.shortPacks.id))
        .where(
          and(
            eq(schema.shortPackItems.movieId, movieId),
            eq(schema.shortPacks.isPublished, true)
          )
        );

      if (packItems.length === 0) {
        return reply.send({ packs: [] });
      }

      // Get pack details
      const packs = await Promise.all(
        packItems.map(async (item) => {
          const [pack] = await db.select()
            .from(schema.shortPacks)
            .where(eq(schema.shortPacks.id, item.packId))
            .limit(1);

          if (!pack) return null;

          const translations = await db.select()
            .from(schema.shortPackTranslations)
            .where(eq(schema.shortPackTranslations.packId, pack.id));

          const titleEn = translations.find(t => t.language === 'en');
          const titleLo = translations.find(t => t.language === 'lo');

          // Get short count
          const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
            .from(schema.shortPackItems)
            .where(eq(schema.shortPackItems.packId, pack.id));

          return {
            id: pack.id,
            slug: pack.slug,
            title: {
              en: titleEn?.title || '',
              lo: titleLo?.title,
            },
            poster_path: pack.posterPath,
            short_count: countResult?.count || 0,
          };
        })
      );

      return reply.send({ packs: packs.filter(Boolean) });
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to get packs for movie');
    }
  });

  /**
   * GET /api/short-packs/context/:movieId
   * Get pack context for a movie (which pack it belongs to, what's next/prev)
   * Used for continuous playback in the watch page
   */
  fastify.get('/short-packs/context/:movieId', { preHandler: requireAuthOrAnonymous }, async (request, reply) => {
    const { movieId } = request.params as { movieId: string };
    const { userId, anonymousId } = getUserContext(request);

    try {
      // Find which packs contain this movie
      const packItems = await db.select({
        packId: schema.shortPackItems.packId,
        order: schema.shortPackItems.order,
      })
        .from(schema.shortPackItems)
        .where(eq(schema.shortPackItems.movieId, movieId));

      if (packItems.length === 0) {
        return reply.send({ inPack: false });
      }

      // Check if user has an active rental for any of these packs
      const packIds = packItems.map(p => p.packId);
      const userClause = userId
        ? eq(schema.rentals.userId, userId)
        : eq(schema.rentals.anonymousId, anonymousId!);

      const [activeRental] = await db.select()
        .from(schema.rentals)
        .where(
          and(
            inArray(schema.rentals.shortPackId, packIds),
            userClause,
            gt(schema.rentals.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!activeRental) {
        // User doesn't have access to any pack containing this movie
        return reply.send({ inPack: true, hasAccess: false });
      }

      const rentedPackId = activeRental.shortPackId!;
      const currentItem = packItems.find(p => p.packId === rentedPackId);

      // Get all items in this pack ordered by position
      const allItems = await db.select({
        movieId: schema.shortPackItems.movieId,
        order: schema.shortPackItems.order,
      })
        .from(schema.shortPackItems)
        .where(eq(schema.shortPackItems.packId, rentedPackId))
        .orderBy(asc(schema.shortPackItems.order));

      // Find current index and get prev/next
      const currentIndex = allItems.findIndex(item => item.movieId === movieId);
      const prevItem = currentIndex > 0 ? allItems[currentIndex - 1] : null;
      const nextItem = currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null;

      // Build movie info for prev/next
      let prevMovie = null;
      let nextMovie = null;

      if (prevItem) {
        const [movie] = await db.select()
          .from(schema.movies)
          .where(eq(schema.movies.id, prevItem.movieId))
          .limit(1);
        if (movie) {
          prevMovie = await buildMovieWithRelations(movie, db, schema, {
            includeCast: false,
            includeCrew: false,
            includeGenres: false,
          });
        }
      }

      if (nextItem) {
        const [movie] = await db.select()
          .from(schema.movies)
          .where(eq(schema.movies.id, nextItem.movieId))
          .limit(1);
        if (movie) {
          nextMovie = await buildMovieWithRelations(movie, db, schema, {
            includeCast: false,
            includeCrew: false,
            includeGenres: false,
          });
        }
      }

      // Get pack info
      const [pack] = await db.select()
        .from(schema.shortPacks)
        .where(eq(schema.shortPacks.id, rentedPackId))
        .limit(1);

      const translations = await db.select()
        .from(schema.shortPackTranslations)
        .where(eq(schema.shortPackTranslations.packId, rentedPackId));

      const packTitle: Record<string, string> = {};
      for (const t of translations) {
        packTitle[t.language] = t.title;
      }

      return reply.send({
        inPack: true,
        hasAccess: true,
        pack: {
          id: pack.id,
          slug: pack.slug,
          title: packTitle,
        },
        currentIndex: currentIndex + 1,
        totalCount: allItems.length,
        prevMovie,
        nextMovie,
        rental: {
          id: activeRental.id,
          expiresAt: activeRental.expiresAt,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to get pack context');
    }
  });
}
