// Video analytics tracking hook

'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { WatchSession, AnalyticsEvent } from './types';
import { PROGRESS_INTERVAL_MS, COMPLETION_THRESHOLD } from './types';
import { 
  generateSessionId, 
  getDeviceType, 
  getViewerId,
  findResumableSession,
  saveSession, 
  logEvent,
} from './storage';
import { updateWatchProgress } from '../api/watch-progress-client';

interface UseVideoAnalyticsProps {
  movieId: string;
  movieTitle: string;
  duration: number;  // Movie duration in seconds
  source?: string;   // How user found the movie
}

interface VideoAnalyticsState {
  sessionId: string;
  viewerId: string;
  isTracking: boolean;
  totalWatchTime: number;
  maxProgress: number;
  isResumedSession: boolean;
}

/**
 * Create and log an analytics event with common fields
 */
function createAndLogEvent(
  type: AnalyticsEvent['type'],
  stateRef: React.RefObject<VideoAnalyticsState>,
  movieIdRef: React.RefObject<string>,
  movieTitleRef: React.RefObject<string>,
  data: AnalyticsEvent['data']
): void {
  const event: AnalyticsEvent = {
    type,
    sessionId: stateRef.current.sessionId,
    movieId: movieIdRef.current,
    movieTitle: movieTitleRef.current,
    timestamp: Date.now(),
    data,
  };
  logEvent(event);
}

/**
 * Save session to both localStorage (analytics) and database (continue watching)
 */
async function saveSessionDual(session: WatchSession, durationSeconds: number): Promise<void> {
  // Save to localStorage for analytics (synchronous)
  saveSession(session);
  
  // Save to database for continue watching (async, non-blocking)
  try {
    const progressSeconds = (session.maxProgress / 100) * durationSeconds;
    console.log('[Analytics] Syncing watch progress to database:', {
      movieId: session.movieId,
      progressSeconds: Math.floor(progressSeconds),
      durationSeconds: Math.floor(durationSeconds),
      maxProgress: session.maxProgress,
    });
    
    await updateWatchProgress(session.movieId, {
      progressSeconds: Math.floor(progressSeconds),
      durationSeconds: Math.floor(durationSeconds),
      completed: session.completed,
    });
    
    console.log('[Analytics] Successfully synced watch progress to database');
  } catch (error) {
    // Don't block on database errors
    console.error('[Analytics] Failed to sync watch progress to database:', error);
  }
}

export function useVideoAnalytics({ movieId, movieTitle, duration, source = 'direct' }: UseVideoAnalyticsProps) {
  const stateRef = useRef<VideoAnalyticsState>({
    sessionId: '',
    viewerId: '',
    isTracking: false,
    totalWatchTime: 0,
    maxProgress: 0,
    isResumedSession: false,
  });
  
  const lastTimeRef = useRef<number>(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionRef = useRef<WatchSession | null>(null);
  const durationRef = useRef<number>(duration);

  // Keep duration ref updated
  useEffect(() => {
    durationRef.current = duration;
    // Update session duration if it changes
    if (sessionRef.current && duration > 0) {
      sessionRef.current.duration = duration;
    }
  }, [duration]);

  // Track if session has been initialized
  const initializedRef = useRef(false);

  // Initialize or resume session - only run once per movieId
  useEffect(() => {
    // Skip if already initialized for this movie
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    const viewerId = getViewerId();
    stateRef.current.viewerId = viewerId;
    
    // Check for resumable session first
    const existingSession = findResumableSession(movieId, viewerId);
    
    if (existingSession) {
      // Resume existing session
      stateRef.current.sessionId = existingSession.id;
      stateRef.current.totalWatchTime = existingSession.totalWatchTime;
      stateRef.current.maxProgress = existingSession.maxProgress;
      stateRef.current.isResumedSession = true;
      
      // Update session with new activity
      existingSession.lastActiveAt = Date.now();
      sessionRef.current = existingSession;
      saveSessionDual(existingSession, duration);
      
      console.log('[Analytics] Resumed session:', existingSession.id);
    } else {
      // Create new session (but don't save yet - wait until user plays)
      const sessionId = generateSessionId();
      stateRef.current.sessionId = sessionId;
      stateRef.current.isResumedSession = false;
      
      const session: WatchSession = {
        id: sessionId,
        viewerId,
        movieId,
        movieTitle,
        startedAt: Date.now(),
        lastActiveAt: Date.now(),
        totalWatchTime: 0,
        maxProgress: 0,
        completed: false,
        duration: duration || 0, // Will be updated when video loads
        deviceType: getDeviceType(),
        source,
        playCount: 0,
      };
      
      sessionRef.current = session;
      // Don't save yet - will be saved on first play
      
      console.log('[Analytics] Prepared new session:', sessionId);
    }
    
    return () => {
      // Save final state on unmount (but don't mark as ended - allow resumption)
      if (sessionRef.current && stateRef.current.totalWatchTime > 0) {
        // Only save if user actually watched something
        sessionRef.current.totalWatchTime = stateRef.current.totalWatchTime;
        sessionRef.current.maxProgress = stateRef.current.maxProgress;
        sessionRef.current.lastActiveAt = Date.now();
        saveSessionDual(sessionRef.current, durationRef.current);
        console.log('[Analytics] Saved session on unmount:', sessionRef.current.totalWatchTime, 'seconds');
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      // Don't reset initializedRef - prevents duplicate sessions on StrictMode remounts
    };
  }, [movieId]); // Only depend on movieId - other values are captured in refs

  // Store movieId and movieTitle in refs for stable callbacks
  const movieIdRef = useRef(movieId);
  const movieTitleRef = useRef(movieTitle);
  useEffect(() => {
    movieIdRef.current = movieId;
    movieTitleRef.current = movieTitle;
  }, [movieId, movieTitle]);

  // Track play start
  const trackPlay = useCallback((currentTime: number) => {
    if (!sessionRef.current) {
      console.log('[Analytics] trackPlay called but no session ref');
      return;
    }
    
    console.log('[Analytics] trackPlay called at', currentTime, 'isTracking:', stateRef.current.isTracking);
    stateRef.current.isTracking = true;
    lastTimeRef.current = currentTime;
    
    // Increment play count and update activity timestamp
    sessionRef.current.playCount = (sessionRef.current.playCount || 0) + 1;
    sessionRef.current.lastActiveAt = Date.now();
    
    // Only save to localStorage here (not database) - database will be updated on time updates
    // This prevents overwriting existing progress with 0 when user quickly navigates away
    saveSession(sessionRef.current);
    
    // Log event
    const dur = durationRef.current;
    createAndLogEvent('movie_start', stateRef, movieIdRef, movieTitleRef, {
      currentTime,
      duration: dur,
      progress: dur > 0 ? (currentTime / dur) * 100 : 0,
    });
    
    // Start progress tracking interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    progressIntervalRef.current = setInterval(() => {
      if (sessionRef.current && stateRef.current.isTracking) {
        createAndLogEvent('movie_progress', stateRef, movieIdRef, movieTitleRef, {
          watchTime: stateRef.current.totalWatchTime,
          progress: stateRef.current.maxProgress,
        });
      }
    }, PROGRESS_INTERVAL_MS);
  }, []); // No dependencies - uses refs

  // Track pause
  const trackPause = useCallback((currentTime: number) => {
    if (!sessionRef.current) return;
    
    console.log('[Analytics] trackPause called, watchTime:', stateRef.current.totalWatchTime);
    stateRef.current.isTracking = false;
    
    // Clear progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    // Save session immediately on pause
    sessionRef.current.totalWatchTime = stateRef.current.totalWatchTime;
    sessionRef.current.maxProgress = stateRef.current.maxProgress;
    sessionRef.current.lastActiveAt = Date.now();
    saveSessionDual(sessionRef.current, durationRef.current);
    
    // Log event
    const dur = durationRef.current;
    createAndLogEvent('movie_pause', stateRef, movieIdRef, movieTitleRef, {
      currentTime,
      duration: dur,
      progress: dur > 0 ? (currentTime / dur) * 100 : 0,
      watchTime: stateRef.current.totalWatchTime,
    });
  }, []); // No dependencies - uses refs

  // Track time update (called frequently)
  const trackTimeUpdate = useCallback((currentTime: number) => {
    if (!sessionRef.current) {
      console.log('[Analytics] trackTimeUpdate: No session ref');
      return;
    }
    if (!stateRef.current.isTracking) {
      // Not tracking yet - user hasn't pressed play or trackPlay wasn't called
      console.log('[Analytics] trackTimeUpdate: Not tracking yet');
      return;
    }
    
    // Calculate time delta (handle seeks by only counting forward progress)
    const timeDelta = currentTime - lastTimeRef.current;
    if (timeDelta > 0 && timeDelta < 2) {
      // Normal playback (less than 2 seconds difference)
      stateRef.current.totalWatchTime += timeDelta;
    }
    lastTimeRef.current = currentTime;
    
    // Update max progress
    const dur = durationRef.current;
    const progress = dur > 0 ? (currentTime / dur) * 100 : 0;
    if (progress > stateRef.current.maxProgress) {
      stateRef.current.maxProgress = progress;
      console.log('[Analytics] Updated maxProgress:', progress, 'currentTime:', currentTime);
    }
    
    // Check for completion
    const isCompleted = progress >= COMPLETION_THRESHOLD * 100;
    
    // Update session
    sessionRef.current.totalWatchTime = stateRef.current.totalWatchTime;
    sessionRef.current.maxProgress = stateRef.current.maxProgress;
    sessionRef.current.completed = isCompleted;
    sessionRef.current.lastActiveAt = Date.now();
    
    // Save session every 5 seconds of watch time (more frequent for better accuracy)
    const currentSecond = Math.floor(stateRef.current.totalWatchTime);
    if (currentSecond > 0 && currentSecond % 5 === 0) {
      saveSessionDual(sessionRef.current, durationRef.current);
    }
  }, []); // No dependencies - uses refs

  // Track completion
  const trackComplete = useCallback(() => {
    if (!sessionRef.current) return;
    
    stateRef.current.isTracking = false;
    sessionRef.current.completed = true;
    sessionRef.current.maxProgress = 100;
    sessionRef.current.totalWatchTime = stateRef.current.totalWatchTime;
    sessionRef.current.endedAt = Date.now();
    saveSessionDual(sessionRef.current, durationRef.current);
    
    // Clear interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    // Log event
    createAndLogEvent('movie_complete', stateRef, movieIdRef, movieTitleRef, {
      duration: durationRef.current,
      watchTime: stateRef.current.totalWatchTime,
      progress: 100,
    });
  }, []); // No dependencies - uses refs

  // Track end (video ended or user left)
  const trackEnd = useCallback(() => {
    if (!sessionRef.current) return;
    
    // Prevent trackEnd from interfering with active playback
    // Only stop tracking if we've been inactive for >2 seconds
    const now = Date.now();
    const timeSinceActivity = now - (sessionRef.current.lastActiveAt || 0);
    
    if (stateRef.current.isTracking && timeSinceActivity < 2000) {
      console.log('[Analytics] trackEnd ignored - recently active (', timeSinceActivity, 'ms ago)');
      return;
    }
    
    console.log('[Analytics] trackEnd called, watchTime:', stateRef.current.totalWatchTime);
    stateRef.current.isTracking = false;
    sessionRef.current.totalWatchTime = stateRef.current.totalWatchTime;
    sessionRef.current.maxProgress = stateRef.current.maxProgress;
    sessionRef.current.endedAt = Date.now();
    saveSessionDual(sessionRef.current, durationRef.current);
    
    // Clear interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    // Log event
    createAndLogEvent('movie_end', stateRef, movieIdRef, movieTitleRef, {
      watchTime: stateRef.current.totalWatchTime,
      progress: stateRef.current.maxProgress,
    });
  }, []); // No dependencies - uses refs

  // Return getter function to avoid accessing ref during render
  const getSessionId = useCallback(() => stateRef.current.sessionId, []);

  return {
    getSessionId,
    trackPlay,
    trackPause,
    trackTimeUpdate,
    trackComplete,
    trackEnd,
  };
}
