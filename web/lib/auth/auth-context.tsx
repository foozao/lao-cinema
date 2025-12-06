'use client';

/**
 * Authentication Context
 * 
 * Provides authentication state and functions throughout the app.
 * Supports both authenticated users and anonymous users.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAnonymousId, clearAnonymousId } from '../anonymous-id';
import * as authApi from './api-client';
import type { User, LoginCredentials, RegisterCredentials } from './types';

// =============================================================================
// TYPES
// =============================================================================

interface AuthContextValue {
  user: User | null;
  anonymousId: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  migrateData: () => Promise<{ success: boolean; message: string }>;
}

// =============================================================================
// CONTEXT
// =============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [anonymousId, setAnonymousId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  
  // Initialize: Get anonymous ID and check for existing session
  useEffect(() => {
    const initialize = async () => {
      // Always get/create anonymous ID
      const anonId = getAnonymousId();
      setAnonymousId(anonId);
      
      // Check if user is authenticated
      if (authApi.isAuthenticated()) {
        try {
          const currentUser = await authApi.getCurrentUser();
          setUser(currentUser);
        } catch (error) {
          console.error('Failed to fetch current user:', error);
          // Session expired or invalid
          setUser(null);
        }
      }
      
      setIsLoading(false);
    };
    
    initialize();
  }, []);
  
  // =============================================================================
  // AUTHENTICATION FUNCTIONS
  // =============================================================================
  
  /**
   * Register a new user
   */
  const register = useCallback(async (credentials: RegisterCredentials) => {
    setIsLoading(true);
    try {
      const { user: newUser } = await authApi.register(credentials);
      setUser(newUser);
      
      // Migrate database records from anonymousId to userId
      if (anonymousId) {
        try {
          console.log('[Auth] Migrating data for anonymous user:', anonymousId);
          const result = await authApi.migrateAnonymousData(anonymousId);
          console.log('[Auth] Migration successful:', result);
          clearAnonymousId();
        } catch (migrationError) {
          console.error('[Auth] Migration failed:', migrationError);
          // Don't fail registration if migration fails
        }
      }
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
    setIsLoading(false);
  }, [anonymousId]);
  
  /**
   * Login with credentials
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const { user: authenticatedUser } = await authApi.login(credentials);
      setUser(authenticatedUser);
      
      // Migrate database records from anonymousId to userId
      if (anonymousId) {
        try {
          console.log('[Auth] Migrating data for anonymous user:', anonymousId);
          const result = await authApi.migrateAnonymousData(anonymousId);
          console.log('[Auth] Migration successful:', result);
          clearAnonymousId();
        } catch (migrationError) {
          console.error('[Auth] Migration failed:', migrationError);
          // Don't fail login if migration fails
        }
      }
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
    setIsLoading(false);
  }, [anonymousId]);
  
  /**
   * Logout
   */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout failed:', error);
      // Continue with local logout even if API call fails
    }
    
    setUser(null);
    
    // Generate new anonymous ID
    const newAnonId = getAnonymousId();
    setAnonymousId(newAnonId);
    
    // Redirect to home
    router.push('/');
  }, [router]);
  
  /**
   * Refresh current user data
   */
  const refreshUser = useCallback(async () => {
    if (!authApi.isAuthenticated()) {
      setUser(null);
      return;
    }
    
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
    }
  }, []);
  
  /**
   * Manually trigger data migration
   * (Usually called automatically after login/register)
   */
  const migrateData = useCallback(async () => {
    if (!user || !anonymousId) {
      return {
        success: false,
        message: 'Cannot migrate: user not authenticated or no anonymous data',
      };
    }
    
    try {
      const result = await authApi.migrateAnonymousData(anonymousId);
      clearAnonymousId();
      
      // Generate new anonymous ID for future use
      const newAnonId = getAnonymousId();
      setAnonymousId(newAnonId);
      
      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Migration failed',
      };
    }
  }, [user, anonymousId]);
  
  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================
  
  const value: AuthContextValue = {
    user,
    anonymousId,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    migrateData,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * useAuth hook
 * Access authentication state and functions
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
