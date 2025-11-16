// API client for backend communication

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
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
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
};

// People API methods
export const peopleAPI = {
  // Get all people
  getAll: () => fetchAPI<{ people: any[] }>('/people'),
  
  // Get person by ID
  getById: (id: string | number) => fetchAPI<any>(`/people/${id}`),
  
  // Update person
  update: (id: string | number, data: any) => fetchAPI<any>(`/people/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
};
