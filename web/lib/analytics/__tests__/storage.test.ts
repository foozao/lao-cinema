import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  generateSessionId,
  getViewerId,
  getDeviceType,
  getSessions,
  saveSession,
  getSessionById,
  findResumableSession,
  getEvents,
  logEvent,
  getMovieAnalytics,
  getAllMovieAnalytics,
  getAnalyticsSummary,
  clearAnalytics,
  exportAnalyticsData,
} from '../storage';
import type { WatchSession, AnalyticsEvent } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

// Store original window.innerWidth
const originalInnerWidth = global.window?.innerWidth;

describe('Analytics Storage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('generateSessionId', () => {
    it('should generate unique session IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      
      expect(id1).not.toBe(id2);
    });

    it('should include timestamp in session ID', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      
      const id = generateSessionId();
      
      expect(id.startsWith(now.toString())).toBe(true);
    });
  });

  describe('getViewerId', () => {
    it('should create a new viewer ID if none exists', () => {
      const viewerId = getViewerId();
      
      expect(viewerId).toMatch(/^viewer-\d+-[a-z0-9]+$/);
    });

    it('should return the same viewer ID on subsequent calls', () => {
      const viewerId1 = getViewerId();
      const viewerId2 = getViewerId();
      
      expect(viewerId1).toBe(viewerId2);
    });

    it('should persist viewer ID in localStorage', () => {
      const viewerId = getViewerId();
      
      const stored = localStorage.getItem('lao-cinema-viewer-id');
      expect(stored).toBe(viewerId);
    });
  });

  describe('getDeviceType', () => {
    afterEach(() => {
      // Restore original innerWidth
      Object.defineProperty(window, 'innerWidth', {
        value: originalInnerWidth || 1024,
        writable: true,
      });
    });

    it('should return desktop for width >= 1024', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
      expect(getDeviceType()).toBe('desktop');
    });

    it('should return tablet for width >= 768 and < 1024', () => {
      Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
      expect(getDeviceType()).toBe('tablet');
    });

    it('should return mobile for width < 768', () => {
      Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
      expect(getDeviceType()).toBe('mobile');
    });
  });

  describe('Session Management', () => {
    const createTestSession = (overrides: Partial<WatchSession> = {}): WatchSession => ({
      id: generateSessionId(),
      viewerId: 'test-viewer',
      movieId: 'movie-123',
      movieTitle: 'Test Movie',
      startedAt: Date.now(),
      lastActiveAt: Date.now(),
      totalWatchTime: 0,
      maxProgress: 0,
      completed: false,
      duration: 7200,
      deviceType: 'desktop',
      source: 'test',
      playCount: 0,
      ...overrides,
    });

    describe('saveSession and getSessions', () => {
      it('should save and retrieve sessions', () => {
        const session = createTestSession();
        saveSession(session);
        
        const sessions = getSessions();
        
        expect(sessions).toHaveLength(1);
        expect(sessions[0].id).toBe(session.id);
      });

      it('should update existing session', () => {
        const session = createTestSession();
        saveSession(session);
        
        session.totalWatchTime = 100;
        saveSession(session);
        
        const sessions = getSessions();
        
        expect(sessions).toHaveLength(1);
        expect(sessions[0].totalWatchTime).toBe(100);
      });

      it('should store multiple sessions', () => {
        saveSession(createTestSession({ id: 'session-1' }));
        saveSession(createTestSession({ id: 'session-2' }));
        saveSession(createTestSession({ id: 'session-3' }));
        
        const sessions = getSessions();
        
        expect(sessions).toHaveLength(3);
      });
    });

    describe('getSessionById', () => {
      it('should find session by ID', () => {
        const session = createTestSession({ id: 'find-me' });
        saveSession(session);
        
        const found = getSessionById('find-me');
        
        expect(found).not.toBeUndefined();
        expect(found?.id).toBe('find-me');
      });

      it('should return undefined for non-existent session', () => {
        const found = getSessionById('non-existent');
        
        expect(found).toBeUndefined();
      });
    });

    describe('findResumableSession', () => {
      it('should find recent session for same movie and viewer', () => {
        const now = Date.now();
        jest.setSystemTime(now);
        
        const session = createTestSession({
          movieId: 'movie-1',
          viewerId: 'viewer-1',
          lastActiveAt: now,
        });
        saveSession(session);
        
        const found = findResumableSession('movie-1', 'viewer-1');
        
        expect(found).not.toBeNull();
        expect(found?.id).toBe(session.id);
      });

      it('should not find session for different movie', () => {
        const session = createTestSession({
          movieId: 'movie-1',
          viewerId: 'viewer-1',
        });
        saveSession(session);
        
        const found = findResumableSession('movie-2', 'viewer-1');
        
        expect(found).toBeNull();
      });

      it('should not find session for different viewer', () => {
        const session = createTestSession({
          movieId: 'movie-1',
          viewerId: 'viewer-1',
        });
        saveSession(session);
        
        const found = findResumableSession('movie-1', 'viewer-2');
        
        expect(found).toBeNull();
      });

      it('should not find completed session', () => {
        const session = createTestSession({
          movieId: 'movie-1',
          viewerId: 'viewer-1',
          completed: true,
        });
        saveSession(session);
        
        const found = findResumableSession('movie-1', 'viewer-1');
        
        expect(found).toBeNull();
      });

      it('should not find ended session', () => {
        const session = createTestSession({
          movieId: 'movie-1',
          viewerId: 'viewer-1',
          endedAt: Date.now(),
        });
        saveSession(session);
        
        const found = findResumableSession('movie-1', 'viewer-1');
        
        expect(found).toBeNull();
      });

      it('should not find session older than 30 minutes', () => {
        const now = Date.now();
        jest.setSystemTime(now);
        
        const session = createTestSession({
          movieId: 'movie-1',
          viewerId: 'viewer-1',
          lastActiveAt: now - 31 * 60 * 1000, // 31 minutes ago
        });
        saveSession(session);
        
        const found = findResumableSession('movie-1', 'viewer-1');
        
        expect(found).toBeNull();
      });

      it('should find session within 30 minutes', () => {
        const now = Date.now();
        jest.setSystemTime(now);
        
        const session = createTestSession({
          movieId: 'movie-1',
          viewerId: 'viewer-1',
          lastActiveAt: now - 29 * 60 * 1000, // 29 minutes ago
        });
        saveSession(session);
        
        const found = findResumableSession('movie-1', 'viewer-1');
        
        expect(found).not.toBeNull();
      });
    });
  });

  describe('Event Logging', () => {
    const createTestEvent = (overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent => ({
      type: 'movie_start',
      sessionId: 'session-123',
      movieId: 'movie-123',
      movieTitle: 'Test Movie',
      timestamp: Date.now(),
      data: {},
      ...overrides,
    });

    it('should log and retrieve events', () => {
      const event = createTestEvent();
      logEvent(event);
      
      const events = getEvents();
      
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('movie_start');
    });

    it('should store multiple events', () => {
      logEvent(createTestEvent({ type: 'movie_start' }));
      logEvent(createTestEvent({ type: 'movie_pause' }));
      logEvent(createTestEvent({ type: 'movie_end' }));
      
      const events = getEvents();
      
      expect(events).toHaveLength(3);
    });
  });

  describe('Analytics Calculations', () => {
    const createTestSession = (overrides: Partial<WatchSession> = {}): WatchSession => ({
      id: generateSessionId(),
      viewerId: 'test-viewer',
      movieId: 'movie-123',
      movieTitle: 'Test Movie',
      startedAt: Date.now(),
      lastActiveAt: Date.now(),
      totalWatchTime: 0,
      maxProgress: 0,
      completed: false,
      duration: 7200,
      deviceType: 'desktop',
      source: 'test',
      playCount: 1,
      ...overrides,
    });

    describe('getMovieAnalytics', () => {
      it('should return null for movie with no sessions', () => {
        const analytics = getMovieAnalytics('non-existent');
        
        expect(analytics).toBeNull();
      });

      it('should calculate correct analytics for single session', () => {
        saveSession(createTestSession({
          movieId: 'movie-1',
          totalWatchTime: 300,
          maxProgress: 50,
          completed: false,
        }));
        
        const analytics = getMovieAnalytics('movie-1');
        
        expect(analytics).not.toBeNull();
        expect(analytics?.totalViews).toBe(1);
        expect(analytics?.totalWatchTime).toBe(300);
        expect(analytics?.averageWatchTime).toBe(300);
        expect(analytics?.completionRate).toBe(0);
        expect(analytics?.averageProgress).toBe(50);
      });

      it('should calculate correct analytics for multiple sessions', () => {
        saveSession(createTestSession({
          id: 'session-1',
          viewerId: 'viewer-1',
          movieId: 'movie-1',
          totalWatchTime: 300,
          maxProgress: 50,
          completed: false,
        }));
        saveSession(createTestSession({
          id: 'session-2',
          viewerId: 'viewer-2',
          movieId: 'movie-1',
          totalWatchTime: 600,
          maxProgress: 100,
          completed: true,
        }));
        
        const analytics = getMovieAnalytics('movie-1');
        
        expect(analytics?.totalViews).toBe(2);
        expect(analytics?.uniqueViewers).toBe(2);
        expect(analytics?.totalWatchTime).toBe(900);
        expect(analytics?.averageWatchTime).toBe(450);
        expect(analytics?.completions).toBe(1);
        expect(analytics?.completionRate).toBe(50);
        expect(analytics?.averageProgress).toBe(75);
      });

      it('should count unique viewers correctly', () => {
        // Same viewer, two sessions
        saveSession(createTestSession({
          id: 'session-1',
          viewerId: 'viewer-1',
          movieId: 'movie-1',
        }));
        saveSession(createTestSession({
          id: 'session-2',
          viewerId: 'viewer-1',
          movieId: 'movie-1',
        }));
        
        const analytics = getMovieAnalytics('movie-1');
        
        expect(analytics?.totalViews).toBe(2);
        expect(analytics?.uniqueViewers).toBe(1);
      });
    });

    describe('getAllMovieAnalytics', () => {
      it('should return analytics for all movies', () => {
        saveSession(createTestSession({ movieId: 'movie-1' }));
        saveSession(createTestSession({ movieId: 'movie-2' }));
        saveSession(createTestSession({ movieId: 'movie-3' }));
        
        const allAnalytics = getAllMovieAnalytics();
        
        expect(allAnalytics).toHaveLength(3);
      });
    });

    describe('getAnalyticsSummary', () => {
      it('should return correct summary', () => {
        saveSession(createTestSession({
          id: 'session-1',
          viewerId: 'viewer-1',
          movieId: 'movie-1',
          totalWatchTime: 300,
          completed: false,
        }));
        saveSession(createTestSession({
          id: 'session-2',
          viewerId: 'viewer-2',
          movieId: 'movie-2',
          totalWatchTime: 600,
          completed: true,
        }));
        
        const summary = getAnalyticsSummary();
        
        expect(summary.totalSessions).toBe(2);
        expect(summary.uniqueViewers).toBe(2);
        expect(summary.totalWatchTime).toBe(900);
        expect(summary.totalCompletions).toBe(1);
        expect(summary.averageSessionLength).toBe(450);
        expect(summary.movieStats).toHaveLength(2);
      });

      it('should return top movies sorted correctly', () => {
        saveSession(createTestSession({
          id: 'session-1',
          movieId: 'movie-low',
          movieTitle: 'Low Watch',
          totalWatchTime: 100,
        }));
        saveSession(createTestSession({
          id: 'session-2',
          movieId: 'movie-high',
          movieTitle: 'High Watch',
          totalWatchTime: 1000,
        }));
        
        const summary = getAnalyticsSummary();
        
        expect(summary.topMovies.byWatchTime[0].movieId).toBe('movie-high');
      });
    });
  });

  describe('clearAnalytics', () => {
    it('should clear all analytics data', () => {
      saveSession({
        id: 'session-1',
        viewerId: 'viewer-1',
        movieId: 'movie-1',
        movieTitle: 'Test',
        startedAt: Date.now(),
        lastActiveAt: Date.now(),
        totalWatchTime: 100,
        maxProgress: 50,
        completed: false,
        duration: 7200,
        deviceType: 'desktop',
        source: 'test',
        playCount: 1,
      });
      logEvent({
        type: 'movie_start',
        sessionId: 'session-1',
        movieId: 'movie-1',
        movieTitle: 'Test',
        timestamp: Date.now(),
        data: {},
      });
      
      clearAnalytics();
      
      expect(getSessions()).toHaveLength(0);
      expect(getEvents()).toHaveLength(0);
    });
  });

  describe('exportAnalyticsData', () => {
    it('should export data as JSON string', () => {
      saveSession({
        id: 'session-1',
        viewerId: 'viewer-1',
        movieId: 'movie-1',
        movieTitle: 'Test',
        startedAt: Date.now(),
        lastActiveAt: Date.now(),
        totalWatchTime: 100,
        maxProgress: 50,
        completed: false,
        duration: 7200,
        deviceType: 'desktop',
        source: 'test',
        playCount: 1,
      });
      
      const exported = exportAnalyticsData();
      const parsed = JSON.parse(exported);
      
      expect(parsed.sessions).toHaveLength(1);
      expect(parsed.summary).toBeDefined();
      expect(parsed.exportedAt).toBeDefined();
    });
  });
});
