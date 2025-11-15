'use server';

// Server Actions for TMDB import
// This keeps the API key secure on the server

import { tmdbClient } from '@/lib/tmdb';
import type { TMDBMovieDetails, TMDBCredits } from '@/lib/tmdb';

export async function fetchMovieFromTMDB(tmdbId: number): Promise<{
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
      error: error instanceof Error ? error.message : 'Failed to fetch movie from TMDB',
    };
  }
}
