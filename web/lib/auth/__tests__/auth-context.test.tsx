/**
 * Auth Context Tests
 * 
 * Tests the authentication context provider and hook.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  private static channels: Map<string, MockBroadcastChannel[]> = new Map();

  constructor(name: string) {
    this.name = name;
    // Register this channel
    if (!MockBroadcastChannel.channels.has(name)) {
      MockBroadcastChannel.channels.set(name, []);
    }
    MockBroadcastChannel.channels.get(name)!.push(this);
  }

  postMessage(message: any) {
    // Simulate broadcasting to all other channels with the same name
    const channels = MockBroadcastChannel.channels.get(this.name) || [];
    channels.forEach(channel => {
      if (channel !== this && channel.onmessage) {
        channel.onmessage(new MessageEvent('message', { data: message }));
      }
    });
  }

  close() {
    const channels = MockBroadcastChannel.channels.get(this.name);
    if (channels) {
      const index = channels.indexOf(this);
      if (index > -1) {
        channels.splice(index, 1);
      }
    }
  }

  static reset() {
    this.channels.clear();
  }
}

(global as any).BroadcastChannel = MockBroadcastChannel;

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock anonymous-id module
jest.mock('../../anonymous-id', () => ({
  __esModule: true,
  getAnonymousId: jest.fn().mockReturnValue('anon-test-123'),
  clearAnonymousId: jest.fn(),
}));

// Mock auth API client
jest.mock('../api-client', () => ({
  __esModule: true,
  register: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  getCurrentUser: jest.fn(),
  migrateAnonymousData: jest.fn(),
  isAuthenticated: jest.fn(),
  setAuthenticatedState: jest.fn(),
}));

// Import mocked modules to get references
import * as anonymousIdModule from '../../anonymous-id';
import * as authApi from '../api-client';
import { useRouter } from 'next/navigation';

// Get typed mock references
const mockGetAnonymousId = anonymousIdModule.getAnonymousId as jest.Mock;
const mockClearAnonymousId = anonymousIdModule.clearAnonymousId as jest.Mock;
const mockRegister = authApi.register as jest.Mock;
const mockLogin = authApi.login as jest.Mock;
const mockLogout = authApi.logout as jest.Mock;
const mockGetCurrentUser = authApi.getCurrentUser as jest.Mock;
const mockMigrateAnonymousData = authApi.migrateAnonymousData as jest.Mock;
const mockIsAuthenticated = authApi.isAuthenticated as jest.Mock;

// Import after mocks
import { AuthProvider, useAuth } from '../auth-context';

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'user' as const,
  emailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('Auth Context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated.mockReturnValue(false);
    mockGetAnonymousId.mockReturnValue('anon-test-123');
    mockGetCurrentUser.mockRejectedValue(new Error('Not authenticated'));
    MockBroadcastChannel.reset();
  });

  afterEach(() => {
    MockBroadcastChannel.reset();
  });

  describe('Initial State', () => {
    it('should initialize with anonymous ID', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.anonymousId).toBe('anon-test-123');
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should restore user from existing session', async () => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle failed session restoration', async () => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetCurrentUser.mockRejectedValue(new Error('Session expired'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Register', () => {
    it('should register and set user', async () => {
      mockRegister.mockResolvedValue({
        user: mockUser,
        session: { token: 'session-token', expiresAt: new Date().toISOString() },
      });
      mockMigrateAnonymousData.mockResolvedValue({ message: 'Migrated' });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.register({
          email: 'new@example.com',
          password: 'password123',
        });
      });

      expect(mockRegister).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
      });
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should migrate anonymous data after registration', async () => {
      mockRegister.mockResolvedValue({
        user: mockUser,
        session: { token: 'session-token', expiresAt: new Date().toISOString() },
      });
      mockMigrateAnonymousData.mockResolvedValue({ message: 'Migrated' });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.register({
          email: 'new@example.com',
          password: 'password123',
        });
      });

      expect(mockMigrateAnonymousData).toHaveBeenCalledWith('anon-test-123');
      expect(mockClearAnonymousId).toHaveBeenCalled();
    });

    it('should throw on registration failure', async () => {
      mockRegister.mockRejectedValue(new Error('Email already exists'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.register({
            email: 'existing@example.com',
            password: 'password123',
          });
        })
      ).rejects.toThrow('Email already exists');

      expect(result.current.user).toBeNull();
    });
  });

  describe('Login', () => {
    it('should login and set user', async () => {
      mockLogin.mockResolvedValue({
        user: mockUser,
        session: { token: 'session-token', expiresAt: new Date().toISOString() },
      });
      mockMigrateAnonymousData.mockResolvedValue({ message: 'Migrated' });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should migrate anonymous data after login', async () => {
      mockLogin.mockResolvedValue({
        user: mockUser,
        session: { token: 'session-token', expiresAt: new Date().toISOString() },
      });
      mockMigrateAnonymousData.mockResolvedValue({ message: 'Migrated' });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(mockMigrateAnonymousData).toHaveBeenCalledWith('anon-test-123');
      expect(mockClearAnonymousId).toHaveBeenCalled();
    });

    it('should throw on login failure', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.login({
            email: 'wrong@example.com',
            password: 'wrongpassword',
          });
        })
      ).rejects.toThrow('Invalid credentials');

      expect(result.current.user).toBeNull();
    });

    it('should not fail login if migration fails', async () => {
      mockLogin.mockResolvedValue({
        user: mockUser,
        session: { token: 'session-token', expiresAt: new Date().toISOString() },
      });
      mockMigrateAnonymousData.mockRejectedValue(new Error('Migration failed'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      // Login should still succeed even if migration fails
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('Logout', () => {
    it('should logout and clear user', async () => {
      // Start with authenticated user
      mockIsAuthenticated.mockReturnValue(true);
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockLogout.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockLogout).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      // Router redirect to '/' is tested implicitly via logout behavior
    });

    it('should clear user even if API logout fails', async () => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockLogout.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.logout();
      });

      // Should still clear local state
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Refresh User', () => {
    it('should refresh user data', async () => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      // Update mock to return updated user
      const updatedUser = { ...mockUser, displayName: 'Updated Name' };
      mockGetCurrentUser.mockResolvedValue(updatedUser);

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(result.current.user).toEqual(updatedUser);
    });

    it('should clear user if refresh fails', async () => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      // Make refresh fail
      mockGetCurrentUser.mockRejectedValue(new Error('Session expired'));

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(result.current.user).toBeNull();
    });
  });

  describe('Migrate Data', () => {
    it('should return error when not authenticated', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const migrationResult = await act(async () => {
        return result.current.migrateData();
      });

      expect(migrationResult.success).toBe(false);
      expect(migrationResult.message).toContain('not authenticated');
    });

    it('should migrate data for authenticated user', async () => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockMigrateAnonymousData.mockResolvedValue({ message: 'Successfully migrated' });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      const migrationResult = await act(async () => {
        return result.current.migrateData();
      });

      expect(migrationResult.success).toBe(true);
      expect(mockMigrateAnonymousData).toHaveBeenCalledWith('anon-test-123');
    });
  });

  describe('useAuth hook', () => {
    it('should throw when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Cross-Tab Session Sync', () => {
    it('should sync logout across tabs', async () => {
      // Start with authenticated user
      mockGetCurrentUser.mockResolvedValue(mockUser);

      // Render two hooks simulating two tabs
      const { result: tab1 } = renderHook(() => useAuth(), { wrapper });
      const { result: tab2 } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(tab1.current.user).toEqual(mockUser);
        expect(tab2.current.user).toEqual(mockUser);
      });

      // Logout in tab1
      mockLogout.mockResolvedValue(undefined);
      await act(async () => {
        await tab1.current.logout();
      });

      // Tab2 should also be logged out
      await waitFor(() => {
        expect(tab2.current.user).toBeNull();
        expect(tab2.current.isAuthenticated).toBe(false);
      });
    });

    it('should sync login across tabs', async () => {
      // Start both tabs as unauthenticated
      const { result: tab1 } = renderHook(() => useAuth(), { wrapper });
      const { result: tab2 } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(tab1.current.user).toBeNull();
        expect(tab2.current.user).toBeNull();
      });

      // Login in tab1
      mockLogin.mockResolvedValue({
        user: mockUser,
        session: { token: 'session-token', expiresAt: new Date().toISOString() },
      });
      mockMigrateAnonymousData.mockResolvedValue({ message: 'Migrated' });

      await act(async () => {
        await tab1.current.login({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      // Tab2 should also have the user
      await waitFor(() => {
        expect(tab2.current.user).toEqual(mockUser);
        expect(tab2.current.isAuthenticated).toBe(true);
      });
    });

    it('should sync registration across tabs', async () => {
      // Start both tabs as unauthenticated
      const { result: tab1 } = renderHook(() => useAuth(), { wrapper });
      const { result: tab2 } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(tab1.current.user).toBeNull();
        expect(tab2.current.user).toBeNull();
      });

      // Register in tab1
      mockRegister.mockResolvedValue({
        user: mockUser,
        session: { token: 'session-token', expiresAt: new Date().toISOString() },
      });
      mockMigrateAnonymousData.mockResolvedValue({ message: 'Migrated' });

      await act(async () => {
        await tab1.current.register({
          email: 'new@example.com',
          password: 'password123',
        });
      });

      // Tab2 should also have the user
      await waitFor(() => {
        expect(tab2.current.user).toEqual(mockUser);
        expect(tab2.current.isAuthenticated).toBe(true);
      });
    });

    it('should generate new anonymous ID on cross-tab logout', async () => {
      // Start with authenticated user
      mockGetCurrentUser.mockResolvedValue(mockUser);

      const { result: tab1 } = renderHook(() => useAuth(), { wrapper });
      const { result: tab2 } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(tab1.current.user).toEqual(mockUser);
        expect(tab2.current.user).toEqual(mockUser);
      });

      // Setup new anonymous ID for tab2
      const newAnonymousId = 'new-anon-id';
      mockGetAnonymousId.mockReturnValue(newAnonymousId);

      // Logout in tab1
      mockLogout.mockResolvedValue(undefined);
      await act(async () => {
        await tab1.current.logout();
      });

      // Tab2 should have new anonymous ID
      await waitFor(() => {
        expect(tab2.current.anonymousId).toBe(newAnonymousId);
      });
    });
  });
});
