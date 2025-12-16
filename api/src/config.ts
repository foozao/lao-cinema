/**
 * Application Configuration
 * 
 * Central location for all configurable constants and environment variables.
 */

/**
 * Pre-Alpha Rental Limits
 * 
 * MAX_RENTALS_PER_MOVIE: Maximum total rentals allowed per movie (all users combined)
 * - Set to null or 0 to disable this limit
 * - Used during pre-alpha to protect scarce content
 * - Can be overridden via MAX_RENTALS_PER_MOVIE env var
 */
export const MAX_RENTALS_PER_MOVIE = parseInt(process.env.MAX_RENTALS_PER_MOVIE || '50');

/**
 * Check if per-movie rental limit is enabled
 */
export function isPerMovieRentalLimitEnabled(): boolean {
  return MAX_RENTALS_PER_MOVIE > 0;
}

/**
 * Rental duration in milliseconds (24 hours)
 */
export const RENTAL_DURATION_MS = 24 * 60 * 60 * 1000;
