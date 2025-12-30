/**
 * Rentals API Client
 * 
 * Handles rental management for both authenticated and anonymous users.
 */

import { getAuthHeaders } from './auth-headers';
import { API_BASE_URL } from '@/lib/config';
import { ensureCsrfToken } from '@/lib/csrf';

// =============================================================================
// TYPES
// =============================================================================

export interface Rental {
  id: string;
  movieId: string | null;
  shortPackId?: string | null;
  currentShortId?: string | null;
  purchasedAt: string;
  expiresAt: string;
  transactionId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  movieTitle?: string;
  moviePosterPath?: string;
  movie?: any; // Full movie object from API
  pack?: any; // Full pack object from API
  watchProgress?: {
    progressSeconds: number;
    durationSeconds: number;
    completed: boolean;
  } | null;
}

export interface RentalsResponse {
  rentals: Rental[];
  total: number;
}

export interface RentalStatusResponse {
  rental: Rental | null;
  expired?: boolean;
  expiredAt?: string;
}

export interface CreateRentalRequest {
  transactionId: string;
  amount?: number;
  paymentMethod?: string;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Get all rentals for current user/anonymous
 * @param includeRecent - Include recently expired rentals (within 24 hours)
 * @param includeAll - Include all rentals (active and expired)
 */
export async function getRentals(includeRecent = false, includeAll = false): Promise<RentalsResponse> {
  const url = new URL(`${API_BASE_URL}/rentals`);
  if (includeAll) {
    url.searchParams.set('includeAll', 'true');
  } else if (includeRecent) {
    url.searchParams.set('includeRecent', 'true');
  }
  
  const response = await fetch(url.toString(), {
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  
  if (!response.ok) {
    // Return empty result instead of throwing - gracefully handle API errors
    console.warn('Failed to fetch rentals:', response.status);
    return { rentals: [], total: 0 };
  }
  
  return response.json();
}

/**
 * Check rental status for a specific movie
 */
export async function getRentalStatus(movieId: string): Promise<RentalStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/rentals/${movieId}`, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch rental status');
  }
  
  return response.json();
}

/**
 * Create a new rental
 */
export async function createRental(
  movieId: string,
  data: CreateRentalRequest
): Promise<{ rental: Rental }> {
  // Ensure CSRF token exists before making POST request
  await ensureCsrfToken();
  
  const response = await fetch(`${API_BASE_URL}/rentals/${movieId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create rental');
  }
  
  return response.json();
}

/**
 * Check if user has active rental for a movie
 */
export async function hasActiveRental(movieId: string): Promise<boolean> {
  try {
    const { rental, expired } = await getRentalStatus(movieId);
    return rental !== null && !expired;
  } catch (error) {
    console.error('Failed to check rental status:', error);
    return false;
  }
}

/**
 * Update the current short position for a pack rental
 */
export async function updatePackPosition(
  rentalId: string,
  currentShortId: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/rentals/${rentalId}/position`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify({ currentShortId }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to update pack position');
  }
}

// =============================================================================
// PACK RENTALS
// =============================================================================

export interface PackRental {
  id: string;
  shortPackId: string;
  currentShortId?: string | null;
  purchasedAt: string;
  expiresAt: string;
  transactionId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  pack?: {
    id: string;
    slug: string;
    title: Record<string, string>;
    description?: Record<string, string>;
  };
}

export interface AccessCheckResponse {
  hasAccess: boolean;
  accessType?: 'movie' | 'pack';
  rental?: {
    id: string;
    shortPackId?: string;
    expiresAt: string;
  };
}

export interface PackRentalStatusResponse {
  rental: PackRental | null;
  expired?: boolean;
  expiredAt?: string;
}

/**
 * Check rental status for a specific pack
 */
export async function getPackRentalStatus(packId: string): Promise<PackRentalStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/rentals/packs/${packId}`, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch pack rental status');
  }
  
  return response.json();
}

/**
 * Create a new pack rental
 */
export async function createPackRental(
  packId: string,
  data: CreateRentalRequest
): Promise<{ rental: PackRental; pack: { id: string; slug: string; title: Record<string, string> } }> {
  // Ensure CSRF token exists before making POST request
  await ensureCsrfToken();
  
  const response = await fetch(`${API_BASE_URL}/rentals/packs/${packId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create pack rental');
  }
  
  return response.json();
}

/**
 * Check if user has access to a movie (via direct rental or pack rental)
 */
export async function checkMovieAccess(movieId: string): Promise<AccessCheckResponse> {
  const response = await fetch(`${API_BASE_URL}/rentals/access/${movieId}`, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to check access');
  }
  
  return response.json();
}
