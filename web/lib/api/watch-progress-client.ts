/**
 * Watch Progress API Client
 * 
 * Handles watch progress tracking for both authenticated and anonymous users.
 */

import { getAuthHeaders } from './auth-headers';
import { API_BASE_URL } from '@/lib/config';

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
  const response = await fetch(`${API_BASE_URL}/watch-progress`, {
    headers: getAuthHeaders(),
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
  const response = await fetch(`${API_BASE_URL}/watch-progress/${movieId}`, {
    headers: getAuthHeaders(),
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
  const response = await fetch(`${API_BASE_URL}/watch-progress/${movieId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update watch progress');
  }
  
  return response.json();
}

/**
 * Delete watch progress for a movie
 */
export async function deleteWatchProgress(movieId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/watch-progress/${movieId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete watch progress');
  }
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
