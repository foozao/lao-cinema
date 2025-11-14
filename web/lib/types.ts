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
  original_title?: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date: string;
  runtime?: number; // in minutes
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  adult: boolean;
  
  // Localized fields
  title: LocalizedText;
  overview: LocalizedText;
  
  // Video sources
  video_sources: VideoSource[];
  
  // Relationships
  genres: Genre[];
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

export interface CastMember {
  id: number;
  name: LocalizedText;
  character: LocalizedText;
  profile_path?: string;
  order: number;
}

export interface CrewMember {
  id: number;
  name: LocalizedText;
  job: LocalizedText;
  department: string;
  profile_path?: string;
}

// For future TMDB API integration
export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number;
  vote_average: number;
  vote_count: number;
  popularity: number;
  adult: boolean;
  genre_ids: number[];
  imdb_id?: string;
}
