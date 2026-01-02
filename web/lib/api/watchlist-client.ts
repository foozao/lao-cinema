/**
 * Watchlist API Client
 * 
 * Handles watchlist management for authenticated users.
 */

import { getAuthHeaders } from './auth-headers';
import { API_BASE_URL } from '@/lib/config';
import { apiFetchVoid } from './fetch';

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
    credentials: 'include',
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
    credentials: 'include',
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
  await apiFetchVoid(`/watchlist/${movieId}`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/**
 * Remove a movie from watchlist
 */
export async function removeFromWatchlist(movieId: string): Promise<void> {
  await apiFetchVoid(`/watchlist/${movieId}`, {
    method: 'DELETE',
  });
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
