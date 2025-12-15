/**
 * Auth API Client Tests
 *
 * Tests the authentication API client functions.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

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
  getRawSessionToken,
} from '../api-client';

describe('Auth API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe('register', () => {
    it('should register user and store token', async () => {
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
        })
      );
      expect(result).toEqual(mockResponse);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'lao_cinema_session_token',
        'session-token-123'
      );
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
    it('should login and store token', async () => {
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

      expect(result).toEqual(mockResponse);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'lao_cinema_session_token',
        'login-token-456'
      );
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
    it('should logout and remove token', async () => {
      localStorageMock.setItem('lao_cinema_session_token', 'existing-token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await logout();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('lao_cinema_session_token');
    });

    it('should remove token even on API failure', async () => {
      localStorageMock.setItem('lao_cinema_session_token', 'existing-token');
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Server error' }),
      });

      await logout();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('lao_cinema_session_token');
    });
  });

  describe('logoutAll', () => {
    it('should logout all sessions and remove token', async () => {
      localStorageMock.setItem('lao_cinema_session_token', 'existing-token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await logoutAll();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout-all'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('lao_cinema_session_token');
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user with auth header', async () => {
      localStorageMock.setItem('lao_cinema_session_token', 'auth-token');
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: mockUser }),
      });

      const result = await getCurrentUser();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer auth-token',
          }),
        })
      );
      expect(result).toEqual(mockUser);
    });

    it('should remove token on 401 response', async () => {
      localStorageMock.setItem('lao_cinema_session_token', 'expired-token');
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      await expect(getCurrentUser()).rejects.toThrow('Session expired');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('lao_cinema_session_token');
    });
  });

  describe('updateProfile', () => {
    it('should update profile', async () => {
      localStorageMock.setItem('lao_cinema_session_token', 'auth-token');
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
          body: JSON.stringify({ displayName: 'New Name' }),
        })
      );
      expect(result).toEqual(updatedUser);
    });
  });

  describe('changePassword', () => {
    it('should change password', async () => {
      localStorageMock.setItem('lao_cinema_session_token', 'auth-token');
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
        })
      );
    });

    it('should throw on wrong current password', async () => {
      localStorageMock.setItem('lao_cinema_session_token', 'auth-token');
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
    it('should delete account and remove token', async () => {
      localStorageMock.setItem('lao_cinema_session_token', 'auth-token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await deleteAccount('password123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ password: 'password123' }),
        })
      );
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('lao_cinema_session_token');
    });
  });

  describe('getUserStats', () => {
    it('should fetch user stats', async () => {
      localStorageMock.setItem('lao_cinema_session_token', 'auth-token');
      const mockStats = { totalRentals: 5, activeRentals: 2 };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ stats: mockStats }),
      });

      const result = await getUserStats();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/me/stats'),
        expect.any(Object)
      );
      expect(result).toEqual(mockStats);
    });
  });

  describe('migrateAnonymousData', () => {
    it('should migrate anonymous data', async () => {
      localStorageMock.setItem('lao_cinema_session_token', 'auth-token');
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
          body: JSON.stringify({ anonymousId: 'anon-123' }),
        })
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists', () => {
      localStorageMock.setItem('lao_cinema_session_token', 'some-token');
      localStorageMock.getItem.mockReturnValue('some-token');

      expect(isAuthenticated()).toBe(true);
    });

    it('should return false when no token', () => {
      localStorageMock.getItem.mockReturnValue(null);

      expect(isAuthenticated()).toBe(false);
    });
  });

  describe('getRawSessionToken', () => {
    it('should return session token', () => {
      localStorageMock.getItem.mockReturnValue('raw-token-123');

      expect(getRawSessionToken()).toBe('raw-token-123');
    });

    it('should return null when no token', () => {
      localStorageMock.getItem.mockReturnValue(null);

      expect(getRawSessionToken()).toBeNull();
    });
  });
});
