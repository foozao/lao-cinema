/**
 * Analytics Routes
 * 
 * Admin endpoints for platform analytics and content provider reporting.
 */

import { FastifyInstance } from 'fastify';
import { requireAuth, requireAdmin } from '../lib/auth-middleware.js';
import { sendNotFound, sendInternalError } from '../lib/response-helpers.js';
import { db } from '../db/index.js';
import { rentals, movies, movieTranslations, watchProgress, promoCodeUses, promoCodes } from '../db/schema.js';
import { eq, and, gt, count, sum, avg, sql, desc } from 'drizzle-orm';

// =============================================================================
// TYPES
// =============================================================================

interface MovieRentalStats {
  movieId: string;
  movieTitle: string;
  totalRentals: number;
  activeRentals: number;
  totalRevenue: number;
  currency: string;
  uniqueRenters: number;
  firstRental: string | null;
  lastRental: string | null;
}

interface MovieWatchStats {
  movieId: string;
  totalWatchTime: number;
  uniqueWatchers: number;
  completions: number;
  averageProgress: number;
}

interface AllMoviesStats {
  movieId: string;
  movieTitle: string;
  posterPath: string | null;
  totalRentals: number;
  activeRentals: number;
  totalRevenue: number;
  uniqueRenters: number;
}

// =============================================================================
// ROUTES
// =============================================================================

export default async function analyticsRoutes(fastify: FastifyInstance) {
  
  /**
   * GET /api/analytics/movies
   * Get rental and watch stats for all movies (admin only)
   */
  fastify.get('/analytics/movies', {
    preHandler: [requireAuth, requireAdmin],
  }, async (request, reply) => {
    try {
      const now = new Date().toISOString();
      
      // Get rental stats per movie
      const rentalStats = await db
        .select({
          movieId: rentals.movieId,
          totalRentals: count(rentals.id),
          activeRentals: sql<number>`SUM(CASE WHEN ${rentals.expiresAt} > ${now}::timestamp THEN 1 ELSE 0 END)::int`,
          totalRevenue: sql<number>`COALESCE(SUM(${rentals.amount}), 0)::numeric`,
          uniqueRenters: sql<number>`COUNT(DISTINCT COALESCE(${rentals.userId}::text, ${rentals.anonymousId}))::int`,
        })
        .from(rentals)
        .where(sql`${rentals.movieId} IS NOT NULL`)
        .groupBy(rentals.movieId);

      // Get movie info
      const movieInfo = await db
        .select({
          id: movies.id,
          posterPath: movies.posterPath,
          title: movieTranslations.title,
          language: movieTranslations.language,
        })
        .from(movies)
        .leftJoin(movieTranslations, eq(movies.id, movieTranslations.movieId));

      // Build movie title map
      const movieTitles = new Map<string, { en: string; lo?: string; posterPath: string | null }>();
      for (const m of movieInfo) {
        if (!movieTitles.has(m.id)) {
          movieTitles.set(m.id, { en: '', posterPath: m.posterPath });
        }
        const entry = movieTitles.get(m.id)!;
        if (m.language === 'en' && m.title) entry.en = m.title;
        if (m.language === 'lo' && m.title) entry.lo = m.title;
      }

      // Combine stats with movie info
      const result: AllMoviesStats[] = rentalStats
        .filter(r => r.movieId !== null)
        .map(r => {
          const movieData = movieTitles.get(r.movieId!) || { en: 'Unknown', posterPath: null };
          return {
            movieId: r.movieId!,
            movieTitle: movieData.en || 'Unknown',
            posterPath: movieData.posterPath,
            totalRentals: Number(r.totalRentals),
            activeRentals: Number(r.activeRentals),
            totalRevenue: Number(r.totalRevenue),
            uniqueRenters: Number(r.uniqueRenters),
          };
        })
        .sort((a, b) => b.totalRentals - a.totalRentals);

      return { movies: result };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to fetch movie analytics');
    }
  });

  /**
   * GET /api/analytics/movies/:movieId
   * Get detailed rental and watch stats for a specific movie (admin only)
   */
  fastify.get<{
    Params: { movieId: string };
  }>('/analytics/movies/:movieId', {
    preHandler: [requireAuth, requireAdmin],
  }, async (request, reply) => {
    const { movieId } = request.params;
    
    try {
      // Verify movie exists
      const [movie] = await db
        .select({
          id: movies.id,
          posterPath: movies.posterPath,
          releaseDate: movies.releaseDate,
          runtime: movies.runtime,
        })
        .from(movies)
        .where(eq(movies.id, movieId))
        .limit(1);

      if (!movie) {
        return sendNotFound(reply, 'Movie not found');
      }

      // Get movie translations
      const translations = await db
        .select({
          language: movieTranslations.language,
          title: movieTranslations.title,
        })
        .from(movieTranslations)
        .where(eq(movieTranslations.movieId, movieId));

      const title: Record<string, string> = {};
      for (const t of translations) {
        title[t.language] = t.title;
      }

      const now = new Date().toISOString();

      // Get rental stats
      const [rentalStats] = await db
        .select({
          totalRentals: count(rentals.id),
          activeRentals: sql<number>`SUM(CASE WHEN ${rentals.expiresAt} > ${now}::timestamp THEN 1 ELSE 0 END)::int`,
          totalRevenue: sql<number>`COALESCE(SUM(${rentals.amount}), 0)::numeric`,
          uniqueRenters: sql<number>`COUNT(DISTINCT COALESCE(${rentals.userId}::text, ${rentals.anonymousId}))::int`,
          firstRental: sql<string>`MIN(${rentals.purchasedAt})`,
          lastRental: sql<string>`MAX(${rentals.purchasedAt})`,
        })
        .from(rentals)
        .where(eq(rentals.movieId, movieId));

      // Get watch progress stats
      const [watchStats] = await db
        .select({
          totalWatchTime: sql<number>`COALESCE(SUM(${watchProgress.progressSeconds}), 0)::int`,
          uniqueWatchers: sql<number>`COUNT(DISTINCT COALESCE(${watchProgress.userId}::text, ${watchProgress.anonymousId}))::int`,
          completions: sql<number>`SUM(CASE WHEN ${watchProgress.completed} = true THEN 1 ELSE 0 END)::int`,
          averageProgress: sql<number>`COALESCE(AVG(
            CASE WHEN ${watchProgress.durationSeconds} > 0 
            THEN (${watchProgress.progressSeconds}::float / ${watchProgress.durationSeconds}::float) * 100 
            ELSE 0 END
          ), 0)::numeric`,
        })
        .from(watchProgress)
        .where(eq(watchProgress.movieId, movieId));

      // Get recent rentals
      const recentRentals = await db
        .select({
          id: rentals.id,
          purchasedAt: rentals.purchasedAt,
          expiresAt: rentals.expiresAt,
          amount: rentals.amount,
          currency: rentals.currency,
          paymentMethod: rentals.paymentMethod,
        })
        .from(rentals)
        .where(eq(rentals.movieId, movieId))
        .orderBy(desc(rentals.purchasedAt))
        .limit(10);

      // Get promo code usage stats for this movie
      const promoUsageStats = await db
        .select({
          code: promoCodes.code,
          discountType: promoCodes.discountType,
          usesForThisMovie: count(promoCodeUses.id),
        })
        .from(promoCodeUses)
        .innerJoin(promoCodes, eq(promoCodeUses.promoCodeId, promoCodes.id))
        .innerJoin(rentals, eq(promoCodeUses.rentalId, rentals.id))
        .where(eq(rentals.movieId, movieId))
        .groupBy(promoCodes.id, promoCodes.code, promoCodes.discountType)
        .orderBy(desc(count(promoCodeUses.id)));

      return {
        movie: {
          id: movie.id,
          title,
          posterPath: movie.posterPath,
          releaseDate: movie.releaseDate,
          runtime: movie.runtime,
        },
        rentals: {
          total: Number(rentalStats?.totalRentals || 0),
          active: Number(rentalStats?.activeRentals || 0),
          revenue: Number(rentalStats?.totalRevenue || 0),
          currency: 'USD',
          uniqueRenters: Number(rentalStats?.uniqueRenters || 0),
          firstRental: rentalStats?.firstRental || null,
          lastRental: rentalStats?.lastRental || null,
        },
        watch: {
          totalWatchTime: Number(watchStats?.totalWatchTime || 0),
          uniqueWatchers: Number(watchStats?.uniqueWatchers || 0),
          completions: Number(watchStats?.completions || 0),
          averageProgress: Number(watchStats?.averageProgress || 0),
          completionRate: watchStats?.uniqueWatchers && Number(watchStats.uniqueWatchers) > 0
            ? (Number(watchStats.completions) / Number(watchStats.uniqueWatchers)) * 100
            : 0,
        },
        promoCodes: promoUsageStats.map(stat => ({
          code: stat.code,
          discountType: stat.discountType,
          uses: Number(stat.usesForThisMovie),
        })),
        recentRentals,
      };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to fetch movie analytics');
    }
  });

  /**
   * GET /api/analytics/summary
   * Get platform-wide analytics summary (admin only)
   */
  fastify.get('/analytics/summary', {
    preHandler: [requireAuth, requireAdmin],
  }, async (request, reply) => {
    try {
      const now = new Date();

      // Get overall rental stats
      const [rentalSummary] = await db
        .select({
          totalRentals: count(rentals.id),
          activeRentals: sql<number>`SUM(CASE WHEN ${rentals.expiresAt} > ${now} THEN 1 ELSE 0 END)::int`,
          totalRevenue: sql<number>`COALESCE(SUM(${rentals.amount}), 0)::numeric`,
          uniqueRenters: sql<number>`COUNT(DISTINCT COALESCE(${rentals.userId}::text, ${rentals.anonymousId}))::int`,
        })
        .from(rentals);

      // Get overall watch stats
      const [watchSummary] = await db
        .select({
          totalWatchTime: sql<number>`COALESCE(SUM(${watchProgress.progressSeconds}), 0)::int`,
          uniqueWatchers: sql<number>`COUNT(DISTINCT COALESCE(${watchProgress.userId}::text, ${watchProgress.anonymousId}))::int`,
          completions: sql<number>`SUM(CASE WHEN ${watchProgress.completed} = true THEN 1 ELSE 0 END)::int`,
        })
        .from(watchProgress);

      // Get movie count
      const [movieCount] = await db
        .select({ count: count(movies.id) })
        .from(movies);

      return {
        movies: {
          total: movieCount?.count || 0,
        },
        rentals: {
          total: Number(rentalSummary?.totalRentals || 0),
          active: Number(rentalSummary?.activeRentals || 0),
          revenue: Number(rentalSummary?.totalRevenue || 0),
          uniqueRenters: Number(rentalSummary?.uniqueRenters || 0),
        },
        watch: {
          totalWatchTime: Number(watchSummary?.totalWatchTime || 0),
          uniqueWatchers: Number(watchSummary?.uniqueWatchers || 0),
          completions: Number(watchSummary?.completions || 0),
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return sendInternalError(reply, 'Failed to fetch analytics summary');
    }
  });
}
