/**
 * Authentication Module
 * 
 * Central export point for all authentication-related functionality.
 */

// Context and hooks
export { AuthProvider, useAuth } from './auth-context';

// API client functions
export * as authApi from './api-client';

// Types
export type {
  User,
  Session,
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  UpdateProfileData,
  ChangePasswordData,
  UserStats,
  MigrationResult,
} from './types';
