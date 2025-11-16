// Movie data types compatible with TMDB schema + multi-language support

export type Language = 'en' | 'lo'; // English, Lao - can add more later

export interface LocalizedText {
  en: string; // English (default/fallback)
  lo?: string; // Lao (optional)
}

export interface Movie {
  id: string;
  
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
}

export interface Genre {
  id: number;
  name: LocalizedText;
}

// Person entity (actor, director, crew member)
export interface Person {
  id: number; // TMDB person ID
  name: LocalizedText;
  biography?: LocalizedText;
  profile_path?: string;
  birthday?: string; // ISO date string
  deathday?: string; // ISO date string
  place_of_birth?: string;
  known_for_department?: string; // Acting, Directing, etc.
  popularity?: number;
  gender?: number; // 0=unknown, 1=female, 2=male, 3=non-binary
  imdb_id?: string;
  homepage?: string;
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
  name: string;
  logo_path?: string;
  origin_country: string;
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
