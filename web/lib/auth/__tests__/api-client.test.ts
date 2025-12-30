/**
 * Auth API Client Tests
 *
 * Tests the authentication API client functions.
 * Note: HttpOnly cookie behavior is tested via integration tests.
 * These unit tests verify API request formatting.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { setupFetchMock } from '../../__tests__/test-utils';

// Setup mocks
const mockFetch = setupFetchMock();

// Import after mocks
import {
  register,
  login,
  logout,
  logoutAll,
  getCurrentUser,
  updateProfile,
  changePassword,
  deleteAccount,
  getUserStats,
  migrateAnonymousData,
  isAuthenticated,
  setAuthenticatedState,
} from '../api-client';

describe('Auth API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setAuthenticatedState(false);
  });

  describe('register', () => {
    it('should register user with credentials: include', async () => {
      const mockResponse = {
        user: { id: 'user-123', email: 'test@example.com' },
        session: { token: 'session-token-123', expiresAt: new Date().toISOString() },
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await register({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
          credentials: 'include',
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw on registration failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Email already exists' }),
      });

      await expect(
        register({ email: 'existing@example.com', password: 'password123' })
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('login', () => {
    it('should login with credentials: include', async () => {
      const mockResponse = {
        user: { id: 'user-123', email: 'test@example.com' },
        session: { token: 'login-token-456', expiresAt: new Date().toISOString() },
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw on invalid credentials', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid credentials' }),
      });

      await expect(
        login({ email: 'test@example.com', password: 'wrongpassword' })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('should logout with credentials: include', async () => {
      setAuthenticatedState(true);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await logout();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
    });

    it('should handle logout when not authenticated', async () => {
      setAuthenticatedState(false);

      await logout();

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('logoutAll', () => {
    it('should logout all sessions with credentials: include', async () => {
      setAuthenticatedState(true);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await logoutAll();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout-all'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user with credentials: include', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: mockUser }),
      });

      const result = await getCurrentUser();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.objectContaining({
          credentials: 'include',
        })
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw on 401 response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      await expect(getCurrentUser()).rejects.toThrow('Session expired');
    });
  });

  describe('updateProfile', () => {
    it('should update profile with credentials: include', async () => {
      const updatedUser = { id: 'user-123', displayName: 'New Name' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: updatedUser }),
      });

      const result = await updateProfile({ displayName: 'New Name' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.objectContaining({
          method: 'PATCH',
          credentials: 'include',
          body: JSON.stringify({ displayName: 'New Name' }),
        })
      );
      expect(result).toEqual(updatedUser);
    });
  });

  describe('changePassword', () => {
    it('should change password with credentials: include', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await changePassword({
        currentPassword: 'oldpass',
        newPassword: 'newpass123',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me/password'),
        expect.objectContaining({
          method: 'PATCH',
          credentials: 'include',
        })
      );
    });

    it('should throw on wrong current password', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Incorrect password' }),
      });

      await expect(
        changePassword({ currentPassword: 'wrong', newPassword: 'new' })
      ).rejects.toThrow('Incorrect password');
    });
  });

  describe('deleteAccount', () => {
    it('should delete account with credentials: include', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await deleteAccount('password123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include',
          body: JSON.stringify({ password: 'password123' }),
        })
      );
    });
  });

  describe('getUserStats', () => {
    it('should fetch user stats with credentials: include', async () => {
      const mockStats = { totalRentals: 5, activeRentals: 2 };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ stats: mockStats }),
      });

      const result = await getUserStats();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/me/stats'),
        expect.objectContaining({
          credentials: 'include',
        })
      );
      expect(result).toEqual(mockStats);
    });
  });

  describe('migrateAnonymousData', () => {
    it('should migrate anonymous data with credentials: include', async () => {
      const mockResult = { migratedRentals: 2, migratedProgress: 1 };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResult),
      });

      const result = await migrateAnonymousData('anon-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/migrate'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ anonymousId: 'anon-123' }),
        })
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when authenticated', () => {
      setAuthenticatedState(true);

      expect(isAuthenticated()).toBe(true);
    });

    it('should return false when not authenticated', () => {
      setAuthenticatedState(false);

      expect(isAuthenticated()).toBe(false);
    });
  });

  describe('setAuthenticatedState', () => {
    it('should update auth state', () => {
      setAuthenticatedState(true);
      expect(isAuthenticated()).toBe(true);

      setAuthenticatedState(false);
      expect(isAuthenticated()).toBe(false);
    });
  });
});
