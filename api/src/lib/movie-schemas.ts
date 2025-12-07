// Zod validation schemas for movie-related API endpoints
// Centralized schemas used across movie routes

import { z } from 'zod';

// =============================================================================
// CUSTOM VALIDATORS
// =============================================================================

/**
 * Validates slug format:
 * - Lowercase letters (a-z)
 * - Numbers (0-9)
 * - Hyphens (-)
 * - Cannot start or end with a hyphen
 * - Maximum 100 characters
 */
const slugValidator = z.string().max(100).regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  'Slug must contain only lowercase letters, numbers, and hyphens (cannot start/end with hyphen)'
);

// =============================================================================
// BASE SCHEMAS
// =============================================================================

export const LocalizedTextSchema = z.object({
  en: z.string(),
  lo: z.string().optional(),
});

export const OptionalLocalizedTextSchema = z.object({
  en: z.string().optional(),
  lo: z.string().optional(),
});

// =============================================================================
// RELATION SCHEMAS
// =============================================================================

export const GenreSchema = z.object({
  id: z.number(),
  name: LocalizedTextSchema,
});

export const ProductionCompanySchema = z.object({
  id: z.number(),
  name: z.string(),
  logo_path: z.string().optional(),
  origin_country: z.string(),
});

export const ProductionCountrySchema = z.object({
  iso_3166_1: z.string(),
  name: z.string(),
});

export const SpokenLanguageSchema = z.object({
  iso_639_1: z.string(),
  english_name: z.string(),
  name: z.string(),
});

export const CollectionSchema = z.object({
  id: z.number(),
  name: LocalizedTextSchema,
  poster_path: z.string().optional(),
  backdrop_path: z.string().optional(),
});

export const VideoSourceSchema = z.object({
  id: z.string(),
  quality: z.enum(['original', '1080p', '720p', '480p', '360p']),
  format: z.enum(['hls', 'mp4']),
  url: z.string(),
  size_bytes: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  aspect_ratio: z.string().optional(),
});

export const PersonSchema = z.object({
  id: z.number(),
  name: LocalizedTextSchema,
  biography: LocalizedTextSchema.optional(),
  profile_path: z.string().optional(),
  birthday: z.string().optional(),
  deathday: z.string().optional(),
  place_of_birth: z.string().optional(),
  known_for_department: z.string().optional(),
  popularity: z.number().optional(),
  gender: z.number().optional(),
  imdb_id: z.string().optional(),
  homepage: z.string().optional(),
});

export const CastMemberSchema = z.object({
  person: PersonSchema,
  character: LocalizedTextSchema,
  order: z.number(),
});

export const CrewMemberSchema = z.object({
  person: PersonSchema,
  job: LocalizedTextSchema,
  department: z.string(),
});

export const MovieImageSchema = z.object({
  id: z.string().optional(), // Optional for new images
  type: z.enum(['poster', 'backdrop', 'logo']),
  file_path: z.string(),
  aspect_ratio: z.number().optional(),
  height: z.number().optional(),
  width: z.number().optional(),
  iso_639_1: z.string().nullable().optional(),
  vote_average: z.number().optional(),
  vote_count: z.number().optional(),
  is_primary: z.boolean().optional(),
});

export const ExternalPlatformSchema = z.object({
  platform: z.enum(['netflix', 'prime', 'disney', 'hbo', 'apple', 'hulu', 'other']),
  url: z.string().optional(),
});

// =============================================================================
// MAIN MOVIE SCHEMAS
// =============================================================================

export const CreateMovieSchema = z.object({
  // TMDB fields
  tmdb_id: z.number().optional(),
  imdb_id: z.string().optional(),
  tmdb_last_synced: z.string().optional(),
  tmdb_sync_enabled: z.boolean().optional(),
  
  // Vanity URL
  slug: slugValidator.optional(),
  
  // Basic info
  original_title: z.string().optional(),
  original_language: z.string().optional(),
  poster_path: z.string().optional(),
  backdrop_path: z.string().optional(),
  release_date: z.string(),
  runtime: z.number().optional(),
  vote_average: z.number().optional(),
  vote_count: z.number().optional(),
  popularity: z.number().optional(),
  adult: z.boolean(),
  video: z.boolean().optional(),
  
  // Production
  budget: z.number().optional(),
  revenue: z.number().optional(),
  status: z.string().optional(),
  homepage: z.string().optional(),
  
  // Localized content
  title: LocalizedTextSchema,
  overview: LocalizedTextSchema,
  tagline: LocalizedTextSchema.optional(),
  
  // Availability
  availability_status: z.enum(['available', 'external', 'unavailable', 'coming_soon']),
  
  // Relationships
  genres: z.array(GenreSchema),
  production_companies: z.array(ProductionCompanySchema).optional(),
  production_countries: z.array(ProductionCountrySchema).optional(),
  spoken_languages: z.array(SpokenLanguageSchema).optional(),
  belongs_to_collection: CollectionSchema.nullable().optional(),
  
  // Video sources
  video_sources: z.array(VideoSourceSchema),
  
  // Cast and crew
  cast: z.array(CastMemberSchema).optional(),
  crew: z.array(CrewMemberSchema).optional(),
  
  // Images
  images: z.array(MovieImageSchema).optional(),
  
  // External platforms (for films not available on our platform)
  external_platforms: z.array(ExternalPlatformSchema).optional(),
});

export const UpdateMovieSchema = CreateMovieSchema.partial();

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type LocalizedText = z.infer<typeof LocalizedTextSchema>;
export type Genre = z.infer<typeof GenreSchema>;
export type Person = z.infer<typeof PersonSchema>;
export type CastMember = z.infer<typeof CastMemberSchema>;
export type CrewMember = z.infer<typeof CrewMemberSchema>;
export type MovieImage = z.infer<typeof MovieImageSchema>;
export type ExternalPlatform = z.infer<typeof ExternalPlatformSchema>;
export type VideoSource = z.infer<typeof VideoSourceSchema>;
export type CreateMovieInput = z.infer<typeof CreateMovieSchema>;
export type UpdateMovieInput = z.infer<typeof UpdateMovieSchema>;
