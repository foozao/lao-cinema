/**
 * Custom hook for managing movie edit form state
 * Handles form data, validation, and change tracking
 */

import { useState, useCallback } from 'react';
import { sanitizeSlug, getSlugValidationError } from '@/lib/slug-utils';
import type { Movie } from '@/lib/types';

export interface MovieFormData {
  // English fields
  title_en: string;
  overview_en: string;
  tagline_en: string;
  
  // Lao fields
  title_lo: string;
  overview_lo: string;
  tagline_lo: string;
  
  // Common fields
  slug: string;
  original_title: string;
  original_language: string;
  release_date: string;
  runtime: string;
  vote_average: string;
  status: string;
  budget: string;
  revenue: string;
  homepage: string;
  imdb_id: string;
  poster_path: string;
  backdrop_path: string;
  video_url: string;
  video_quality: string;
  video_format: string;
  video_aspect_ratio: string;
}

const initialFormData: MovieFormData = {
  title_en: '',
  overview_en: '',
  tagline_en: '',
  title_lo: '',
  overview_lo: '',
  tagline_lo: '',
  slug: '',
  original_title: '',
  original_language: 'lo',
  release_date: '',
  runtime: '',
  vote_average: '',
  status: 'Released',
  budget: '',
  revenue: '',
  homepage: '',
  imdb_id: '',
  poster_path: '',
  backdrop_path: '',
  video_url: '',
  video_quality: 'original',
  video_format: 'mp4',
  video_aspect_ratio: '',
};

export function useMovieForm() {
  const [formData, setFormData] = useState<MovieFormData>(initialFormData);
  const [slugError, setSlugError] = useState<string | null>(null);

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSlugChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Auto-sanitize as user types
    const sanitized = sanitizeSlug(value);
    setFormData((prev) => ({ ...prev, slug: sanitized }));
    
    // Validate
    const error = getSlugValidationError(sanitized);
    setSlugError(error);
  }, []);

  const loadFromMovie = useCallback((movie: Movie) => {
    const newFormData: MovieFormData = {
      title_en: movie.title.en,
      title_lo: movie.title.lo || '',
      overview_en: movie.overview.en,
      overview_lo: movie.overview.lo || '',
      tagline_en: movie.tagline?.en || '',
      tagline_lo: movie.tagline?.lo || '',
      slug: movie.slug || '',
      original_title: movie.original_title || '',
      original_language: movie.original_language || 'lo',
      release_date: movie.release_date,
      runtime: movie.runtime?.toString() || '',
      vote_average: movie.vote_average?.toString() || '',
      status: movie.status || 'Released',
      budget: movie.budget?.toString() || '',
      revenue: movie.revenue?.toString() || '',
      homepage: movie.homepage || '',
      imdb_id: movie.imdb_id || '',
      poster_path: movie.poster_path || '',
      backdrop_path: movie.backdrop_path || '',
      video_url: movie.video_sources[0]?.url || '',
      video_quality: movie.video_sources[0]?.quality || 'original',
      video_format: movie.video_sources[0]?.format || 'mp4',
      video_aspect_ratio: movie.video_sources[0]?.aspect_ratio || '',
    };
    
    setFormData(newFormData);
    return newFormData;
  }, []);

  const updateFromSync = useCallback((syncedData: Partial<Movie>) => {
    setFormData((prev) => ({
      ...prev,
      // Update English content from TMDB
      title_en: syncedData.title?.en || prev.title_en,
      overview_en: syncedData.overview?.en || prev.overview_en,
      tagline_en: syncedData.tagline?.en || '',
      // Preserve Lao content
      title_lo: prev.title_lo,
      overview_lo: prev.overview_lo,
      tagline_lo: prev.tagline_lo,
      // Update metadata
      runtime: syncedData.runtime?.toString() || prev.runtime,
      vote_average: syncedData.vote_average?.toString() || prev.vote_average,
      budget: syncedData.budget?.toString() || prev.budget,
      revenue: syncedData.revenue?.toString() || prev.revenue,
      status: syncedData.status || prev.status,
      poster_path: syncedData.poster_path || prev.poster_path,
      backdrop_path: syncedData.backdrop_path || prev.backdrop_path,
    }));
  }, []);

  return {
    formData,
    setFormData,
    slugError,
    handleChange,
    handleSlugChange,
    loadFromMovie,
    updateFromSync,
  };
}
