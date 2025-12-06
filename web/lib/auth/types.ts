/**
 * Authentication Types
 * 
 * Type definitions for user accounts and authentication.
 */

export interface User {
  id: string;
  email: string;
  displayName?: string;
  profileImageUrl?: string;
  timezone?: string; // IANA timezone, e.g., 'Asia/Vientiane'
  role: 'user' | 'admin';
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Session {
  token: string;
  expiresAt: string;
}

export interface AuthResponse {
  user: User;
  session: Session;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  displayName?: string;
}

export interface UpdateProfileData {
  displayName?: string;
  profileImageUrl?: string;
  timezone?: string; // IANA timezone, e.g., 'Asia/Vientiane'
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface UserStats {
  totalRentals: number;
  activeRentals: number;
  totalWatchProgress: number;
  completedMovies: number;
}

export interface MigrationResult {
  success: boolean;
  migratedRentals: number;
  migratedProgress: number;
  totalMigrated: number;
  message: string;
}
