'use server';

// Server Actions for TMDB sync in edit page

import { tmdbClient } from '@/lib/tmdb';
import type { TMDBMovieDetails, TMDBCredits } from '@/lib/tmdb';

export async function syncMovieFromTMDB(tmdbId: number): Promise<{
  success: boolean;
  data?: TMDBMovieDetails;
  credits?: TMDBCredits;
  error?: string;
}> {
  try {
    // Fetch both movie details and credits in parallel
    const [movieData, creditsData] = await Promise.all([
      tmdbClient.getMovieDetails(tmdbId),
      tmdbClient.getMovieCredits(tmdbId),
    ]);
    
    return { 
      success: true, 
      data: movieData,
      credits: creditsData,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync from TMDB',
    };
  }
}
