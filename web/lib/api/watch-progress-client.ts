/**
 * Watch Progress API Client
 * 
 * Handles watch progress tracking for both authenticated and anonymous users.
 */

import { getAuthHeadersAsync } from './auth-headers';
import { API_BASE_URL } from '@/lib/config';
import { apiFetch, apiFetchVoid } from './fetch';

// =============================================================================
// TYPES
// =============================================================================

export interface WatchProgress {
  id: string;
  movieId: string;
  progressSeconds: number;
  durationSeconds: number;
  completed: boolean;
  lastWatchedAt: string;
  createdAt: string;
  updatedAt: string;
  movieTitle?: string;
  moviePosterPath?: string;
  movieBackdropPath?: string;
}

export interface WatchProgressResponse {
  progress: WatchProgress[];
  total: number;
}

export interface SingleProgressResponse {
  progress: WatchProgress | null;
}

export interface UpdateProgressRequest {
  progressSeconds: number;
  durationSeconds: number;
  completed?: boolean;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Get all watch progress for current user/anonymous
 */
export async function getAllWatchProgress(): Promise<WatchProgressResponse> {
  const headers = await getAuthHeadersAsync();
  const response = await fetch(`${API_BASE_URL}/watch-progress`, {
    headers,
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch watch progress');
  }
  
  return response.json();
}

/**
 * Get watch progress for a specific movie
 */
export async function getWatchProgress(movieId: string): Promise<SingleProgressResponse> {
  const headers = await getAuthHeadersAsync();
  const response = await fetch(`${API_BASE_URL}/watch-progress/${movieId}`, {
    headers,
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch watch progress');
  }
  
  return response.json();
}

/**
 * Update or create watch progress for a movie
 */
export async function updateWatchProgress(
  movieId: string,
  data: UpdateProgressRequest
): Promise<{ progress: WatchProgress }> {
  return apiFetch<{ progress: WatchProgress }>(`/watch-progress/${movieId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete watch progress for a movie
 */
export async function deleteWatchProgress(movieId: string): Promise<void> {
  await apiFetchVoid(`/watch-progress/${movieId}`, {
    method: 'DELETE',
  });
}

/**
 * Get continue watching list (incomplete movies, sorted by recently watched)
 */
export async function getContinueWatching(): Promise<WatchProgress[]> {
  const { progress } = await getAllWatchProgress();
  
  // Filter incomplete movies and sort by last watched
  return progress
    .filter(p => !p.completed && p.progressSeconds > 0)
    .sort((a, b) => 
      new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime()
    );
}
