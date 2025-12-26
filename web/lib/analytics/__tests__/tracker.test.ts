/**
 * Video Analytics Tracker Tests
 *
 * Tests the useVideoAnalytics hook which tracks video playback
 * for analytics and continue watching functionality.
 */

import { renderHook, act } from '@testing-library/react';
import { useVideoAnalytics } from '../tracker';
import * as storage from '../storage';
import * as watchProgressClient from '../../api/watch-progress-client';

// Mock the storage module
jest.mock('../storage', () => ({
  generateSessionId: jest.fn(() => 'test-session-123'),
  getDeviceType: jest.fn(() => 'desktop'),
  getViewerId: jest.fn(() => 'test-viewer-456'),
  findResumableSession: jest.fn(() => null),
  saveSession: jest.fn(),
  logEvent: jest.fn(),
}));

// Mock the watch progress client
jest.mock('../../api/watch-progress-client', () => ({
  updateWatchProgress: jest.fn().mockResolvedValue(undefined),
}));

describe('useVideoAnalytics', () => {
  const defaultProps = {
    movieId: 'movie-123',
    movieTitle: 'Test Movie',
    duration: 3600, // 1 hour in seconds
    source: 'direct',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with a new session when no resumable session exists', () => {
      const { result } = renderHook(() => useVideoAnalytics(defaultProps));

      expect(storage.getViewerId).toHaveBeenCalled();
      expect(storage.findResumableSession).toHaveBeenCalledWith('movie-123', 'test-viewer-456');
      expect(storage.generateSessionId).toHaveBeenCalled();
      expect(result.current.getSessionId()).toBe('test-session-123');
    });

    it('should resume an existing session when one is found', () => {
      const existingSession = {
        id: 'existing-session-789',
        viewerId: 'test-viewer-456',
        movieId: 'movie-123',
        movieTitle: 'Test Movie',
        startedAt: Date.now() - 60000,
        lastActiveAt: Date.now() - 60000,
        totalWatchTime: 300,
        maxProgress: 25,
        completed: false,
        duration: 3600,
        deviceType: 'desktop' as const,
        source: 'direct',
        playCount: 1,
      };

      (storage.findResumableSession as jest.Mock).mockReturnValueOnce(existingSession);

      const { result } = renderHook(() => useVideoAnalytics(defaultProps));

      expect(result.current.getSessionId()).toBe('existing-session-789');
      expect(storage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'existing-session-789' })
      );
    });

    it('should call getDeviceType for new sessions', () => {
      renderHook(() => useVideoAnalytics(defaultProps));

      // getDeviceType is called when creating a new session
      expect(storage.getDeviceType).toHaveBeenCalled();
    });
  });

  describe('trackPlay', () => {
    it('should log movie_start event', () => {
      const { result } = renderHook(() => useVideoAnalytics(defaultProps));

      act(() => {
        result.current.trackPlay(0);
      });

      expect(storage.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'movie_start',
          sessionId: 'test-session-123',
          movieId: 'movie-123',
          movieTitle: 'Test Movie',
          data: expect.objectContaining({
            currentTime: 0,
            duration: 3600,
            progress: 0,
          }),
        })
      );
    });

    it('should save session to localStorage on play', () => {
      const { result } = renderHook(() => useVideoAnalytics(defaultProps));

      act(() => {
        result.current.trackPlay(0);
      });

      expect(storage.saveSession).toHaveBeenCalled();
    });

    it('should increment play count on each play', () => {
      const { result } = renderHook(() => useVideoAnalytics(defaultProps));

      act(() => {
        result.current.trackPlay(0);
      });

      act(() => {
        result.current.trackPause(10);
      });

      act(() => {
        result.current.trackPlay(10);
      });

      // saveSession should be called with incrementing playCount
      const calls = (storage.saveSession as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.playCount).toBeGreaterThanOrEqual(2);
    });

    it('should start progress interval', () => {
      const { result } = renderHook(() => useVideoAnalytics(defaultProps));

      act(() => {
        result.current.trackPlay(0);
      });

      // Clear previous calls
      (storage.logEvent as jest.Mock).mockClear();

      // Advance timer by 30 seconds (PROGRESS_INTERVAL_MS)
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(storage.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'movie_progress',
        })
      );
    });
  });

  describe('trackPause', () => {
    it('should log movie_pause event', () => {
      const { result } = renderHook(() => useVideoAnalytics(defaultProps));

      act(() => {
        result.current.trackPlay(0);
      });

      (storage.logEvent as jest.Mock).mockClear();

      act(() => {
        result.current.trackPause(120);
      });

      expect(storage.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'movie_pause',
          data: expect.objectContaining({
            currentTime: 120,
          }),
        })
      );
    });

    it('should save session immediately on pause', () => {
      const { result } = renderHook(() => useVideoAnalytics(defaultProps));

      act(() => {
        result.current.trackPlay(0);
      });

      (storage.saveSession as jest.Mock).mockClear();

      act(() => {
        result.current.trackPause(60);
      });

      expect(storage.saveSession).toHaveBeenCalled();
    });

    it('should clear progress interval on pause', () => {
      const { result } = renderHook(() => useVideoAnalytics(defaultProps));

      act(() => {
        result.current.trackPlay(0);
      });

      act(() => {
        result.current.trackPause(60);
      });

      (storage.logEvent as jest.Mock).mockClear();

      // Advance timer - should not log progress since paused
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(storage.logEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'movie_progress' })
      );
    });
  });

  describe('trackTimeUpdate', () => {
    it('should update maxProgress when watching further', () => {
      const { result } = renderHook(() => useVideoAnalytics(defaultProps));

      act(() => {
        result.current.trackPlay(0);
      });

      // Simulate time updates
      act(() => {
        result.current.trackTimeUpdate(100);
      });

      act(() => {
        result.current.trackTimeUpdate(200);
      });

      // Save session to check the maxProgress
      act(() => {
        result.current.trackPause(200);
      });

      const saveSessionCalls = (storage.saveSession as jest.Mock).mock.calls;
      const lastSession = saveSessionCalls[saveSessionCalls.length - 1][0];
      
      // Progress should be ~5.5% (200/3600 * 100)
      expect(lastSession.maxProgress).toBeGreaterThan(5);
    });

    it('should accumulate watch time on normal playback', () => {
      const { result } = renderHook(() => useVideoAnalytics(defaultProps));

      act(() => {
        result.current.trackPlay(0);
      });

      // Simulate 1 second increments (normal playback)
      for (let i = 1; i <= 10; i++) {
        act(() => {
          result.current.trackTimeUpdate(i);
        });
      }

      act(() => {
        result.current.trackPause(10);
      });

      const saveSessionCalls = (storage.saveSession as jest.Mock).mock.calls;
      const lastSession = saveSessionCalls[saveSessionCalls.length - 1][0];
      
      expect(lastSession.totalWatchTime).toBeGreaterThan(0);
    });

    it('should not count large time jumps (seeks) as watch time', () => {
      const { result } = renderHook(() => useVideoAnalytics(defaultProps));

      act(() => {
        result.current.trackPlay(0);
      });

      // Simulate a seek (jump of more than 2 seconds)
      act(() => {
        result.current.trackTimeUpdate(1);
      });

      act(() => {
        result.current.trackTimeUpdate(100); // Seek forward
      });

      act(() => {
        result.current.trackPause(100);
      });

      const saveSessionCalls = (storage.saveSession as jest.Mock).mock.calls;
      const lastSession = saveSessionCalls[saveSessionCalls.length - 1][0];
      
      // Should only count the 1 second, not the 99 second jump
      expect(lastSession.totalWatchTime).toBeLessThan(10);
    });
  });

  describe('trackComplete', () => {
    it('should log movie_complete event', () => {
      const { result } = renderHook(() => useVideoAnalytics(defaultProps));

      act(() => {
        result.current.trackPlay(0);
      });

      (storage.logEvent as jest.Mock).mockClear();

      act(() => {
        result.current.trackComplete();
      });

      expect(storage.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'movie_complete',
          data: expect.objectContaining({
            progress: 100,
          }),
        })
      );
    });

    it('should mark session as completed', () => {
      const { result } = renderHook(() => useVideoAnalytics(defaultProps));

      act(() => {
        result.current.trackPlay(0);
      });

      (storage.saveSession as jest.Mock).mockClear();

      act(() => {
        result.current.trackComplete();
      });

      expect(storage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          completed: true,
          maxProgress: 100,
        })
      );
    });

    it('should set endedAt timestamp', () => {
      const { result } = renderHook(() => useVideoAnalytics(defaultProps));

      act(() => {
        result.current.trackPlay(0);
      });

      act(() => {
        result.current.trackComplete();
      });

      expect(storage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          endedAt: expect.any(Number),
        })
      );
    });
  });

  describe('trackEnd', () => {
    it('should log movie_end event when inactive', () => {
      const { result } = renderHook(() => useVideoAnalytics(defaultProps));

      act(() => {
        result.current.trackPlay(0);
      });

      // Simulate some activity then wait
      act(() => {
        result.current.trackPause(60);
      });

      // Advance time to make session inactive
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      (storage.logEvent as jest.Mock).mockClear();

      act(() => {
        result.current.trackEnd();
      });

      expect(storage.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'movie_end',
        })
      );
    });

    it('should save final session state', () => {
      const { result } = renderHook(() => useVideoAnalytics(defaultProps));

      act(() => {
        result.current.trackPlay(0);
      });

      act(() => {
        result.current.trackPause(60);
      });

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      (storage.saveSession as jest.Mock).mockClear();

      act(() => {
        result.current.trackEnd();
      });

      expect(storage.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          endedAt: expect.any(Number),
        })
      );
    });
  });

  describe('Database Sync', () => {
    it('should sync watch progress to database on pause', async () => {
      const { result } = renderHook(() => useVideoAnalytics(defaultProps));

      act(() => {
        result.current.trackPlay(0);
      });

      await act(async () => {
        result.current.trackPause(60);
        // Allow promise to resolve
        await Promise.resolve();
      });

      expect(watchProgressClient.updateWatchProgress).toHaveBeenCalledWith(
        'movie-123',
        expect.objectContaining({
          durationSeconds: expect.any(Number),
        })
      );
    });

    it('should handle database sync errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (watchProgressClient.updateWatchProgress as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() => useVideoAnalytics(defaultProps));

      act(() => {
        result.current.trackPlay(0);
      });

      await act(async () => {
        result.current.trackPause(60);
        await Promise.resolve();
      });

      // Should not throw, just log error
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getSessionId', () => {
    it('should return the current session ID', () => {
      const { result } = renderHook(() => useVideoAnalytics(defaultProps));

      expect(result.current.getSessionId()).toBe('test-session-123');
    });
  });

  describe('Cleanup', () => {
    it('should save session on unmount if watch time > 0', () => {
      const { result, unmount } = renderHook(() => useVideoAnalytics(defaultProps));

      act(() => {
        result.current.trackPlay(0);
      });

      // Simulate some watch time
      act(() => {
        result.current.trackTimeUpdate(1);
      });

      (storage.saveSession as jest.Mock).mockClear();

      unmount();

      expect(storage.saveSession).toHaveBeenCalled();
    });

    it('should clear interval on unmount', () => {
      const { result, unmount } = renderHook(() => useVideoAnalytics(defaultProps));

      act(() => {
        result.current.trackPlay(0);
      });

      unmount();

      (storage.logEvent as jest.Mock).mockClear();

      // Advance timer - should not log since unmounted
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Interval should be cleared, no new events logged
      expect(storage.logEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'movie_progress' })
      );
    });
  });
});
