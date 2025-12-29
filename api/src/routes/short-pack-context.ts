// Short Pack Context routes: Get pack information for movies and playback context

import { FastifyInstance } from 'fastify';
import { sendInternalError } from '../lib/response-helpers.js';
import { eq, and, gt, inArray, asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { requireAuthOrAnonymous, getUserContext } from '../lib/auth-middleware.js';
import { buildMovieWithRelations } from '../lib/movie-builder.js';
import { getPackTranslations, getPackShortCount } from '../lib/short-pack-helpers.js';

export default async function shortPackContextRoutes(fastify: FastifyInstance) {
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

          const translations = await getPackTranslations(pack.id);
          const shortCount = await getPackShortCount(pack.id);

          return {
            id: pack.id,
            slug: pack.slug,
            title: translations.title,
            poster_path: pack.posterPath,
            short_count: shortCount,
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
