'use server';

// Server Actions for TMDB import
// This keeps the API key secure on the server

import { tmdbClient } from '@/lib/tmdb';
import type { TMDBMovieDetails } from '@/lib/tmdb';

export async function fetchMovieFromTMDB(tmdbId: number): Promise<{
  success: boolean;
  data?: TMDBMovieDetails;
  error?: string;
}> {
  try {
    const data = await tmdbClient.getMovieDetails(tmdbId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch movie from TMDB',
    };
  }
}
