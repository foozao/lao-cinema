/**
 * Shared types for movie edit page components
 */

import type { Movie, ExternalPlatform, Trailer } from '@/lib/types';

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
  type: 'feature' | 'short';
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

export interface CastTranslations {
  [key: string]: {
    character_en: string;
    character_lo: string;
  };
}

export interface CrewTranslations {
  [key: string]: {
    job_en: string;
    job_lo: string;
  };
}

export type AvailabilityStatus = 'auto' | 'available' | 'external' | 'unavailable' | 'coming_soon';

export const initialFormData: MovieFormData = {
  title_en: '',
  overview_en: '',
  tagline_en: '',
  title_lo: '',
  overview_lo: '',
  tagline_lo: '',
  slug: '',
  type: 'feature',
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

export function loadFormDataFromMovie(movie: Movie): MovieFormData {
  return {
    title_en: movie.title.en,
    title_lo: movie.title.lo || '',
    overview_en: movie.overview.en,
    overview_lo: movie.overview.lo || '',
    tagline_en: movie.tagline?.en || '',
    tagline_lo: movie.tagline?.lo || '',
    slug: movie.slug || '',
    type: movie.type || 'feature',
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
}

export function buildCastTranslations(movie: Movie): CastTranslations {
  const castTrans: CastTranslations = {};
  movie.cast.forEach((member) => {
    const key = `${member.person.id}`;
    castTrans[key] = {
      character_en: member.character.en || '',
      character_lo: member.character.lo || '',
    };
  });
  return castTrans;
}

export function buildCrewTranslations(movie: Movie): CrewTranslations {
  const crewTrans: CrewTranslations = {};
  movie.crew.forEach((member) => {
    const key = `${member.person.id}-${member.department}`;
    crewTrans[key] = {
      job_en: member.job.en || '',
      job_lo: member.job.lo || '',
    };
  });
  return crewTrans;
}
