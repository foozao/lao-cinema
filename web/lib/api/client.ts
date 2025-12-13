// API client for backend communication

import { getRawSessionToken } from '../auth/api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
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
  
  // Build headers with optional auth token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  // Add auth token if available
  const token = getRawSessionToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
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
  getAll: () => fetchAPI<{ movies: any[] }>('/movies'),

  // Get movie by ID
  getById: (id: string) => fetchAPI<any>(`/movies/${id}`),

  // Create movie
  create: (data: any) => fetchAPI<any>('/movies', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Update movie
  update: (id: string, data: any) => fetchAPI<any>(`/movies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // Delete movie
  delete: (id: string) => fetchAPI<{ message: string; id: string }>(`/movies/${id}`, {
    method: 'DELETE',
  }),

  // Set primary image
  setPrimaryImage: (movieId: string, imageId: string, type: 'poster' | 'backdrop' | 'logo') =>
    fetchAPI<{ success: boolean; message: string }>(`/movies/${movieId}/images/${imageId}/primary`, {
      method: 'PUT',
      body: JSON.stringify({ type }),
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
    return fetchAPI<{ people: any[] }>(`/people${query ? `?${query}` : ''}`);
  },
  
  // Search people (convenience method)
  search: (query: string, limit = 20) => 
    fetchAPI<{ people: any[] }>(`/people?search=${encodeURIComponent(query)}&limit=${limit}`),
  
  // Get person by ID
  getById: (id: string | number) => fetchAPI<any>(`/people/${id}`),
  
  // Create person
  create: (data: {
    name: { en: string; lo?: string };
    biography?: { en?: string; lo?: string };
    known_for_department?: string;
    birthday?: string;
    place_of_birth?: string;
  }) => fetchAPI<any>('/people', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  
  // Update person
  update: (id: string | number, data: any) => fetchAPI<any>(`/people/${id}`, {
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
    return fetchAPI<{ companies: any[] }>(`/production-companies${query ? `?${query}` : ''}`);
  },

  // Search production companies
  search: (query: string, limit = 20) =>
    fetchAPI<{ companies: any[] }>(`/production-companies?search=${encodeURIComponent(query)}&limit=${limit}`),

  // Get production company by ID
  getById: (id: number) => fetchAPI<any>(`/production-companies/${id}`),

  // Create production company
  create: (data: {
    id?: number;
    name: { en: string; lo?: string };
    slug?: string;
    logo_path?: string;
    custom_logo_url?: string;
    website_url?: string;
    origin_country?: string;
  }) => fetchAPI<any>('/production-companies', {
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
  }) => fetchAPI<any>(`/production-companies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  // Delete production company
  delete: (id: number) => fetchAPI<{ success: boolean }>(`/production-companies/${id}`, {
    method: 'DELETE',
  }),
};
