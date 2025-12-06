/**
 * Rental Service
 * 
 * Manages movie rental state for the demo payment flow.
 * Currently uses localStorage for anonymous users.
 * 
 * EXTENSIBILITY:
 * - Replace localStorage calls with API calls for authenticated users
 * - Add payment gateway integration (initiatePayment, verifyPayment, etc.)
 * - Support different rental durations per movie or subscription tiers
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Rental duration in milliseconds.
 * Default: 24 hours
 * Adjust this value for testing (e.g., 60000 for 1 minute)
 */
export const RENTAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Grace period after rental expiration.
 * Users can still start/continue watching if they access the watch page
 * within this window after expiration.
 * Default: 2 hours
 */
export const GRACE_PERIOD_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * localStorage key prefix for rental records
 */
const STORAGE_KEY_PREFIX = 'lao_cinema_rental_';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format milliseconds as human-readable duration string (e.g., "2h 30m" or "45m")
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
// TYPES
// =============================================================================

export interface RentalRecord {
  movieId: string;
  purchasedAt: number; // Unix timestamp in milliseconds
  expiresAt: number;   // Unix timestamp in milliseconds
}

/**
 * Storage adapter interface for future extensibility.
 * Can be implemented with localStorage, API calls, or other storage mechanisms.
 */
export interface RentalStorageAdapter {
  getRental(movieId: string): RentalRecord | null;
  storeRental(movieId: string, record: RentalRecord): void;
  clearRental(movieId: string): void;
  getAllRentals(): RentalRecord[];
}

// =============================================================================
// LOCAL STORAGE ADAPTER (Current Implementation)
// =============================================================================

function getStorageKey(movieId: string): string {
  return `${STORAGE_KEY_PREFIX}${movieId}`;
}

/**
 * Get rental record from localStorage
 */
export function getRental(movieId: string): RentalRecord | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(getStorageKey(movieId));
    if (!stored) return null;
    
    const record: RentalRecord = JSON.parse(stored);
    return record;
  } catch (error) {
    console.error('Failed to read rental record:', error);
    return null;
  }
}

/**
 * Check if a rental is still valid (not expired)
 */
export function isRentalValid(movieId: string): boolean {
  const record = getRental(movieId);
  if (!record) return false;
  
  const now = Date.now();
  return now < record.expiresAt;
}

/**
 * Check if a rental is within the grace period.
 * Returns true if rental is expired but within grace period window.
 */
export function isInGracePeriod(movieId: string): boolean {
  const record = getRental(movieId);
  if (!record) return false;
  
  const now = Date.now();
  const gracePeriodEnd = record.expiresAt + GRACE_PERIOD_MS;
  
  // Must be expired but within grace period
  return now >= record.expiresAt && now < gracePeriodEnd;
}

/**
 * Check if user can access the watch page.
 * Returns true if rental is valid OR within grace period.
 */
export function canWatch(movieId: string): boolean {
  return isRentalValid(movieId) || isInGracePeriod(movieId);
}

/**
 * Get remaining grace period time in milliseconds.
 * Returns 0 if not in grace period.
 */
export function getRemainingGraceTime(movieId: string): number {
  const record = getRental(movieId);
  if (!record) return 0;
  
  const now = Date.now();
  const gracePeriodEnd = record.expiresAt + GRACE_PERIOD_MS;
  
  // Only return time if we're in grace period
  if (now >= record.expiresAt && now < gracePeriodEnd) {
    return gracePeriodEnd - now;
  }
  
  return 0;
}

/**
 * Format remaining grace time as human-readable string.
 */
export function formatRemainingGraceTime(movieId: string): string {
  return formatDurationMs(getRemainingGraceTime(movieId));
}

/**
 * Get remaining rental time in milliseconds
 * Returns 0 if rental is expired or doesn't exist
 */
export function getRemainingTime(movieId: string): number {
  const record = getRental(movieId);
  if (!record) return 0;
  
  const remaining = record.expiresAt - Date.now();
  return Math.max(0, remaining);
}

/**
 * Format remaining time as human-readable string
 */
export function formatRemainingTime(movieId: string): string {
  return formatDurationMs(getRemainingTime(movieId));
}

/**
 * Store a new rental record
 * Called after successful payment
 */
export function storeRental(movieId: string): RentalRecord {
  const now = Date.now();
  const record: RentalRecord = {
    movieId,
    purchasedAt: now,
    expiresAt: now + RENTAL_DURATION_MS,
  };
  
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getStorageKey(movieId), JSON.stringify(record));
    } catch (error) {
      console.error('Failed to store rental record:', error);
    }
  }
  
  return record;
}

/**
 * Clear a rental record (for testing or admin purposes)
 */
export function clearRental(movieId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(getStorageKey(movieId));
  } catch (error) {
    console.error('Failed to clear rental record:', error);
  }
}

/**
 * Get all active rentals
 */
export function getAllRentals(): RentalRecord[] {
  if (typeof window === 'undefined') return [];
  
  const rentals: RentalRecord[] = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const record: RentalRecord = JSON.parse(stored);
          rentals.push(record);
        }
      }
    }
  } catch (error) {
    console.error('Failed to get all rentals:', error);
  }
  
  return rentals;
}

/**
 * Clear all expired rentals (cleanup utility)
 */
export function clearExpiredRentals(): void {
  const rentals = getAllRentals();
  const now = Date.now();
  
  rentals.forEach((rental) => {
    if (now >= rental.expiresAt) {
      clearRental(rental.movieId);
    }
  });
}

// =============================================================================
// PAYMENT FLOW HOOKS (For Future Integration)
// =============================================================================

/**
 * Placeholder for initiating a real payment
 * Replace with actual payment gateway integration
 */
export async function initiatePayment(movieId: string): Promise<{ paymentUrl: string; transactionId: string }> {
  // TODO: Integrate with real payment gateway
  // This would typically:
  // 1. Call backend to create a payment session
  // 2. Return payment URL or QR code data
  // 3. Store transaction ID for verification
  // 4. Track analytics event (payment initiated)
  
  return {
    paymentUrl: 'https://en.wikipedia.org/wiki/Cinema_of_Laos',
    transactionId: `demo_${Date.now()}`,
  };
}

/**
 * Placeholder for verifying payment completion
 * Replace with actual payment verification
 */
export async function verifyPayment(transactionId: string): Promise<boolean> {
  // TODO: Verify payment with backend/payment gateway
  // For demo, always return true
  return true;
}

/**
 * Complete the rental after successful payment
 */
export async function completeRental(movieId: string, transactionId: string): Promise<RentalRecord> {
  // In real implementation:
  // 1. Verify payment with backend
  // 2. Backend stores rental in database (for authenticated users)
  // 3. Track analytics event (rental completed)
  // 4. Return rental record
  
  const isValid = await verifyPayment(transactionId);
  if (!isValid) {
    throw new Error('Payment verification failed');
  }
  
  return storeRental(movieId);
}
