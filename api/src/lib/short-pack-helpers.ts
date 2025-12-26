/**
 * Short Pack Helpers
 * 
 * Utility functions for building short pack response objects.
 * Extracts complex query logic from routes to improve readability.
 */

import { eq, asc, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { buildMovieWithRelations } from './movie-builder.js';

export interface PackTranslations {
  title: { en: string; lo?: string };
  description?: { en?: string; lo?: string };
  tagline?: { en?: string; lo?: string };
}

export interface PackSummary {
  id: string;
  slug: string | null;
  title: { en: string; lo?: string };
  tagline?: { en?: string; lo?: string };
  poster_path: string | null;
  backdrop_path: string | null;
  is_published: boolean;
  short_count: number;
  total_runtime: number;
  short_posters: string[];
  directors: { en: string; lo?: string }[];
  created_at: string;
  updated_at: string;
}

/**
 * Get translations for a pack.
 */
export async function getPackTranslations(packId: string): Promise<PackTranslations> {
  const translations = await db.select()
    .from(schema.shortPackTranslations)
    .where(eq(schema.shortPackTranslations.packId, packId));

  const titleEn = translations.find(t => t.language === 'en');
  const titleLo = translations.find(t => t.language === 'lo');

  return {
    title: {
      en: titleEn?.title || '',
      lo: titleLo?.title || undefined,
    },
    description: {
      en: titleEn?.description || undefined,
      lo: titleLo?.description || undefined,
    },
    tagline: {
      en: titleEn?.tagline || undefined,
      lo: titleLo?.tagline || undefined,
    },
  };
}

/**
 * Get pack items with movie details (runtime, poster, order).
 */
export async function getPackItems(packId: string) {
  return db.select({
    movieId: schema.shortPackItems.movieId,
    runtime: schema.movies.runtime,
    posterPath: schema.movies.posterPath,
    order: schema.shortPackItems.order,
  })
    .from(schema.shortPackItems)
    .innerJoin(schema.movies, eq(schema.shortPackItems.movieId, schema.movies.id))
    .where(eq(schema.shortPackItems.packId, packId))
    .orderBy(asc(schema.shortPackItems.order));
}

/**
 * Get unique directors from all shorts in a pack.
 */
export async function getPackDirectors(
  items: Array<{ movieId: string }>
): Promise<Array<{ en: string; lo?: string }>> {
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
  
  return directors;
}

/**
 * Build a pack summary for list endpoints.
 */
export async function buildPackSummary(
  pack: typeof schema.shortPacks.$inferSelect
): Promise<PackSummary> {
  const translations = await getPackTranslations(pack.id);
  const items = await getPackItems(pack.id);
  
  const totalRuntime = items.reduce((sum, item) => sum + (item.runtime || 0), 0);
  const shortPosters = items
    .map(item => item.posterPath)
    .filter((p): p is string => p !== null)
    .slice(0, 4);
  
  const directors = await getPackDirectors(items);

  return {
    id: pack.id,
    slug: pack.slug,
    title: translations.title,
    tagline: translations.tagline,
    poster_path: pack.posterPath,
    backdrop_path: pack.backdropPath,
    is_published: pack.isPublished,
    short_count: items.length,
    total_runtime: totalRuntime,
    short_posters: shortPosters,
    directors,
    created_at: pack.createdAt.toISOString(),
    updated_at: pack.updatedAt.toISOString(),
  };
}

/**
 * Build full pack detail with movie data for single pack endpoint.
 */
export async function buildPackDetail(
  pack: typeof schema.shortPacks.$inferSelect
) {
  const translations = await getPackTranslations(pack.id);
  
  // Get shorts in this pack
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
    title: translations.title,
    description: translations.description,
    tagline: translations.tagline,
    poster_path: pack.posterPath,
    backdrop_path: pack.backdropPath,
    is_published: pack.isPublished,
    shorts: validShorts,
    total_runtime: totalRuntime,
    short_count: validShorts.length,
    created_at: pack.createdAt.toISOString(),
    updated_at: pack.updatedAt.toISOString(),
  };
}

/**
 * Get pack count for a specific pack.
 */
export async function getPackShortCount(packId: string): Promise<number> {
  const [result] = await db.select({ count: sql<number>`count(*)::int` })
    .from(schema.shortPackItems)
    .where(eq(schema.shortPackItems.packId, packId));
  return result?.count || 0;
}
