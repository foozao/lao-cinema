/**
 * Rental Service (Database-backed)
 * 
 * Manages movie rentals using the backend API.
 * Supports both authenticated and anonymous users.
 */

import { 
  getRentals, 
  getRentalStatus, 
  createRental as apiCreateRental,
  hasActiveRental as apiHasActiveRental,
  type Rental 
} from './api/rentals-client';

// =============================================================================
// CONFIGURATION
// =============================================================================

export const RENTAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
export const GRACE_PERIOD_MS = 2 * 60 * 60 * 1000; // 2 hours

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format milliseconds as human-readable duration string
 */
function formatDurationMs(ms: number): string {
  if (ms <= 0) return '';
  
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// =============================================================================
// RENTAL FUNCTIONS
// =============================================================================

/**
 * Check if a rental is still valid (not expired)
 */
export async function isRentalValid(movieId: string): Promise<boolean> {
  try {
    const { rental, expired } = await getRentalStatus(movieId);
    return rental !== null && !expired;
  } catch (error) {
    console.error('Failed to check rental status:', error);
    return false;
  }
}

/**
 * Check if a rental is within the grace period
 */
export async function isInGracePeriod(movieId: string): Promise<boolean> {
  try {
    const { rental, expired, expiredAt } = await getRentalStatus(movieId);
    
    if (!rental || !expired || !expiredAt) return false;
    
    const now = Date.now();
    const expiryTime = new Date(expiredAt).getTime();
    const gracePeriodEnd = expiryTime + GRACE_PERIOD_MS;
    
    return now < gracePeriodEnd;
  } catch (error) {
    console.error('Failed to check grace period:', error);
    return false;
  }
}

/**
 * Check if user can watch the movie (valid rental or in grace period)
 */
export async function canWatch(movieId: string): Promise<boolean> {
  const valid = await isRentalValid(movieId);
  if (valid) return true;
  
  return await isInGracePeriod(movieId);
}

/**
 * Get remaining rental time in milliseconds
 */
export async function getRemainingTime(movieId: string): Promise<number> {
  try {
    const { rental } = await getRentalStatus(movieId);
    
    if (!rental) return 0;
    
    const now = Date.now();
    const expiryTime = new Date(rental.expiresAt).getTime();
    const remaining = expiryTime - now;
    
    return remaining > 0 ? remaining : 0;
  } catch (error) {
    console.error('Failed to get remaining time:', error);
    return 0;
  }
}

/**
 * Get remaining grace period time in milliseconds
 */
export async function getRemainingGraceTime(movieId: string): Promise<number> {
  try {
    const { rental, expired } = await getRentalStatus(movieId);
    
    if (!rental || !expired) return 0;
    
    const now = Date.now();
    const expiryTime = new Date(rental.expiresAt).getTime();
    const gracePeriodEnd = expiryTime + GRACE_PERIOD_MS;
    const remaining = gracePeriodEnd - now;
    
    return remaining > 0 ? remaining : 0;
  } catch (error) {
    console.error('Failed to get grace time:', error);
    return 0;
  }
}

/**
 * Format remaining time as human-readable string
 */
export async function getFormattedRemainingTime(movieId: string): Promise<string> {
  const remaining = await getRemainingTime(movieId);
  
  if (remaining <= 0) {
    const graceTime = await getRemainingGraceTime(movieId);
    if (graceTime > 0) {
      return `Grace period: ${formatDurationMs(graceTime)}`;
    }
    return 'Expired';
  }
  
  return formatDurationMs(remaining);
}

/**
 * Create a rental for a movie
 */
export async function purchaseRental(
  movieId: string,
  transactionId: string,
  amount: number = 500,
  paymentMethod: string = 'demo'
): Promise<Rental> {
  try {
    const { rental } = await apiCreateRental(movieId, {
      transactionId,
      amount,
      paymentMethod,
    });
    
    return rental;
  } catch (error) {
    console.error('Failed to create rental:', error);
    throw error;
  }
}

/**
 * Get all user rentals
 */
export async function getAllRentals(): Promise<Rental[]> {
  try {
    const { rentals } = await getRentals();
    return rentals;
  } catch (error) {
    console.error('Failed to get rentals:', error);
    return [];
  }
}

/**
 * Get active rentals (not expired)
 */
export async function getActiveRentals(): Promise<Rental[]> {
  const allRentals = await getAllRentals();
  const now = Date.now();
  
  return allRentals.filter(rental => 
    new Date(rental.expiresAt).getTime() > now
  );
}

/**
 * Check if user has an active rental for a movie
 */
export async function hasActiveRental(movieId: string): Promise<boolean> {
  return await apiHasActiveRental(movieId);
}
