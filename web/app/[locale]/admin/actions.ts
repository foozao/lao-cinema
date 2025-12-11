'use server';

// Server Actions for admin dashboard

import { tmdbClient, mapTMDBToMovie } from '@/lib/tmdb';

export async function syncSingleMovieFromTMDB(tmdbId: number): Promise<{
  success: boolean;
  data?: ReturnType<typeof mapTMDBToMovie>;
  error?: string;
}> {
  try {
    const [movieData, creditsData, imagesData, videosData] = await Promise.all([
      tmdbClient.getMovieDetails(tmdbId),
      tmdbClient.getMovieCredits(tmdbId),
      tmdbClient.getMovieImages(tmdbId),
      tmdbClient.getMovieVideos(tmdbId),
    ]);
    
    const mappedData = mapTMDBToMovie(movieData, creditsData, imagesData, videosData);
    
    return { success: true, data: mappedData };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync from TMDB',
    };
  }
}
