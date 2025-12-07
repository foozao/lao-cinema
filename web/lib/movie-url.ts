import type { Movie } from './types';

/**
 * Get the URL path for a movie, using slug if available, otherwise ID
 */
export function getMoviePath(movie: Movie | { id: string; slug?: string }): string {
  return movie.slug || movie.id;
}

/**
 * Get the full movie URL for a given movie
 */
export function getMovieUrl(movie: Movie | { id: string; slug?: string }): string {
  return `/movies/${getMoviePath(movie)}`;
}

/**
 * Get the watch page URL for a given movie
 */
export function getMovieWatchUrl(movie: Movie | { id: string; slug?: string }): string {
  return `/movies/${getMoviePath(movie)}/watch`;
}

/**
 * Get the cast & crew page URL for a given movie
 */
export function getMovieCastCrewUrl(movie: Movie | { id: string; slug?: string }): string {
  return `/movies/${getMoviePath(movie)}/cast-crew`;
}
