// API client for backend communication

import { API_BASE_URL } from '../config';
import { getCsrfToken } from '../csrf';
import type {
  Movie,
  Person,
  ProductionCompany,
  ShortPack,
  ShortPackSummary,
  AccoladeEvent,
  AccoladeEdition,
  AccoladeCategory,
  AccoladeNomination,
  AccoladeEditionDetail,
  AccoladeSection,
  AccoladeSectionSelection,
  Trailer,
  SubtitleTrack,
  MovieImage,
  LocalizedText,
} from '../types';

// Homepage featured film type
interface FeaturedFilm {
  id: string;
  movieId: string;
  order: number;
  heroStartTime?: number | null;
  heroEndTime?: number | null;
  movie: Movie;
}

interface HomepageSettings {
  randomizeFeatured: boolean;
  heroType: 'disabled' | 'video' | 'image';
}

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  // Add CSRF token for state-changing requests
  const method = options.method?.toUpperCase() || 'GET';
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Send HttpOnly cookies for auth
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new APIError(
      error.error || `API request failed: ${response.statusText}`,
      response.status,
      error
    );
  }

  return response.json();
}

// Movie API methods
export const movieAPI = {
  // Get all movies
  getAll: () => fetchAPI<{ movies: Movie[] }>('/movies'),

  // Get movie by ID
  getById: (id: string) => fetchAPI<Movie>(`/movies/${id}`),

  // Create movie
  create: (data: Partial<Movie>) => fetchAPI<Movie>('/movies', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Update movie
  update: (id: string, data: Partial<Movie>) => fetchAPI<Movie>(`/movies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // Delete movie
  delete: (id: string) => fetchAPI<{ message: string; id: string }>(`/movies/${id}`, {
    method: 'DELETE',
  }),

  // Add image to movie
  addImage: (movieId: string, data: {
    type: 'poster' | 'backdrop' | 'logo';
    filePath: string;
    aspectRatio?: number;
    height?: number;
    width?: number;
    isPrimary?: boolean;
  }) =>
    fetchAPI<{ success: boolean; image: MovieImage }>(`/movies/${movieId}/images`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Set primary image
  setPrimaryImage: (movieId: string, imageId: string, type: 'poster' | 'backdrop' | 'logo') =>
    fetchAPI<{ success: boolean; message: string }>(`/movies/${movieId}/images/${imageId}/primary`, {
      method: 'PUT',
      body: JSON.stringify({ type }),
    }),

  // Delete image
  deleteImage: (movieId: string, imageId: string) =>
    fetchAPI<{ success: boolean; message: string }>(`/movies/${movieId}/images/${imageId}`, {
      method: 'DELETE',
    }),
};

// People API methods
export const peopleAPI = {
  // Get all people (with optional search)
  getAll: (params?: { search?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const query = searchParams.toString();
    return fetchAPI<{ people: Person[] }>(`/people${query ? `?${query}` : ''}`);
  },
  
  // Search people (convenience method)
  search: (query: string, limit = 20) => 
    fetchAPI<{ people: Person[] }>(`/people?search=${encodeURIComponent(query)}&limit=${limit}`),
  
  // Get person by ID
  getById: (id: string | number) => fetchAPI<Person>(`/people/${id}`),
  
  // Create person
  create: (data: {
    name: { en: string; lo?: string };
    biography?: { en?: string; lo?: string };
    known_for_department?: string;
    birthday?: string;
    place_of_birth?: string;
  }) => fetchAPI<Person>('/people', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  
  // Update person
  update: (id: string | number, data: Partial<Person>) => fetchAPI<Person>(`/people/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),

  // Merge two people (combine duplicates)
  merge: (sourceId: number, targetId: number) => fetchAPI<{
    success: boolean;
    message: string;
    targetId: number;
  }>('/people/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId, targetId }),
  }),

  // Delete person
  delete: (id: string | number) => fetchAPI<{
    success: boolean;
    message: string;
    id: number;
  }>(`/people/${id}`, {
    method: 'DELETE',
  }),

  // Add image to person
  addImage: (personId: string | number, data: {
    filePath: string;
    width?: number;
    height?: number;
    aspectRatio?: number;
    isPrimary?: boolean;
  }) => fetchAPI<{ success: boolean; image: { id: string; file_path: string } }>(`/people/${personId}/images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),

  // Delete person image
  deleteImage: async (personId: string | number, imageId: string): Promise<void> => {
    await fetchAPI(`/people/${personId}/images/${imageId}`, {
      method: 'DELETE',
    });
  },

  setPrimaryImage: async (personId: string | number, imageId: string): Promise<void> => {
    await fetchAPI(`/people/${personId}/images/${imageId}/primary`, {
      method: 'PUT',
      body: JSON.stringify({}),
    });
  },
};

// Cast/Crew API methods
export const castCrewAPI = {
  // Add cast member to movie
  addCast: (movieId: string, data: {
    person_id: number;
    character: { en: string; lo?: string };
    order?: number;
  }) => fetchAPI(`/movies/${movieId}/cast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  
  // Add crew member to movie
  addCrew: (movieId: string, data: {
    person_id: number;
    department: string;
    job: { en: string; lo?: string };
  }) => fetchAPI(`/movies/${movieId}/crew`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  
  // Remove cast member from movie
  removeCast: (movieId: string, personId: number) =>
    fetchAPI(`/movies/${movieId}/cast/${personId}`, { method: 'DELETE' }),
  
  // Remove crew member from movie
  removeCrew: (movieId: string, personId: number, department?: string) => {
    const query = department ? `?department=${encodeURIComponent(department)}` : '';
    return fetchAPI(`/movies/${movieId}/crew/${personId}${query}`, { method: 'DELETE' });
  },
};

// Movie-Production Company association API methods
export const movieProductionCompaniesAPI = {
  // Add production company to movie
  add: (movieId: string, data: { company_id: number; order?: number }) =>
    fetchAPI(`/movies/${movieId}/production-companies`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Remove production company from movie
  remove: (movieId: string, companyId: number) =>
    fetchAPI(`/movies/${movieId}/production-companies/${companyId}`, {
      method: 'DELETE',
    }),

  // Update production company order
  updateOrder: (movieId: string, companyId: number, order: number) =>
    fetchAPI(`/movies/${movieId}/production-companies/${companyId}`, {
      method: 'PATCH',
      body: JSON.stringify({ order }),
    }),
};

// Production Companies API methods
export const productionCompaniesAPI = {
  // Get all production companies
  getAll: (params?: { search?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const query = searchParams.toString();
    return fetchAPI<{ companies: ProductionCompany[] }>(`/production-companies${query ? `?${query}` : ''}`);
  },

  // Search production companies
  search: (query: string, limit = 20) =>
    fetchAPI<{ companies: ProductionCompany[] }>(`/production-companies?search=${encodeURIComponent(query)}&limit=${limit}`),

  // Get production company by ID
  getById: (id: number) => fetchAPI<ProductionCompany>(`/production-companies/${id}`),

  // Create production company
  create: (data: {
    id?: number;
    name: { en: string; lo?: string };
    slug?: string;
    logo_path?: string;
    custom_logo_url?: string;
    website_url?: string;
    origin_country?: string;
  }) => fetchAPI<ProductionCompany>('/production-companies', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Update production company
  update: (id: number, data: {
    name?: { en?: string; lo?: string };
    slug?: string;
    logo_path?: string;
    custom_logo_url?: string;
    website_url?: string;
    origin_country?: string;
  }) => fetchAPI<ProductionCompany>(`/production-companies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  // Delete production company
  delete: (id: number) => fetchAPI<{ success: boolean }>(`/production-companies/${id}`, {
    method: 'DELETE',
  }),
};

// Short Packs API methods
export const shortPacksAPI = {
  // Get all short packs
  getAll: async (params?: { published?: boolean }): Promise<{ short_packs: ShortPackSummary[] }> => {
    const url = new URL(`${API_BASE_URL}/short-packs`);
    if (params?.published !== undefined) {
      url.searchParams.set('published', String(params.published));
    }
    const response = await fetch(url.toString());
    if (!response.ok) {
      console.warn('Failed to fetch short packs:', response.status);
      return { short_packs: [] };
    }
    return response.json();
  },

  getPackContext: async (movieId: string): Promise<{ pack: ShortPack | null; position: number }> => {
    const { getAuthHeaders } = await import('./auth-headers');
    const response = await fetch(`${API_BASE_URL}/short-packs/context/${movieId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to get pack context');
    return response.json();
  },

  // Get published packs containing a movie (public, no auth)
  getPacksForMovie: async (movieId: string): Promise<{ packs: Array<{
    id: string;
    slug?: string;
    title: { en: string; lo?: string };
    poster_path?: string;
    short_count: number;
  }> }> => {
    const response = await fetch(`${API_BASE_URL}/short-packs/for-movie/${movieId}`);
    if (!response.ok) throw new Error('Failed to get packs for movie');
    return response.json();
  },

  // Get short pack by ID or slug
  getById: (id: string) => fetchAPI<ShortPack>(`/short-packs/${id}`),

  // Create short pack
  create: (data: {
    slug?: string;
    title: { en: string; lo?: string };
    description?: { en?: string; lo?: string };
    tagline?: { en?: string; lo?: string };
    poster_path?: string;
    backdrop_path?: string;
    price_usd?: number;
    is_published?: boolean;
  }) => fetchAPI<ShortPack>('/short-packs', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Update short pack
  update: (id: string, data: {
    slug?: string;
    title?: { en?: string; lo?: string };
    description?: { en?: string; lo?: string };
    tagline?: { en?: string; lo?: string };
    poster_path?: string;
    backdrop_path?: string;
    price_usd?: number;
    is_published?: boolean;
  }) => fetchAPI<ShortPack>(`/short-packs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // Delete short pack
  delete: (id: string) => fetchAPI<{ message: string; id: string }>(`/short-packs/${id}`, {
    method: 'DELETE',
  }),

  // Add short to pack
  addShort: (packId: string, movieId: string, order?: number) =>
    fetchAPI<{ success: boolean }>(`/short-packs/${packId}/shorts`, {
      method: 'POST',
      body: JSON.stringify({ movie_id: movieId, order }),
    }),

  // Remove short from pack
  removeShort: (packId: string, movieId: string) =>
    fetchAPI<{ success: boolean }>(`/short-packs/${packId}/shorts/${movieId}`, {
      method: 'DELETE',
    }),

  // Reorder shorts in pack
  reorderShorts: (packId: string, shorts: { movie_id: string; order: number }[]) =>
    fetchAPI<{ success: boolean }>(`/short-packs/${packId}/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ shorts }),
    }),
};

// Accolades API methods
export const accoladesAPI = {
  // ==========================================================================
  // EVENTS
  // ==========================================================================
  
  // Get all accolade events
  getShows: () => fetchAPI<{ shows: AccoladeEvent[] }>('/accolades/events'),
  
  // Get single accolade event with editions and categories
  getShow: (id: string) => fetchAPI<AccoladeEvent>(`/accolades/events/${id}`),
  
  // Create accolade event
  createShow: (data: {
    slug?: string;
    name: { en: string; lo?: string };
    description?: { en?: string; lo?: string };
    country?: string;
    city?: string;
    website_url?: string;
    logo_path?: string;
  }) => fetchAPI<AccoladeEvent>('/accolades/events', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Update accolade event
  updateShow: (id: string, data: {
    slug?: string;
    name?: { en?: string; lo?: string };
    description?: { en?: string; lo?: string };
    country?: string;
    city?: string;
    website_url?: string;
    logo_path?: string;
  }) => fetchAPI<AccoladeEvent>(`/accolades/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  // Delete accolade event
  deleteShow: (id: string) => fetchAPI<{ success: boolean }>(`/accolades/events/${id}`, {
    method: 'DELETE',
  }),

  // ==========================================================================
  // EDITIONS
  // ==========================================================================
  
  // Get edition with full nominations
  getEdition: (id: string) => fetchAPI<AccoladeEditionDetail>(`/accolades/editions/${id}`),
  
  // Create edition
  createEdition: (data: {
    event_id: string;
    year: number;
    edition_number?: number;
    name?: { en?: string; lo?: string };
    theme?: { en?: string; lo?: string };
    start_date?: string;
    end_date?: string;
  }) => fetchAPI<AccoladeEdition>('/accolades/editions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Update edition
  updateEdition: (id: string, data: {
    year?: number;
    edition_number?: number;
    name?: { en?: string; lo?: string };
    theme?: { en?: string; lo?: string };
    start_date?: string;
    end_date?: string;
  }) => fetchAPI<AccoladeEdition>(`/accolades/editions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  // Delete edition
  deleteEdition: (id: string) => fetchAPI<{ success: boolean }>(`/accolades/editions/${id}`, {
    method: 'DELETE',
  }),

  // ==========================================================================
  // CATEGORIES
  // ==========================================================================
  
  // Create category
  createCategory: (data: {
    event_id: string;
    section_id?: string; // Optional - if set, category is scoped to this section
    name: { en: string; lo?: string };
    description?: { en?: string; lo?: string };
    nominee_type: 'person' | 'movie';
    sort_order?: number;
  }) => fetchAPI<AccoladeCategory>('/accolades/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Update category
  updateCategory: (id: string, data: {
    section_id?: string | null; // Can set to null to make it event-wide
    name?: { en?: string; lo?: string };
    description?: { en?: string; lo?: string };
    nominee_type?: 'person' | 'movie';
    sort_order?: number;
  }) => fetchAPI<AccoladeCategory>(`/accolades/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  // Delete category
  deleteCategory: (id: string) => fetchAPI<{ success: boolean }>(`/accolades/categories/${id}`, {
    method: 'DELETE',
  }),

  // ==========================================================================
  // NOMINATIONS
  // ==========================================================================
  
  // Create nomination
  createNomination: (data: {
    edition_id: string;
    category_id: string;
    person_id?: number;
    movie_id?: string;
    for_movie_id?: string;
    work_title?: { en?: string; lo?: string };
    notes?: { en?: string; lo?: string };
    recognition_type?: { en?: string; lo?: string };
    is_winner?: boolean;
    sort_order?: number;
  }) => fetchAPI<AccoladeNomination>('/accolades/nominations', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Update nomination
  updateNomination: (id: string, data: {
    person_id?: number;
    movie_id?: string;
    for_movie_id?: string;
    work_title?: { en?: string; lo?: string };
    notes?: { en?: string; lo?: string };
    recognition_type?: { en?: string; lo?: string };
    is_winner?: boolean;
    sort_order?: number;
  }) => fetchAPI<AccoladeNomination>(`/accolades/nominations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  // Delete nomination
  deleteNomination: (id: string) => fetchAPI<{ success: boolean }>(`/accolades/nominations/${id}`, {
    method: 'DELETE',
  }),
  
  // Set winner for a category
  setWinner: (nomination_id: string) => fetchAPI<{ success: boolean }>('/accolades/nominations/set-winner', {
    method: 'POST',
    body: JSON.stringify({ nomination_id }),
  }),
  
  // Get all winners across all accolades (for showcase)
  getWinners: () => fetchAPI<{ winners: AccoladeNomination[]; selections: any[] }>('/accolades/winners'),

  // ==========================================================================
  // SECTIONS (festival program tracks - non-competitive)
  // ==========================================================================
  
  // Create section
  createSection: (data: {
    event_id: string;
    name: { en: string; lo?: string };
    description?: { en?: string; lo?: string };
    sort_order?: number;
  }) => fetchAPI<AccoladeSection>('/accolades/sections', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Update section
  updateSection: (id: string, data: {
    name?: { en?: string; lo?: string };
    description?: { en?: string; lo?: string };
    sort_order?: number;
  }) => fetchAPI<AccoladeSection>(`/accolades/sections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  // Delete section
  deleteSection: (id: string) => fetchAPI<{ success: boolean }>(`/accolades/sections/${id}`, {
    method: 'DELETE',
  }),
  
  // ==========================================================================
  // SECTION SELECTIONS (adding movies to sections)
  // ==========================================================================
  
  // Add movie to section
  addMovieToSection: (data: {
    section_id: string;
    edition_id: string;
    movie_id: string;
    notes?: { en?: string; lo?: string };
    sort_order?: number;
  }) => fetchAPI<AccoladeSectionSelection>('/accolades/sections/selections', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Remove movie from section
  removeMovieFromSection: (selectionId: string) => fetchAPI<{ success: boolean }>(`/accolades/sections/selections/${selectionId}`, {
    method: 'DELETE',
  }),
};

// Backward compatibility alias
export const awardsAPI = accoladesAPI;

// Homepage API methods
export const homepageAPI = {
  // Get featured films (public)
  getFeatured: () => fetchAPI<{ featured: FeaturedFilm[] }>('/homepage/featured'),

  // Get featured films with admin data
  getFeaturedAdmin: () => fetchAPI<{ featured: FeaturedFilm[] }>('/homepage/featured/admin'),

  // Get homepage settings
  getSettings: () => fetchAPI<{ settings: HomepageSettings }>('/homepage/settings'),

  // Update homepage settings
  updateSettings: (data: { randomizeFeatured?: boolean; heroType?: 'disabled' | 'video' | 'image' }) =>
    fetchAPI<{ settings: HomepageSettings }>('/homepage/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Add featured film
  addFeatured: (movieId: string, order?: number) =>
    fetchAPI<FeaturedFilm>('/homepage/featured', {
      method: 'POST',
      body: JSON.stringify({ movieId, order }),
    }),

  // Remove featured film
  removeFeatured: (id: string) =>
    fetchAPI<{ success: boolean }>(`/homepage/featured/${id}`, {
      method: 'DELETE',
    }),

  // Reorder featured films
  reorderFeatured: (items: { id: string; order: number }[]) =>
    fetchAPI<{ success: boolean }>('/homepage/featured/reorder', {
      method: 'PUT',
      body: JSON.stringify({ items }),
    }),

  // Update hero times for a featured film
  updateHeroTimes: (id: string, heroStartTime: number | null, heroEndTime: number | null) =>
    fetchAPI<FeaturedFilm>(`/homepage/featured/${id}/hero-times`, {
      method: 'PATCH',
      body: JSON.stringify({ heroStartTime, heroEndTime }),
    }),
};

// Subtitles API methods
export const subtitlesAPI = {
  // Add subtitle track to movie
  add: (movieId: string, data: {
    language: string;
    label: string;
    url: string;
    isDefault?: boolean;
    kind?: string;
  }) => fetchAPI<SubtitleTrack>(`/movies/${movieId}/subtitles`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Delete subtitle track
  delete: (movieId: string, trackId: string) =>
    fetchAPI<{ success: boolean }>(`/movies/${movieId}/subtitles/${trackId}`, {
      method: 'DELETE',
    }),

  // Update subtitle track
  update: (movieId: string, trackId: string, data: {
    isDefault?: boolean;
    linePosition?: number;
  }) => fetchAPI<SubtitleTrack>(`/movies/${movieId}/subtitles/${trackId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // Upload subtitle file (uses FormData, not JSON)
  upload: async (movieId: string, file: File): Promise<{ url: string; offsetCorrected?: boolean; offsetAmount?: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload/subtitle?movieId=${movieId}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Failed to upload subtitle file');
    }

    return response.json();
  },
};

// Trailers API methods
export const trailersAPI = {
  // Get trailers for a movie
  getForMovie: (movieId: string) => fetchAPI<Trailer[]>(`/trailers/${movieId}`),

  // Delete trailer
  delete: (trailerId: string) =>
    fetchAPI<{ success: boolean }>(`/trailers/${trailerId}`, {
      method: 'DELETE',
    }),

  // Update trailer
  update: (trailerId: string, data: { name?: string; video_url?: string; video_format?: string }) =>
    fetchAPI<Trailer>(`/trailers/${trailerId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Select thumbnail for trailer
  selectThumbnail: (trailerId: string, thumbnailNumber: number) =>
    fetchAPI<Trailer>(`/trailers/${trailerId}/select-thumbnail`, {
      method: 'POST',
      body: JSON.stringify({ thumbnailNumber }),
    }),

  // Add YouTube trailer
  addYouTube: (movieId: string, data: { key: string; name: string; official?: boolean; language?: string }) =>
    fetchAPI<Trailer>(`/trailers/${movieId}/youtube`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Add self-hosted trailer
  addSelfHosted: (movieId: string, data: { slug: string; name: string; format?: 'hls' | 'mp4' }) =>
    fetchAPI<Trailer>(`/trailers/${movieId}/self-hosted`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Reorder trailers
  reorder: (movieId: string, trailerIds: string[]) =>
    fetchAPI<Trailer[]>(`/trailers/${movieId}/reorder`, {
      method: 'POST',
      body: JSON.stringify({ trailer_ids: trailerIds }),
    }),
};
