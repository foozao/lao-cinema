'use client';

import { useEffect, useState, useCallback } from 'react';

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
 * Handles localStorage persistence and resume prompt logic
 */
export function useContinueWatching({
  videoId,
}: UseContinueWatchingOptions): UseContinueWatchingReturn {
  const [savedPosition, setSavedPosition] = useState<number | null>(null);
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<number | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  // Load saved playback position on mount
  useEffect(() => {
    if (!videoId) return;
    
    try {
      const saved = localStorage.getItem(getPlaybackKey(videoId));
      if (saved) {
        try {
          const data: PlaybackData = JSON.parse(saved);
          const now = Date.now();
          const timeSinceLastWatch = now - data.timestamp;
          
          if (!isNaN(data.position) && data.position > 0) {
            if (timeSinceLastWatch > CONTINUE_WATCHING_MAX_AGE) {
              // Too old (>7 days), clear it
              localStorage.removeItem(getPlaybackKey(videoId));
            } else if (timeSinceLastWatch < CONTINUE_WATCHING_MIN_PROMPT_TIME) {
              // Recent (<30 min), auto-continue without prompt
              setSavedPosition(data.position);
              setHasStarted(true);
            } else {
              // Over 30 min, show prompt
              setPendingPosition(data.position);
              setShowContinueDialog(true);
              setHasStarted(true);
            }
          }
        } catch {
          // Fallback for old format (just a number)
          const position = parseFloat(saved);
          if (!isNaN(position) && position > 0) {
            setPendingPosition(position);
            setShowContinueDialog(true);
            setHasStarted(true);
          }
        }
      }
    } catch (error) {
      console.error('Error loading saved position:', error);
    }
  }, [videoId]);

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
