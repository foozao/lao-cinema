'use client';

import { useEffect, useState, useCallback } from 'react';
import { getWatchProgress } from '../api/watch-progress-client';

// Time thresholds for continue watching behavior
const CONTINUE_WATCHING_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const CONTINUE_WATCHING_MIN_PROMPT_TIME = 30 * 60 * 1000; // 30 minutes

interface PlaybackData {
  position: number;
  timestamp: number;
}

const getPlaybackKey = (videoId: string) => `lao-cinema-playback-${videoId}`;

interface UseContinueWatchingOptions {
  videoId?: string;
  movieDuration?: number;
}

interface UseContinueWatchingReturn {
  savedPosition: number | null;
  showContinueDialog: boolean;
  pendingPosition: number | null;
  handleContinueWatching: () => void;
  handleStartFromBeginning: () => void;
  savePosition: (time: number) => void;
  setHasStarted: (started: boolean) => void;
  hasStarted: boolean;
}

/**
 * Hook for managing continue watching functionality
 * Fetches from backend API (cross-device) and localStorage (fallback)
 */
export function useContinueWatching({
  videoId,
  movieDuration,
}: UseContinueWatchingOptions): UseContinueWatchingReturn {
  const [savedPosition, setSavedPosition] = useState<number | null>(null);
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<number | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  // Load saved playback position from both backend API and localStorage
  useEffect(() => {
    if (!videoId) return;
    
    const loadPosition = async () => {
      let backendPosition: number | null = null;
      let backendTimestamp: number | null = null;
      let localPosition: number | null = null;
      let localTimestamp: number | null = null;
      
      // 1. Try to fetch from backend API (cross-device sync)
      try {
        const response = await getWatchProgress(videoId);
        if (response.progress && response.progress.progressSeconds > 0) {
          backendPosition = response.progress.progressSeconds;
          backendTimestamp = new Date(response.progress.lastWatchedAt).getTime();
          console.log('[ContinueWatching] Backend progress:', backendPosition, 'seconds');
        }
      } catch (error) {
        console.log('[ContinueWatching] No backend progress found or error:', error);
      }
      
      // 2. Check localStorage (local fallback)
      try {
        const saved = localStorage.getItem(getPlaybackKey(videoId));
        if (saved) {
          try {
            const data: PlaybackData = JSON.parse(saved);
            if (!isNaN(data.position) && data.position > 0) {
              localPosition = data.position;
              localTimestamp = data.timestamp;
              console.log('[ContinueWatching] Local progress:', localPosition, 'seconds');
            }
          } catch {
            // Fallback for old format (just a number)
            const position = parseFloat(saved);
            if (!isNaN(position) && position > 0) {
              localPosition = position;
              localTimestamp = Date.now();
            }
          }
        }
      } catch (error) {
        console.error('[ContinueWatching] Error loading local position:', error);
      }
      
      // 3. Determine which position to use (prefer more recent and higher progress)
      let finalPosition: number | null = null;
      let finalTimestamp: number | null = null;
      
      if (backendPosition !== null && localPosition !== null) {
        // Both exist - use the more recent one, or higher progress if close in time
        const timeDiff = Math.abs((backendTimestamp || 0) - (localTimestamp || 0));
        if (timeDiff < 60000) { // Within 1 minute - use higher progress
          finalPosition = Math.max(backendPosition, localPosition);
          finalTimestamp = backendPosition > localPosition ? backendTimestamp : localTimestamp;
        } else {
          // Use more recent
          if ((backendTimestamp || 0) > (localTimestamp || 0)) {
            finalPosition = backendPosition;
            finalTimestamp = backendTimestamp;
          } else {
            finalPosition = localPosition;
            finalTimestamp = localTimestamp;
          }
        }
      } else if (backendPosition !== null) {
        finalPosition = backendPosition;
        finalTimestamp = backendTimestamp;
      } else if (localPosition !== null) {
        finalPosition = localPosition;
        finalTimestamp = localTimestamp;
      }
      
      // 4. Apply the position with appropriate prompt logic
      if (finalPosition && finalTimestamp) {
        const now = Date.now();
        const timeSinceLastWatch = now - finalTimestamp;
        
        if (timeSinceLastWatch > CONTINUE_WATCHING_MAX_AGE) {
          // Too old (>7 days), clear local storage
          localStorage.removeItem(getPlaybackKey(videoId));
          console.log('[ContinueWatching] Progress too old, cleared');
        } else if (timeSinceLastWatch < CONTINUE_WATCHING_MIN_PROMPT_TIME) {
          // Recent (<30 min), auto-continue without prompt
          setSavedPosition(finalPosition);
          setHasStarted(true);
          console.log('[ContinueWatching] Auto-resuming from', finalPosition, 'seconds');
        } else {
          // Over 30 min, show prompt
          setPendingPosition(finalPosition);
          setShowContinueDialog(true);
          setHasStarted(true);
          console.log('[ContinueWatching] Showing resume prompt for', finalPosition, 'seconds');
        }
      }
    };
    
    loadPosition();
  }, [videoId, movieDuration]);

  const handleContinueWatching = useCallback(() => {
    if (pendingPosition !== null) {
      setSavedPosition(pendingPosition);
    }
    setShowContinueDialog(false);
  }, [pendingPosition]);

  const handleStartFromBeginning = useCallback(() => {
    setSavedPosition(null);
    setShowContinueDialog(false);
    if (videoId) {
      localStorage.removeItem(getPlaybackKey(videoId));
    }
  }, [videoId]);

  const savePosition = useCallback((time: number) => {
    if (!videoId || time <= 0) return;
    
    try {
      const data: PlaybackData = {
        position: time,
        timestamp: Date.now()
      };
      localStorage.setItem(getPlaybackKey(videoId), JSON.stringify(data));
    } catch (error) {
      console.error('Error saving playback position:', error);
    }
  }, [videoId]);

  return {
    savedPosition,
    showContinueDialog,
    pendingPosition,
    handleContinueWatching,
    handleStartFromBeginning,
    savePosition,
    setHasStarted,
    hasStarted,
  };
}
