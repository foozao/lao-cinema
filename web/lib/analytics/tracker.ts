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
      saveSession(existingSession);
      
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
        saveSession(sessionRef.current);
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
    saveSession(sessionRef.current);
    
    // Log event
    const dur = durationRef.current;
    const event: AnalyticsEvent = {
      type: 'movie_start',
      sessionId: stateRef.current.sessionId,
      movieId: movieIdRef.current,
      movieTitle: movieTitleRef.current,
      timestamp: Date.now(),
      data: {
        currentTime,
        duration: dur,
        progress: dur > 0 ? (currentTime / dur) * 100 : 0,
      },
    };
    logEvent(event);
    
    // Start progress tracking interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    progressIntervalRef.current = setInterval(() => {
      if (sessionRef.current && stateRef.current.isTracking) {
        const event: AnalyticsEvent = {
          type: 'movie_progress',
          sessionId: stateRef.current.sessionId,
          movieId: movieIdRef.current,
          movieTitle: movieTitleRef.current,
          timestamp: Date.now(),
          data: {
            watchTime: stateRef.current.totalWatchTime,
            progress: stateRef.current.maxProgress,
          },
        };
        logEvent(event);
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
    saveSession(sessionRef.current);
    
    // Log event
    const dur = durationRef.current;
    const event: AnalyticsEvent = {
      type: 'movie_pause',
      sessionId: stateRef.current.sessionId,
      movieId: movieIdRef.current,
      movieTitle: movieTitleRef.current,
      timestamp: Date.now(),
      data: {
        currentTime,
        duration: dur,
        progress: dur > 0 ? (currentTime / dur) * 100 : 0,
        watchTime: stateRef.current.totalWatchTime,
      },
    };
    logEvent(event);
  }, []); // No dependencies - uses refs

  // Track time update (called frequently)
  const trackTimeUpdate = useCallback((currentTime: number) => {
    if (!sessionRef.current) {
      return;
    }
    if (!stateRef.current.isTracking) {
      // Not tracking yet - user hasn't pressed play or trackPlay wasn't called
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
      saveSession(sessionRef.current);
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
    saveSession(sessionRef.current);
    
    // Clear interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    // Log event
    const event: AnalyticsEvent = {
      type: 'movie_complete',
      sessionId: stateRef.current.sessionId,
      movieId: movieIdRef.current,
      movieTitle: movieTitleRef.current,
      timestamp: Date.now(),
      data: {
        duration: durationRef.current,
        watchTime: stateRef.current.totalWatchTime,
        progress: 100,
      },
    };
    logEvent(event);
  }, []); // No dependencies - uses refs

  // Track end (video ended or user left)
  const trackEnd = useCallback(() => {
    if (!sessionRef.current) return;
    
    console.log('[Analytics] trackEnd called, watchTime:', stateRef.current.totalWatchTime);
    stateRef.current.isTracking = false;
    sessionRef.current.totalWatchTime = stateRef.current.totalWatchTime;
    sessionRef.current.maxProgress = stateRef.current.maxProgress;
    sessionRef.current.endedAt = Date.now();
    saveSession(sessionRef.current);
    
    // Clear interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    // Log event
    const event: AnalyticsEvent = {
      type: 'movie_end',
      sessionId: stateRef.current.sessionId,
      movieId: movieIdRef.current,
      movieTitle: movieTitleRef.current,
      timestamp: Date.now(),
      data: {
        watchTime: stateRef.current.totalWatchTime,
        progress: stateRef.current.maxProgress,
      },
    };
    logEvent(event);
  }, []); // No dependencies - uses refs

  return {
    sessionId: stateRef.current.sessionId,
    trackPlay,
    trackPause,
    trackTimeUpdate,
    trackComplete,
    trackEnd,
  };
}
