// Analytics localStorage persistence layer

import type { WatchSession, AnalyticsEvent, MovieAnalytics, AnalyticsSummary } from './types';
import { COMPLETION_THRESHOLD } from './types';

const STORAGE_KEYS = {
  SESSIONS: 'lao-cinema-analytics-sessions',
  EVENTS: 'lao-cinema-analytics-events',
  VIEWER_ID: 'lao-cinema-viewer-id',
} as const;

// Session resumption threshold (30 minutes)
const SESSION_RESUME_THRESHOLD_MS = 30 * 60 * 1000;

// Generate unique session ID
export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Get or create persistent viewer ID
export function getViewerId(): string {
  if (typeof window === 'undefined') return 'server';
  
  let viewerId = localStorage.getItem(STORAGE_KEYS.VIEWER_ID);
  if (!viewerId) {
    viewerId = `viewer-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(STORAGE_KEYS.VIEWER_ID, viewerId);
  }
  return viewerId;
}

// Find a resumable session for a movie (same viewer, recent, not completed)
export function findResumableSession(movieId: string, viewerId: string): WatchSession | null {
  const sessions = getSessions();
  const now = Date.now();
  
  // Find the most recent session for this movie by this viewer
  const recentSession = sessions
    .filter(s => 
      s.movieId === movieId && 
      s.viewerId === viewerId &&
      !s.completed && // Don't resume completed sessions
      !s.endedAt && // Don't resume ended sessions
      (now - s.lastActiveAt) < SESSION_RESUME_THRESHOLD_MS // Within 30 minutes
    )
    .sort((a, b) => b.lastActiveAt - a.lastActiveAt)[0];
  
  return recentSession || null;
}

// Get device type
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

// Storage helpers
function getStoredData<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key}:`, error);
    return defaultValue;
  }
}

function setStoredData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error writing ${key}:`, error);
  }
}

// Session management
export function getSessions(): WatchSession[] {
  return getStoredData<WatchSession[]>(STORAGE_KEYS.SESSIONS, []);
}

export function saveSession(session: WatchSession): void {
  const sessions = getSessions();
  const existingIndex = sessions.findIndex(s => s.id === session.id);
  
  if (existingIndex >= 0) {
    sessions[existingIndex] = session;
  } else {
    sessions.push(session);
  }
  
  // Keep only last 1000 sessions to prevent storage overflow
  const trimmedSessions = sessions.slice(-1000);
  setStoredData(STORAGE_KEYS.SESSIONS, trimmedSessions);
}

export function getSessionById(sessionId: string): WatchSession | undefined {
  return getSessions().find(s => s.id === sessionId);
}

// Event logging (for detailed analysis)
export function getEvents(): AnalyticsEvent[] {
  return getStoredData<AnalyticsEvent[]>(STORAGE_KEYS.EVENTS, []);
}

export function logEvent(event: AnalyticsEvent): void {
  const events = getEvents();
  events.push(event);
  
  // Keep only last 5000 events
  const trimmedEvents = events.slice(-5000);
  setStoredData(STORAGE_KEYS.EVENTS, trimmedEvents);
}

// Analytics calculations
export function getMovieAnalytics(movieId: string): MovieAnalytics | null {
  const sessions = getSessions().filter(s => s.movieId === movieId);
  
  if (sessions.length === 0) return null;
  
  const movieTitle = sessions[0].movieTitle;
  // Count unique viewers by viewerId (persistent browser ID)
  const uniqueViewers = new Set(sessions.map(s => s.viewerId)).size;
  const totalWatchTime = sessions.reduce((sum, s) => sum + s.totalWatchTime, 0);
  const completions = sessions.filter(s => s.completed).length;
  const averageProgress = sessions.reduce((sum, s) => sum + s.maxProgress, 0) / sessions.length;
  const lastWatched = Math.max(...sessions.map(s => s.lastActiveAt || s.startedAt));
  
  return {
    movieId,
    movieTitle,
    totalViews: sessions.length,
    uniqueViewers,
    totalWatchTime,
    completions,
    averageWatchTime: totalWatchTime / sessions.length,
    completionRate: (completions / sessions.length) * 100,
    averageProgress,
    lastWatched,
  };
}

export function getAllMovieAnalytics(): MovieAnalytics[] {
  const sessions = getSessions();
  const movieIds = [...new Set(sessions.map(s => s.movieId))];
  
  return movieIds
    .map(id => getMovieAnalytics(id))
    .filter((a): a is MovieAnalytics => a !== null);
}

export function getAnalyticsSummary(): AnalyticsSummary {
  const sessions = getSessions();
  const movieStats = getAllMovieAnalytics();
  
  const totalWatchTime = sessions.reduce((sum, s) => sum + s.totalWatchTime, 0);
  const totalCompletions = sessions.filter(s => s.completed).length;
  const uniqueViewers = new Set(sessions.map(s => s.viewerId)).size;
  
  // Sort for top movies
  const byWatchTime = [...movieStats].sort((a, b) => b.totalWatchTime - a.totalWatchTime).slice(0, 5);
  const byCompletionRate = [...movieStats]
    .filter(m => m.totalViews >= 1) // Require at least 1 view
    .sort((a, b) => b.completionRate - a.completionRate)
    .slice(0, 5);
  const byViews = [...movieStats].sort((a, b) => b.totalViews - a.totalViews).slice(0, 5);
  
  // Recent activity (last 10 sessions)
  const recentActivity = [...sessions]
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 10);
  
  return {
    totalWatchTime,
    totalSessions: sessions.length,
    uniqueViewers,
    totalCompletions,
    averageSessionLength: sessions.length > 0 ? totalWatchTime / sessions.length : 0,
    movieStats,
    topMovies: {
      byWatchTime,
      byCompletionRate,
      byViews,
    },
    recentActivity,
  };
}

// Clear all analytics data (useful for testing)
export function clearAnalytics(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(STORAGE_KEYS.SESSIONS);
  localStorage.removeItem(STORAGE_KEYS.EVENTS);
}

// Export data as JSON (for demo purposes)
export function exportAnalyticsData(): string {
  return JSON.stringify({
    sessions: getSessions(),
    events: getEvents(),
    summary: getAnalyticsSummary(),
    exportedAt: new Date().toISOString(),
  }, null, 2);
}
