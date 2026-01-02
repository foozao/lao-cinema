/**
 * Analytics API Client
 * 
 * Admin endpoints for platform analytics and content provider reporting.
 */

import { API_BASE_URL } from '@/lib/config';
import { getAuthHeaders } from './auth-headers';

// =============================================================================
// TYPES
// =============================================================================

export interface MovieRentalStats {
  total: number;
  active: number;
  revenue: number;
  currency: string;
  uniqueRenters: number;
  firstRental: string | null;
  lastRental: string | null;
}

export interface MovieWatchStats {
  totalWatchTime: number;
  uniqueWatchers: number;
  completions: number;
  averageProgress: number;
  completionRate: number;
}

export interface MovieAnalyticsDetail {
  movie: {
    id: string;
    title: Record<string, string>;
    posterPath: string | null;
    releaseDate: string | null;
    runtime: number | null;
  };
  rentals: MovieRentalStats;
  watch: MovieWatchStats;
  recentRentals: {
    id: string;
    purchasedAt: string;
    expiresAt: string;
    amount: number;
    currency: string;
    paymentMethod: string;
  }[];
}

export interface AllMoviesAnalytics {
  movieId: string;
  movieTitle: string;
  posterPath: string | null;
  totalRentals: number;
  activeRentals: number;
  totalRevenue: number;
  uniqueRenters: number;
}

export interface AnalyticsSummary {
  movies: {
    total: number;
  };
  rentals: {
    total: number;
    active: number;
    revenue: number;
    uniqueRenters: number;
  };
  watch: {
    totalWatchTime: number;
    uniqueWatchers: number;
    completions: number;
  };
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Get analytics summary for all movies (admin only)
 */
export async function getMoviesAnalytics(): Promise<{ movies: AllMoviesAnalytics[] }> {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/analytics/movies`, {
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch movies analytics');
  }

  return response.json();
}

/**
 * Get detailed analytics for a specific movie (admin only)
 */
export async function getMovieAnalyticsDetail(movieId: string): Promise<MovieAnalyticsDetail> {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/analytics/movies/${movieId}`, {
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch movie analytics' }));
    throw new Error(error.message || `HTTP ${response.status}: Failed to fetch movie analytics`);
  }

  return response.json();
}

/**
 * Get platform-wide analytics summary (admin only)
 */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/analytics/summary`, {
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch analytics summary');
  }

  return response.json();
}
