'use server';

// Server Actions for TMDB sync in edit page

import { tmdbClient } from '@/lib/tmdb';
import type { TMDBMovieDetails, TMDBCredits, TMDBImages } from '@/lib/tmdb';

export async function syncMovieFromTMDB(tmdbId: number): Promise<{
  success: boolean;
  data?: TMDBMovieDetails;
  credits?: TMDBCredits;
  images?: TMDBImages;
  error?: string;
}> {
  try {
    // Fetch movie details, credits, and images in parallel (server-side; keeps API key secure)
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
      error: error instanceof Error ? error.message : 'Failed to sync from TMDB',
    };
  }
}

export async function fetchMovieImages(tmdbId: number): Promise<{
  success: boolean;
  images?: TMDBImages;
  error?: string;
}> {
  try {
    const imagesData = await tmdbClient.getMovieImages(tmdbId);
    
    return { 
      success: true, 
      images: imagesData,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch images from TMDB',
    };
  }
}
