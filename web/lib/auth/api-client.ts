/**
 * Authentication API Client
 * 
 * Handles all HTTP requests to the backend auth API.
 * Manages session tokens and anonymous IDs.
 */

import { API_BASE_URL } from '@/lib/config';
import type {
  User,
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  UpdateProfileData,
  ChangePasswordData,
  UserStats,
  MigrationResult,
} from './types';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get session token from localStorage
 */
function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lao_cinema_session_token');
}

/**
 * Store session token in localStorage
 */
function setSessionToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('lao_cinema_session_token', token);
}

/**
 * Remove session token from localStorage
 */
function removeSessionToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('lao_cinema_session_token');
}

/**
 * Make authenticated API request
 */
async function authFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getSessionToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  
  // Only set Content-Type if there's a body
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
}

// =============================================================================
// AUTHENTICATION
// =============================================================================

/**
 * Register a new user
 */
export async function register(credentials: RegisterCredentials): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Registration failed');
  }
  
  const data: AuthResponse = await response.json();
  
  // Store session token
  setSessionToken(data.session.token);
  
  return data;
}

/**
 * Login with email and password
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }
  
  const data: AuthResponse = await response.json();
  
  // Store session token
  setSessionToken(data.session.token);
  
  return data;
}

/**
 * Logout (delete current session)
 */
export async function logout(): Promise<void> {
  const token = getRawSessionToken();
  if (!token) return;

  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
  });
  
  // Remove token regardless of response
  removeSessionToken();
}

/**
 * Logout from all devices
 */
export async function logoutAll(): Promise<void> {
  const token = getRawSessionToken();
  if (!token) return;

  await fetch(`${API_BASE_URL}/auth/logout-all`, {
    method: 'POST',
  });
  
  // Remove token regardless of response
  removeSessionToken();
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User> {
  const token = getRawSessionToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Invalid/expired token
      removeSessionToken();
      throw new Error('Session expired');
    }
    
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch user');
  }
  
  const data = await response.json();
  return data.user;
}

// =============================================================================
// PROFILE MANAGEMENT
// =============================================================================

/**
 * Update user profile
 */
export async function updateProfile(data: UpdateProfileData): Promise<User> {
  const token = getRawSessionToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update profile');
  }
  
  const result = await response.json();
  return result.user;
}

/**
 * Change password
 */
export async function changePassword(data: ChangePasswordData): Promise<void> {
  const token = getRawSessionToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/auth/me/password`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to change password');
  }
}

/**
 * Delete account
 */
export async function deleteAccount(password: string): Promise<void> {
  const token = getRawSessionToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'DELETE',
    body: JSON.stringify({ password }),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  // Remove token regardless of response
  removeSessionToken();
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete account');
  }
}

// =============================================================================
// USER DATA
// =============================================================================

/**
 * Get user statistics
 */
export async function getUserStats(): Promise<UserStats> {
  const token = getRawSessionToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/users/me/stats`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch stats');
  }
  
  const data = await response.json();
  return data.stats;
}

/**
 * Migrate anonymous data to authenticated account
 */
export async function migrateAnonymousData(anonymousId: string): Promise<MigrationResult> {
  const token = getRawSessionToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/users/migrate`, {
    method: 'POST',
    body: JSON.stringify({ anonymousId }),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to migrate data');
  }
  
  return response.json();
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Check if user is authenticated (has valid token)
 */
export function isAuthenticated(): boolean {
  return !!getSessionToken();
}

/**
 * Get raw session token (for direct API calls)
 */
export function getRawSessionToken(): string | null {
  return getSessionToken();
}
