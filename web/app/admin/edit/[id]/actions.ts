'use server';

// Server Actions for TMDB sync in edit page

import { tmdbClient } from '@/lib/tmdb';
import type { TMDBMovieDetails } from '@/lib/tmdb';

export async function syncMovieFromTMDB(tmdbId: number): Promise<{
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
      error: error instanceof Error ? error.message : 'Failed to sync from TMDB',
    };
  }
}
