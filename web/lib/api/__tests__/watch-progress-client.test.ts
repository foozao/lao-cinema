/**
 * Watch Progress Client Tests
 *
 * Tests the watch progress API client functions.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock auth-headers module
jest.mock('../auth-headers', () => ({
  __esModule: true,
  getAuthHeaders: jest.fn(() => ({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token',
  })),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import after mocks
import {
  getAllWatchProgress,
  getWatchProgress,
  updateWatchProgress,
  deleteWatchProgress,
  getContinueWatching,
} from '../watch-progress-client';

describe('Watch Progress Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllWatchProgress', () => {
    it('should fetch all watch progress', async () => {
      const mockResponse = {
        progress: [
          {
            id: 'progress-1',
            movieId: 'movie-1',
            progressSeconds: 300,
            durationSeconds: 7200,
            completed: false,
            lastWatchedAt: new Date().toISOString(),
          },
        ],
        total: 1,
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getAllWatchProgress();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/watch-progress'),
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      await expect(getAllWatchProgress()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getWatchProgress', () => {
    it('should fetch watch progress for a movie', async () => {
      const mockProgress = {
        progress: {
          id: 'progress-1',
          movieId: 'movie-123',
          progressSeconds: 1800,
          durationSeconds: 7200,
          completed: false,
        },
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProgress),
      });

      const result = await getWatchProgress('movie-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/watch-progress/movie-123'),
        expect.any(Object)
      );
      expect(result).toEqual(mockProgress);
    });

    it('should return null progress when none exists', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ progress: null }),
      });

      const result = await getWatchProgress('movie-no-progress');

      expect(result.progress).toBeNull();
    });
  });

  describe('updateWatchProgress', () => {
    it('should update watch progress', async () => {
      const mockProgress = {
        progress: {
          id: 'progress-1',
          movieId: 'movie-123',
          progressSeconds: 3600,
          durationSeconds: 7200,
          completed: false,
        },
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProgress),
      });

      const result = await updateWatchProgress('movie-123', {
        progressSeconds: 3600,
        durationSeconds: 7200,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/watch-progress/movie-123'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            progressSeconds: 3600,
            durationSeconds: 7200,
          }),
        })
      );
      expect(result).toEqual(mockProgress);
    });

    it('should mark as completed', async () => {
      const mockProgress = {
        progress: {
          id: 'progress-1',
          movieId: 'movie-123',
          progressSeconds: 7200,
          durationSeconds: 7200,
          completed: true,
        },
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProgress),
      });

      const result = await updateWatchProgress('movie-123', {
        progressSeconds: 7200,
        durationSeconds: 7200,
        completed: true,
      });

      expect(result.progress.completed).toBe(true);
    });

    it('should throw on update failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid data' }),
      });

      await expect(
        updateWatchProgress('movie-123', {
          progressSeconds: -1,
          durationSeconds: 7200,
        })
      ).rejects.toThrow('Invalid data');
    });
  });

  describe('deleteWatchProgress', () => {
    it('should delete watch progress', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await deleteWatchProgress('movie-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/watch-progress/movie-123'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should throw on delete failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Not found' }),
      });

      await expect(deleteWatchProgress('movie-123')).rejects.toThrow('Not found');
    });
  });

  describe('getContinueWatching', () => {
    it('should return incomplete movies sorted by last watched', async () => {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const mockProgress = {
        progress: [
          {
            id: 'progress-1',
            movieId: 'movie-1',
            progressSeconds: 300,
            durationSeconds: 7200,
            completed: false,
            lastWatchedAt: dayAgo.toISOString(),
          },
          {
            id: 'progress-2',
            movieId: 'movie-2',
            progressSeconds: 1800,
            durationSeconds: 5400,
            completed: false,
            lastWatchedAt: now.toISOString(),
          },
          {
            id: 'progress-3',
            movieId: 'movie-3',
            progressSeconds: 600,
            durationSeconds: 3600,
            completed: false,
            lastWatchedAt: hourAgo.toISOString(),
          },
        ],
        total: 3,
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProgress),
      });

      const result = await getContinueWatching();

      // Should be sorted by lastWatchedAt descending (most recent first)
      expect(result).toHaveLength(3);
      expect(result[0].movieId).toBe('movie-2'); // now
      expect(result[1].movieId).toBe('movie-3'); // hourAgo
      expect(result[2].movieId).toBe('movie-1'); // dayAgo
    });

    it('should filter out completed movies', async () => {
      const mockProgress = {
        progress: [
          {
            id: 'progress-1',
            movieId: 'movie-1',
            progressSeconds: 7200,
            durationSeconds: 7200,
            completed: true, // completed - should be filtered
            lastWatchedAt: new Date().toISOString(),
          },
          {
            id: 'progress-2',
            movieId: 'movie-2',
            progressSeconds: 1800,
            durationSeconds: 5400,
            completed: false,
            lastWatchedAt: new Date().toISOString(),
          },
        ],
        total: 2,
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProgress),
      });

      const result = await getContinueWatching();

      expect(result).toHaveLength(1);
      expect(result[0].movieId).toBe('movie-2');
    });

    it('should filter out movies with zero progress', async () => {
      const mockProgress = {
        progress: [
          {
            id: 'progress-1',
            movieId: 'movie-1',
            progressSeconds: 0, // no progress - should be filtered
            durationSeconds: 7200,
            completed: false,
            lastWatchedAt: new Date().toISOString(),
          },
          {
            id: 'progress-2',
            movieId: 'movie-2',
            progressSeconds: 300,
            durationSeconds: 5400,
            completed: false,
            lastWatchedAt: new Date().toISOString(),
          },
        ],
        total: 2,
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProgress),
      });

      const result = await getContinueWatching();

      expect(result).toHaveLength(1);
      expect(result[0].movieId).toBe('movie-2');
    });

    it('should return empty array when no progress exists', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ progress: [], total: 0 }),
      });

      const result = await getContinueWatching();

      expect(result).toEqual([]);
    });
  });
});
