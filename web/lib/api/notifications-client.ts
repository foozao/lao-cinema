/**
 * Notifications API Client
 * 
 * Handles movie notification subscriptions for authenticated users.
 */

import { getAuthHeaders } from './auth-headers';
import { API_BASE_URL } from '@/lib/config';

// =============================================================================
// TYPES
// =============================================================================

export interface MovieNotification {
  id: string;
  movieId: string;
  createdAt: string;
  movie: {
    id: string;
    tmdb_id: number | null;
    title: { en: string; lo?: string };
    overview?: { en: string; lo?: string };
    poster_path: string | null;
    release_date: string | null;
    availability_status: string | null;
  };
}

export interface NotificationsResponse {
  notifications: MovieNotification[];
  total: number;
}

export interface NotificationStatusResponse {
  subscribed: boolean;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Get all movie notifications for current user
 */
export async function getMovieNotifications(): Promise<NotificationsResponse> {
  const response = await fetch(`${API_BASE_URL}/notifications/movies`, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch notifications');
  }
  
  return response.json();
}

/**
 * Check if user is subscribed to notifications for a specific movie
 */
export async function getNotificationStatus(movieId: string): Promise<NotificationStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/notifications/movies/${movieId}`, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to check notification status');
  }
  
  return response.json();
}

/**
 * Subscribe to notifications for a movie
 */
export async function subscribeToMovie(movieId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/notifications/movies/${movieId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({}),
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to subscribe to notifications');
  }
}

/**
 * Unsubscribe from notifications for a movie
 */
export async function unsubscribeFromMovie(movieId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/notifications/movies/${movieId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to unsubscribe from notifications');
  }
}

/**
 * Toggle notification subscription for a movie
 */
export async function toggleNotification(movieId: string, currentStatus: boolean): Promise<boolean> {
  if (currentStatus) {
    await unsubscribeFromMovie(movieId);
    return false;
  } else {
    await subscribeToMovie(movieId);
    return true;
  }
}
