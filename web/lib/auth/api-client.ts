/**
 * Authentication API Client
 * 
 * Handles all HTTP requests to the backend auth API.
 * Manages session tokens and anonymous IDs.
 */

import { API_BASE_URL } from '@/lib/config';
import { getCsrfToken, ensureCsrfToken } from '@/lib/csrf';
import type {
  User,
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  UpdateProfileData,
  ChangePasswordData,
  ChangeEmailData,
  UserStats,
  MigrationResult,
} from './types';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Track authentication state (cookie presence can't be read from JS due to HttpOnly)
let isAuthenticatedState = false;

/**
 * Make authenticated API request
 * Uses HttpOnly cookies (browser sends automatically with credentials: 'include')
 */
async function authFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  
  // Only set Content-Type if there's a body
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Add CSRF token for state-changing requests
  const method = options.method?.toUpperCase() || 'GET';
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    // Ensure CSRF token exists before making request
    await ensureCsrfToken();
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }
  
  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Send cookies with request
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
    throw new Error(error.detail || error.message || 'Registration failed');
  }
  
  const data: AuthResponse = await response.json();
  
  // Mark as authenticated (cookie is set by server)
  isAuthenticatedState = true;
  
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
    throw new Error(error.detail || error.message || 'Login failed');
  }
  
  const data: AuthResponse = await response.json();
  
  // Mark as authenticated (cookie is set by server)
  isAuthenticatedState = true;
  
  return data;
}

/**
 * Logout (delete current session)
 */
export async function logout(): Promise<void> {
  if (!isAuthenticatedState) return;

  await authFetch('/auth/logout', {
    method: 'POST',
  });
  
  // Mark as not authenticated (cookie is cleared by server)
  isAuthenticatedState = false;
}

/**
 * Logout from all devices
 */
export async function logoutAll(): Promise<void> {
  if (!isAuthenticatedState) return;

  await authFetch('/auth/logout-all', {
    method: 'POST',
  });
  
  // Mark as not authenticated (cookie is cleared by server)
  isAuthenticatedState = false;
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User> {
  const response = await authFetch('/auth/me');
  
  if (!response.ok) {
    if (response.status === 401) {
      // Invalid/expired session
      isAuthenticatedState = false;
      throw new Error('Session expired');
    }
    
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch user');
  }
  
  // If we got here, we're authenticated
  isAuthenticatedState = true;
  
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
 * Change email address
 * Requires password confirmation, resets email verified status
 */
export async function changeEmail(data: ChangeEmailData): Promise<User> {
  const response = await authFetch('/auth/me/email', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to change email');
  }
  
  const result = await response.json();
  return result.user;
}

/**
 * Delete account
 */
export async function deleteAccount(password: string): Promise<void> {
  const response = await authFetch('/auth/me', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
  
  // Mark as not authenticated regardless of response
  isAuthenticatedState = false;
  
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
 * Check if user is authenticated
 * Note: This is based on local state - call getCurrentUser() to verify with server
 */
export function isAuthenticated(): boolean {
  return isAuthenticatedState;
}

/**
 * Set authentication state (used by AuthContext after verifying session)
 */
export function setAuthenticatedState(authenticated: boolean): void {
  isAuthenticatedState = authenticated;
}
