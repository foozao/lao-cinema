/**
 * Rentals API Client
 * 
 * Handles rental management for both authenticated and anonymous users.
 */

import { getAnonymousId } from '../anonymous-id';
import { getRawSessionToken } from '../auth/api-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// =============================================================================
// TYPES
// =============================================================================

export interface Rental {
  id: string;
  movieId: string;
  purchasedAt: string;
  expiresAt: string;
  transactionId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  movieTitle?: string;
  moviePosterPath?: string;
  movie?: any; // Full movie object from API
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
// HELPERS
// =============================================================================

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  const token = getRawSessionToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    // Anonymous user - send anonymous ID
    const anonymousId = getAnonymousId();
    if (anonymousId) {
      headers['X-Anonymous-Id'] = anonymousId;
    }
  }
  
  return headers;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Get all rentals for current user/anonymous
 * @param includeRecent - Include recently expired rentals (within 24 hours)
 */
export async function getRentals(includeRecent = false): Promise<RentalsResponse> {
  const url = new URL(`${API_URL}/rentals`);
  if (includeRecent) {
    url.searchParams.set('includeRecent', 'true');
  }
  
  const response = await fetch(url.toString(), {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch rentals');
  }
  
  return response.json();
}

/**
 * Check rental status for a specific movie
 */
export async function getRentalStatus(movieId: string): Promise<RentalStatusResponse> {
  const response = await fetch(`${API_URL}/rentals/${movieId}`, {
    headers: getAuthHeaders(),
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
  const response = await fetch(`${API_URL}/rentals/${movieId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
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
