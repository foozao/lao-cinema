/**
 * Rental Helpers
 * 
 * Utility functions for building rental response objects.
 * Extracts complex query logic from routes to improve readability.
 */

import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { 
  shortPackTranslations, 
  shortPackItems, 
  movies, 
  watchProgress,
  shortPacks 
} from '../db/schema.js';
import { buildLocalizedText } from './translation-helpers.js';

/**
 * Build a complete pack response object with translations, posters, and runtime.
 */
export async function buildRentalPackResponse(
  pack: typeof shortPacks.$inferSelect,
  packId: string
): Promise<{
  id: string;
  slug: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  isPublished: boolean;
  short_posters: (string | null)[];
  short_count: number;
  total_runtime: number;
  title: Record<string, string>;
  description?: Record<string, string>;
}> {
  const packTranslations = await db.select()
    .from(shortPackTranslations)
    .where(eq(shortPackTranslations.packId, packId));
  
  const title = buildLocalizedText(packTranslations, 'title');
  const description = buildLocalizedText(packTranslations, 'description');
  
  // Get shorts posters for montage
  const packItems = await db.select({
    movieId: shortPackItems.movieId,
    order: shortPackItems.order,
    posterPath: movies.posterPath,
    runtime: movies.runtime,
  })
  .from(shortPackItems)
  .leftJoin(movies, eq(shortPackItems.movieId, movies.id))
  .where(eq(shortPackItems.packId, packId))
  .orderBy(shortPackItems.order)
  .limit(4);
  
  const shortPosters = packItems
    .map(item => item.posterPath)
    .filter(Boolean);
  
  const totalRuntime = packItems.reduce((sum, item) => sum + (item.runtime || 0), 0);
  
  return {
    id: pack.id,
    slug: pack.slug,
    posterPath: pack.posterPath || (pack as any).poster_path,
    backdropPath: pack.backdropPath || (pack as any).backdrop_path,
    isPublished: pack.isPublished,
    short_posters: shortPosters,
    short_count: packItems.length,
    total_runtime: totalRuntime,
    title,
    description: Object.keys(description).length > 0 ? description : undefined,
  };
}

export interface PackWatchProgress {
  progressSeconds: number;
  durationSeconds: number;
  completed: boolean;
}

/**
 * Calculate aggregate watch progress for all shorts in a pack.
 */
export async function calculatePackWatchProgress(
  packId: string,
  userId: string | null,
  anonymousId: string | null
): Promise<PackWatchProgress | null> {
  // Get all shorts in the pack
  const allPackItems = await db.select({
    movieId: shortPackItems.movieId,
    runtime: movies.runtime,
  })
  .from(shortPackItems)
  .leftJoin(movies, eq(shortPackItems.movieId, movies.id))
  .where(eq(shortPackItems.packId, packId));
  
  const shortIds = allPackItems.map(item => item.movieId).filter(Boolean) as string[];
  
  if (shortIds.length === 0) {
    return null;
  }
  
  // Build user clause for watch progress query
  const userClause = userId 
    ? eq(watchProgress.userId, userId)
    : eq(watchProgress.anonymousId, anonymousId!);
  
  // Get watch progress for all shorts in pack
  const progressRecords = await db.select()
    .from(watchProgress)
    .where(and(
      inArray(watchProgress.movieId, shortIds),
      userClause
    ));
  
  // Calculate total watched seconds and total duration
  let totalWatchedSeconds = 0;
  let totalDurationSeconds = 0;
  
  for (const item of allPackItems) {
    const runtime = item.runtime || 0;
    const durationSeconds = runtime * 60; // runtime is in minutes
    totalDurationSeconds += durationSeconds;
    
    const progress = progressRecords.find(p => p.movieId === item.movieId);
    if (progress) {
      totalWatchedSeconds += progress.progressSeconds;
    }
  }
  
  if (totalDurationSeconds === 0) {
    return null;
  }
  
  return {
    progressSeconds: totalWatchedSeconds,
    durationSeconds: totalDurationSeconds,
    completed: totalWatchedSeconds >= totalDurationSeconds * 0.9,
  };
}
