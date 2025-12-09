// TMDB API Client
// Docs: https://developer.themoviedb.org/docs

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Get API key from environment variable
// Server-side: TMDB_API_KEY (secure, not exposed to browser)
// Client-side: NEXT_PUBLIC_TMDB_API_KEY (exposed to browser)
const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;

export interface TMDBMovieDetails {
  id: number;
  imdb_id: string | null;
  title: string;
  original_title: string;
  original_language: string;
  overview: string;
  tagline: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  adult: boolean;
  video: boolean;
  budget: number;
  revenue: number;
  status: string;
  homepage: string | null;
  genres: Array<{
    id: number;
    name: string;
  }>;
  production_companies: Array<{
    id: number;
    name: string;
    logo_path: string | null;
    origin_country: string;
  }>;
  production_countries: Array<{
    iso_3166_1: string;
    name: string;
  }>;
  spoken_languages: Array<{
    iso_639_1: string;
    english_name: string;
    name: string;
  }>;
  belongs_to_collection: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  } | null;
}

export interface TMDBSearchResult {
  page: number;
  results: Array<{
    id: number;
    title: string;
    original_title: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    release_date: string;
    vote_average: number;
    popularity: number;
  }>;
  total_pages: number;
  total_results: number;
}

export interface TMDBCredits {
  id: number;
  cast: Array<{
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    order: number;
    gender: number;
    known_for_department: string;
  }>;
  crew: Array<{
    id: number;
    name: string;
    job: string;
    department: string;
    profile_path: string | null;
    gender: number;
  }>;
}

export interface TMDBImage {
  aspect_ratio: number;
  height: number;
  iso_639_1: string | null; // Language code (null for no language)
  file_path: string;
  vote_average: number;
  vote_count: number;
  width: number;
}

export interface TMDBImages {
  id: number;
  posters: TMDBImage[];
  backdrops: TMDBImage[];
  logos: TMDBImage[];
}

export interface TMDBVideo {
  iso_639_1: string; // Language code
  iso_3166_1: string; // Country code
  name: string; // Video title
  key: string; // YouTube video ID or other platform key
  site: string; // Platform (YouTube, Vimeo, etc.)
  size: number; // Video resolution (360, 480, 720, 1080)
  type: string; // Trailer, Teaser, Clip, Featurette, Behind the Scenes, etc.
  official: boolean; // Official content from studio
  published_at: string; // ISO timestamp
  id: string; // TMDB video ID
}

export interface TMDBVideos {
  id: number;
  results: TMDBVideo[];
}

export interface TMDBPersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  gender: number; // 0=unknown, 1=female, 2=male, 3=non-binary
  popularity: number;
  imdb_id: string | null;
  homepage: string | null;
  also_known_as: string[];
}

class TMDBClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    if (!apiKey && !TMDB_API_KEY) {
      throw new Error(
        'TMDB API key is required. Add TMDB_API_KEY (server) or NEXT_PUBLIC_TMDB_API_KEY (client) to .env.local\n' +
        'Make sure to restart your dev server after adding the key.'
      );
    }
    this.apiKey = apiKey || TMDB_API_KEY!;
  }

  private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${TMDB_API_BASE}${endpoint}`);
    url.searchParams.append('api_key', this.apiKey);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ status_message: 'Unknown error' }));
      throw new Error(`TMDB API Error: ${error.status_message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get detailed information about a movie by TMDB ID
   */
  async getMovieDetails(tmdbId: number): Promise<TMDBMovieDetails> {
    return this.fetch<TMDBMovieDetails>(`/movie/${tmdbId}`);
  }

  /**
   * Search for movies by title
   */
  async searchMovies(query: string, page: number = 1): Promise<TMDBSearchResult> {
    return this.fetch<TMDBSearchResult>('/search/movie', {
      query,
      page: page.toString(),
    });
  }

  /**
   * Get credits (cast and crew) for a movie
   */
  async getMovieCredits(tmdbId: number): Promise<TMDBCredits> {
    return this.fetch<TMDBCredits>(`/movie/${tmdbId}/credits`);
  }

  /**
   * Get all images (posters, backdrops, logos) for a movie
   */
  async getMovieImages(tmdbId: number): Promise<TMDBImages> {
    return this.fetch<TMDBImages>(`/movie/${tmdbId}/images`);
  }

  /**
   * Get videos (trailers, teasers, clips) for a movie
   */
  async getMovieVideos(tmdbId: number): Promise<TMDBVideos> {
    return this.fetch<TMDBVideos>(`/movie/${tmdbId}/videos`);
  }

  /**
   * Get detailed information about a person (actor, director, etc.)
   */
  async getPersonDetails(personId: number): Promise<TMDBPersonDetails> {
    return this.fetch<TMDBPersonDetails>(`/person/${personId}`);
  }

  /**
   * Get the full URL for a TMDB image
   * @param path - The image path from TMDB (e.g., "/abc123.jpg")
   * @param size - Image size (w500, w780, original, etc.)
   */
  getImageUrl(path: string | null, size: 'w500' | 'w780' | 'original' = 'original'): string | null {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
  }
}

// Lazy singleton - only instantiate when actually used (in Server Actions)
let _tmdbClient: TMDBClient | null = null;

export const tmdbClient = {
  getMovieDetails: (tmdbId: number) => {
    if (!_tmdbClient) _tmdbClient = new TMDBClient();
    return _tmdbClient.getMovieDetails(tmdbId);
  },
  searchMovies: (query: string, page?: number) => {
    if (!_tmdbClient) _tmdbClient = new TMDBClient();
    return _tmdbClient.searchMovies(query, page);
  },
  getMovieCredits: (tmdbId: number) => {
    if (!_tmdbClient) _tmdbClient = new TMDBClient();
    return _tmdbClient.getMovieCredits(tmdbId);
  },
  getMovieImages: (tmdbId: number) => {
    if (!_tmdbClient) _tmdbClient = new TMDBClient();
    return _tmdbClient.getMovieImages(tmdbId);
  },
  getMovieVideos: (tmdbId: number) => {
    if (!_tmdbClient) _tmdbClient = new TMDBClient();
    return _tmdbClient.getMovieVideos(tmdbId);
  },
  getPersonDetails: (personId: number) => {
    if (!_tmdbClient) _tmdbClient = new TMDBClient();
    return _tmdbClient.getPersonDetails(personId);
  },
  getImageUrl: (path: string | null, size?: 'w500' | 'w780' | 'original') => {
    if (!_tmdbClient) _tmdbClient = new TMDBClient();
    return _tmdbClient.getImageUrl(path, size);
  },
};

// Export class for testing or custom instances
export default TMDBClient;
