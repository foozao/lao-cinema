// Movie data types compatible with TMDB schema + multi-language support

export type Language = 'en' | 'lo'; // English, Lao - can add more later

export interface LocalizedText {
  en: string; // English (default/fallback)
  lo?: string; // Lao (optional)
}

// Streaming platforms where a film may be exclusively available
export type StreamingPlatform = 'netflix' | 'prime' | 'disney' | 'hbo' | 'apple' | 'hulu' | 'other';

export interface ExternalPlatform {
  platform: StreamingPlatform;
  url?: string; // Optional link to the film on that platform
}

// Availability status for movies
export type AvailabilityStatus = 'auto' | 'available' | 'external' | 'unavailable' | 'coming_soon';

// Trailer - supports both YouTube and self-hosted video files
export type TrailerType = 'youtube' | 'video';

export interface BaseTrailer {
  id: string;
  type: TrailerType;
  name: string; // Trailer title
  official: boolean; // Official content from studio
  language?: string; // ISO 639-1 language code
  published_at?: string; // ISO timestamp
  order: number; // Display order
}

export interface YouTubeTrailer extends BaseTrailer {
  type: 'youtube';
  key: string; // YouTube video ID
}

export interface VideoTrailer extends BaseTrailer {
  type: 'video';
  video_url: string; // GCS or CDN URL
  video_format: 'hls' | 'mp4';
  video_quality: 'original' | '1080p' | '720p' | '480p' | '360p';
  size_bytes?: number;
  width?: number;
  height?: number;
  duration_seconds?: number;
}

export type Trailer = YouTubeTrailer | VideoTrailer;

// Movie type - feature films vs short films
export type MovieType = 'feature' | 'short';

export interface Movie {
  id: string;
  slug?: string; // Vanity URL slug (e.g., 'the-signal')
  type?: MovieType; // 'feature' (default) or 'short'
  
  // TMDB-compatible fields
  tmdb_id?: number;
  imdb_id?: string;
  tmdb_last_synced?: string; // ISO timestamp of last TMDB sync
  tmdb_sync_enabled?: boolean; // Whether to auto-sync from TMDB
  original_title?: string;
  original_language?: string; // ISO 639-1 code (e.g., 'en', 'lo')
  poster_path?: string;
  backdrop_path?: string;
  release_date: string;
  runtime?: number; // in minutes
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  adult: boolean;
  video?: boolean; // Indicates if video exists
  
  // Additional TMDB fields
  budget?: number; // Production budget in USD
  revenue?: number; // Box office revenue in USD
  status?: 'Rumored' | 'Planned' | 'In Production' | 'Post Production' | 'Released' | 'Canceled';
  tagline?: LocalizedText; // Movie tagline
  homepage?: string; // Official website URL
  belongs_to_collection?: Collection | null;
  
  // Localized fields
  title: LocalizedText;
  overview: LocalizedText;
  
  // Video sources (custom for streaming)
  video_sources: VideoSource[];
  
  // Subtitle tracks (WebVTT files)
  subtitle_tracks?: SubtitleTrack[];
  
  // Images (multiple posters/backdrops from TMDB)
  images?: MovieImage[];
  
  // Availability status
  availability_status?: AvailabilityStatus;
  
  // External availability (for films not available on our platform)
  external_platforms?: ExternalPlatform[];
  
  // Trailers (YouTube videos from TMDB)
  trailers?: Trailer[]; // Array of trailer objects
  
  // Relationships
  genres: Genre[];
  production_companies?: ProductionCompany[];
  production_countries?: ProductionCountry[];
  spoken_languages?: SpokenLanguage[];
  cast: CastMember[];
  crew: CrewMember[];
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface VideoSource {
  id: string;
  quality: 'original' | '1080p' | '720p' | '480p' | '360p';
  format: 'hls' | 'mp4';
  url: string;
  size_bytes?: number;
  width?: number;
  height?: number;
  aspect_ratio?: string; // e.g., '16:9', '2.35:1', 'mixed'
}

export interface SubtitleTrack {
  id: string;
  language: string; // ISO 639-1 code (en, lo, th, etc.)
  label: string; // Display name (e.g., 'English', 'ລາວ', 'ไทย')
  url: string; // URL to .vtt file
  is_default: boolean; // Default subtitle track
  kind: 'subtitles' | 'captions' | 'descriptions';
}

export interface MovieImage {
  id: string;
  type: 'poster' | 'backdrop' | 'logo';
  file_path: string; // TMDB image path (e.g., '/abc123.jpg')
  aspect_ratio?: number;
  height?: number;
  width?: number;
  iso_639_1?: string | null; // Language code for poster (null for no language)
  vote_average?: number;
  vote_count?: number;
  is_primary?: boolean; // Primary poster/backdrop to display
}

export interface Genre {
  id: number;
  name: LocalizedText;
}

// Movie credit for search results
export interface MovieCredit {
  movie_id: string;
  movie_title: LocalizedText;
  role?: LocalizedText; // Character name for cast, job title for crew
  type: 'cast' | 'crew';
}

// Person entity (actor, director, crew member)
export interface Person {
  id: number; // TMDB person ID
  name: LocalizedText;
  nicknames?: {
    en?: string[]; // English nicknames
    lo?: string[]; // Lao nicknames
  };
  biography?: LocalizedText;
  profile_path?: string;
  birthday?: string; // ISO date string
  deathday?: string; // ISO date string
  place_of_birth?: string;
  known_for_department?: string; // Acting, Directing, etc.
  departments?: string[]; // All departments they've worked in (Acting, Directing, Writing, etc.)
  popularity?: number;
  gender?: number; // 0=unknown, 1=female, 2=male, 3=non-binary
  imdb_id?: string;
  homepage?: string;
  movie_credits?: MovieCredit[]; // Brief credits for search results
}

// Cast member in a specific movie (extends Person with role info)
export interface CastMember {
  person: Person;
  character: LocalizedText;
  order: number;
}

// Crew member in a specific movie (extends Person with job info)
export interface CrewMember {
  person: Person;
  job: LocalizedText;
  department: string;
}

export interface Collection {
  id: number;
  name: LocalizedText;
  poster_path?: string;
  backdrop_path?: string;
}

export interface ProductionCompany {
  id: number;
  name: string | { en?: string; lo?: string };
  logo_path?: string;
  origin_country?: string;
}

export interface ProductionCountry {
  iso_3166_1: string; // ISO 3166-1 country code (e.g., 'US', 'LA')
  name: string;
}

export interface SpokenLanguage {
  iso_639_1: string; // ISO 639-1 language code (e.g., 'en', 'lo')
  english_name: string;
  name: string; // Native name
}

// =============================================================================
// SHORT FILM PACKS
// =============================================================================

// Short film pack - curated collection of short films
export interface ShortPack {
  id: string;
  slug?: string; // Vanity URL (e.g., 'lao-voices-2024')
  title: LocalizedText;
  description?: LocalizedText;
  tagline?: LocalizedText; // Short promotional text
  poster_path?: string;
  backdrop_path?: string;
  is_published: boolean;
  
  // Shorts in this pack (ordered)
  shorts: ShortPackItem[];
  
  // Computed fields
  total_runtime?: number; // Sum of all shorts' runtime in minutes
  short_count?: number; // Number of shorts in the pack
  
  // Metadata
  created_at: string;
  updated_at: string;
}

// Short film within a pack
export interface ShortPackItem {
  movie: Movie; // The short film (movie with type='short')
  order: number; // Display/playback order
}

// Summary version for listings (without full movie data)
export interface ShortPackSummary {
  id: string;
  slug?: string;
  title: LocalizedText;
  tagline?: LocalizedText;
  poster_path?: string;
  backdrop_path?: string;
  is_published: boolean;
  total_runtime?: number;
  short_count: number;
  short_posters?: string[]; // Poster paths from shorts for collage display
  directors?: LocalizedText[]; // Directors from all shorts in pack
}

// For future TMDB API integration
export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  original_language: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number;
  vote_average: number;
  vote_count: number;
  popularity: number;
  adult: boolean;
  video: boolean;
  genre_ids: number[];
  imdb_id?: string;
  budget?: number;
  revenue?: number;
  status?: string;
  tagline?: string;
  homepage?: string;
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  } | null;
  production_companies?: Array<{
    id: number;
    name: string;
    logo_path: string | null;
    origin_country: string;
  }>;
  production_countries?: Array<{
    iso_3166_1: string;
    name: string;
  }>;
  spoken_languages?: Array<{
    iso_639_1: string;
    english_name: string;
    name: string;
  }>;
}
