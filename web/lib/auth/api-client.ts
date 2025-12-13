/**
 * Authentication API Client
 * 
 * Handles all HTTP requests to the backend auth API.
 * Manages session tokens and anonymous IDs.
 */

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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
  
  return fetch(`${API_URL}${endpoint}`, {
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
  const response = await authFetch('/auth/register', {
    method: 'POST',
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
  const response = await authFetch('/auth/login', {
    method: 'POST',
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
  const response = await authFetch('/auth/logout', {
    method: 'POST',
  });
  
  // Remove token regardless of response
  removeSessionToken();
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Logout failed');
  }
}

/**
 * Logout from all devices
 */
export async function logoutAll(): Promise<void> {
  const response = await authFetch('/auth/logout-all', {
    method: 'POST',
  });
  
  // Remove token regardless of response
  removeSessionToken();
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Logout failed');
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User> {
  const response = await authFetch('/auth/me');
  
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
  const response = await authFetch('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
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
  const response = await authFetch('/auth/me/password', {
    method: 'PATCH',
    body: JSON.stringify(data),
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
  const response = await authFetch('/auth/me', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
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
  const response = await authFetch('/users/me/stats');
  
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
  const response = await authFetch('/users/migrate', {
    method: 'POST',
    body: JSON.stringify({ anonymousId }),
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
