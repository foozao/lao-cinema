/**
 * Rental Access Service
 * 
 * Centralized logic for checking movie access via direct rental or pack rental.
 * Used by rentals routes and video-tokens to avoid duplication.
 */

import { db } from '../db/index.js';
import { rentals, shortPackItems } from '../db/schema.js';
import { eq, and, gt, gte, inArray, or } from 'drizzle-orm';

export interface RentalAccessResult {
  hasAccess: boolean;
  accessType: 'movie' | 'pack' | null;
  rental: {
    id: string;
    movieId?: string | null;
    shortPackId?: string | null;
    expiresAt: Date;
  } | null;
}

export interface UserIdentifier {
  userId?: string | null;
  anonymousId?: string | null;
}

/**
 * Check if a user has access to a movie via direct rental or pack rental.
 * 
 * @param movieId - The movie UUID to check access for
 * @param user - User identifier (userId or anonymousId)
 * @returns RentalAccessResult with access status and rental details
 * 
 * @example
 * const result = await checkMovieAccess(movieId, { userId, anonymousId });
 * if (result.hasAccess) {
 *   // User can watch the movie
 * }
 */
export async function checkMovieAccess(
  movieId: string,
  user: UserIdentifier
): Promise<RentalAccessResult> {
  const { userId, anonymousId } = user;
  const now = new Date();
  
  // Build user clause for queries
  const userClause = userId
    ? eq(rentals.userId, userId)
    : eq(rentals.anonymousId, anonymousId!);

  // Check for direct movie rental
  const [directRental] = await db
    .select({
      id: rentals.id,
      movieId: rentals.movieId,
      shortPackId: rentals.shortPackId,
      expiresAt: rentals.expiresAt,
    })
    .from(rentals)
    .where(
      and(
        eq(rentals.movieId, movieId),
        gt(rentals.expiresAt, now),
        userClause
      )
    )
    .limit(1);

  if (directRental) {
    return {
      hasAccess: true,
      accessType: 'movie',
      rental: directRental,
    };
  }

  // Check for pack rental that includes this movie
  const packItems = await db
    .select({ packId: shortPackItems.packId })
    .from(shortPackItems)
    .where(eq(shortPackItems.movieId, movieId));

  if (packItems.length > 0) {
    const packIds = packItems.map(p => p.packId);

    const [packRental] = await db
      .select({
        id: rentals.id,
        movieId: rentals.movieId,
        shortPackId: rentals.shortPackId,
        expiresAt: rentals.expiresAt,
      })
      .from(rentals)
      .where(
        and(
          inArray(rentals.shortPackId, packIds),
          gt(rentals.expiresAt, now),
          userClause
        )
      )
      .limit(1);

    if (packRental) {
      return {
        hasAccess: true,
        accessType: 'pack',
        rental: packRental,
      };
    }
  }

  return {
    hasAccess: false,
    accessType: null,
    rental: null,
  };
}

/**
 * Check if a user has an active rental for a specific pack.
 * 
 * @param packId - The pack UUID to check
 * @param user - User identifier (userId or anonymousId)
 * @returns The rental if found and active, null otherwise
 */
export async function checkPackAccess(
  packId: string,
  user: UserIdentifier
): Promise<{ rental: typeof rentals.$inferSelect | null; expired?: boolean; expiredAt?: Date }> {
  const { userId, anonymousId } = user;
  const now = new Date();
  
  const userClause = userId
    ? eq(rentals.userId, userId)
    : eq(rentals.anonymousId, anonymousId!);

  const [rental] = await db
    .select()
    .from(rentals)
    .where(
      and(
        eq(rentals.shortPackId, packId),
        userClause
      )
    )
    .limit(1);

  if (!rental) {
    return { rental: null };
  }

  if (rental.expiresAt <= now) {
    return {
      rental: null,
      expired: true,
      expiredAt: rental.expiresAt,
    };
  }

  return { rental };
}
