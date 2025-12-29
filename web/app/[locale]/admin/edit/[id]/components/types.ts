/**
 * Shared types for movie edit page components
 */

import type { Movie, ExternalPlatform, Trailer } from '@/lib/types';

/**
 * Extract video slug from a full URL.
 * Handles formats like:
 * - "the-signal" (already a slug)
 * - "http://localhost:3002/videos/hls/the-signal/master.m3u8"
 * - "https://storage.googleapis.com/lao-cinema-videos/hls/the-signal/master.m3u8"
 */
export function extractVideoSlug(url: string): string {
  if (!url) return '';
  
  // If it's already just a slug (no slashes or only simple path), return as-is
  if (!url.includes('/') || url.match(/^[a-z0-9-]+$/)) {
    return url;
  }
  
  // Try to extract slug from HLS URL pattern: .../hls/{slug}/master.m3u8
  const hlsMatch = url.match(/\/hls\/([^/]+)\/master\.m3u8/);
  if (hlsMatch) {
    return hlsMatch[1];
  }
  
  // Try to extract from any URL with /videos/ pattern
  const videosMatch = url.match(/\/videos\/(?:hls\/)?([^/]+)/);
  if (videosMatch) {
    return videosMatch[1];
  }
  
  // Fallback: return the original URL (might be a different format)
  return url;
}

/**
 * Build full video URL from a slug for preview purposes.
 * Uses environment variable or falls back to production URL.
 */
export function buildVideoUrlPreview(slug: string): { local: string; production: string } {
  if (!slug) return { local: '', production: '' };
  
  return {
    local: `http://localhost:3002/videos/hls/${slug}/master.m3u8`,
    production: `https://storage.googleapis.com/lao-cinema-videos/hls/${slug}/master.m3u8`,
  };
}

/**
 * Extract trailer slug from a full URL.
 * Handles formats like:
 * - "the-signal" (already a slug)
 * - "http://localhost:3002/trailers/hls/the-signal/master.m3u8"
 * - "https://storage.googleapis.com/lao-cinema-videos/trailers/hls/the-signal/master.m3u8"
 * - "http://localhost:3002/trailers/the-signal.mp4"
 */
export function extractTrailerSlug(url: string): string {
  if (!url) return '';
  
  // If it's already just a slug (no slashes, no extension), return as-is
  if (!url.includes('/') && !url.includes('.')) {
    return url;
  }
  
  // Try to extract slug from HLS URL pattern: .../trailers/hls/{slug}/master.m3u8
  const hlsMatch = url.match(/\/trailers\/hls\/([^/]+)\/master\.m3u8/);
  if (hlsMatch) {
    return hlsMatch[1];
  }
  
  // Try to extract from MP4 URL pattern: .../trailers/{slug}.mp4
  const mp4Match = url.match(/\/trailers\/([^/]+)\.mp4/);
  if (mp4Match) {
    return mp4Match[1];
  }
  
  // Try generic pattern with /trailers/hls/
  const trailersHlsMatch = url.match(/\/trailers\/hls\/([^/.]+)/);
  if (trailersHlsMatch) {
    return trailersHlsMatch[1];
  }
  
  // Fallback: return the original URL (might be a different format or YouTube)
  return url;
}

/**
 * Build full trailer URL from a slug for preview purposes.
 * Trailers are at /trailers/hls/ (parallel to /videos/hls/)
 */
export function buildTrailerUrlPreview(slug: string, format: 'hls' | 'mp4' = 'hls'): { local: string; production: string } {
  if (!slug) return { local: '', production: '' };
  
  // Trailers: /trailers/hls/{slug}/master.m3u8 (parallel to /videos/hls/)
  if (format === 'hls') {
    return {
      local: `http://localhost:3002/trailers/hls/${slug}/master.m3u8`,
      production: `https://storage.googleapis.com/lao-cinema-videos/trailers/hls/${slug}/master.m3u8`,
    };
  }
  
  // MP4: /trailers/{slug}.mp4 (no /hls/ subfolder)
  return {
    local: `http://localhost:3002/trailers/${slug}.mp4`,
    production: `https://storage.googleapis.com/lao-cinema-videos/trailers/${slug}.mp4`,
  };
}

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
  has_burned_subtitles: boolean | string; // Can be boolean or string from form handlers
  burned_subtitles_language: string;
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
  has_burned_subtitles: false,
  burned_subtitles_language: '',
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
    video_url: extractVideoSlug(movie.video_sources[0]?.url || ''),
    video_quality: movie.video_sources[0]?.quality || 'original',
    video_format: movie.video_sources[0]?.format || 'mp4',
    video_aspect_ratio: movie.video_sources[0]?.aspect_ratio || '',
    has_burned_subtitles: movie.video_sources[0]?.has_burned_subtitles || false,
    burned_subtitles_language: movie.video_sources[0]?.burned_subtitles_language || '',
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
