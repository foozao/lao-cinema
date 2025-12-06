'use client';

import { useEffect, useCallback } from 'react';

interface UseVideoKeyboardOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  duration: number;
  onToggleFullscreen: () => void;
  onMuteChange: (muted: boolean) => void;
}

/**
 * Hook for managing video keyboard shortcuts
 * Space: Play/Pause
 * F: Toggle fullscreen
 * M: Toggle mute
 * Arrow Left/Right: Seek -/+ 10 seconds
 * Arrow Up/Down: Volume up/down
 */
export function useVideoKeyboard({
  videoRef,
  isPlaying,
  duration,
  onToggleFullscreen,
  onMuteChange,
}: UseVideoKeyboardOptions): void {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        if (isPlaying) {
          video.pause();
        } else {
          video.play();
        }
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        onToggleFullscreen();
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        video.muted = !video.muted;
        onMuteChange(video.muted);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 10);
        break;
      case 'ArrowRight':
        e.preventDefault();
        video.currentTime = Math.min(duration, video.currentTime + 10);
        break;
      case 'ArrowUp':
        e.preventDefault();
        video.volume = Math.min(1, video.volume + 0.1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        video.volume = Math.max(0, video.volume - 0.1);
        break;
    }
  }, [videoRef, isPlaying, duration, onToggleFullscreen, onMuteChange]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
