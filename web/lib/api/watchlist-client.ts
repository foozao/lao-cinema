/**
 * Watchlist API Client
 * 
 * Handles watchlist management for authenticated users.
 */

import { getAuthHeaders } from './auth-headers';
import { API_BASE_URL } from '@/lib/config';

// =============================================================================
// TYPES
// =============================================================================

export interface WatchlistItem {
  id: string;
  addedAt: string;
  movie: {
    id: string;
    tmdb_id: number | null;
    title: { en: string; lo?: string };
    overview?: { en: string; lo?: string };
    poster_path: string | null;
    release_date: string | null;
    runtime: number | null;
    vote_average: number | null;
    availability_status: string | null;
  };
}

export interface WatchlistResponse {
  watchlist: WatchlistItem[];
  total: number;
}

export interface WatchlistStatusResponse {
  inWatchlist: boolean;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Get user's complete watchlist
 */
export async function getWatchlist(): Promise<WatchlistResponse> {
  const response = await fetch(`${API_BASE_URL}/watchlist`, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch watchlist');
  }
  
  return response.json();
}

/**
 * Check if a movie is in user's watchlist
 */
export async function getWatchlistStatus(movieId: string): Promise<WatchlistStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/watchlist/${movieId}`, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to check watchlist status');
  }
  
  return response.json();
}

/**
 * Add a movie to watchlist
 */
export async function addToWatchlist(movieId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/watchlist/${movieId}`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to add to watchlist');
  }
}

/**
 * Remove a movie from watchlist
 */
export async function removeFromWatchlist(movieId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/watchlist/${movieId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to remove from watchlist');
  }
}

/**
 * Toggle watchlist status for a movie
 */
export async function toggleWatchlist(movieId: string, currentStatus: boolean): Promise<boolean> {
  if (currentStatus) {
    await removeFromWatchlist(movieId);
    return false;
  } else {
    await addToWatchlist(movieId);
    return true;
  }
}
