'use server';

// Server Actions for TMDB import
// This keeps the API key secure on the server

import { tmdbClient } from '@/lib/tmdb';
import type { TMDBMovieDetails, TMDBCredits, TMDBImages } from '@/lib/tmdb';

export async function fetchMovieFromTMDB(tmdbId: number): Promise<{
  success: boolean;
  data?: TMDBMovieDetails;
  credits?: TMDBCredits;
  images?: TMDBImages;
  error?: string;
}> {
  try {
    // Fetch movie details, credits, and images in parallel
    const [movieData, creditsData, imagesData] = await Promise.all([
      tmdbClient.getMovieDetails(tmdbId),
      tmdbClient.getMovieCredits(tmdbId),
      tmdbClient.getMovieImages(tmdbId),
    ]);
    
    return { 
      success: true, 
      data: movieData,
      credits: creditsData,
      images: imagesData,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch movie from TMDB',
    };
  }
}
