'use client';

import { useState, useEffect, useCallback, RefObject } from 'react';

interface UseCastingOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  src: string;
}

interface UseCastingResult {
  /** Whether casting is available on this device/browser */
  isCastAvailable: boolean;
  /** Whether currently casting to a device */
  isCasting: boolean;
  /** Name of the connected device (if available) */
  deviceName: string | null;
  /** Start casting to a device */
  startCasting: () => Promise<void>;
  /** Stop casting */
  stopCasting: () => Promise<void>;
  /** Toggle casting on/off */
  toggleCasting: () => Promise<void>;
  /** Error message if casting failed */
  castError: string | null;
}

// Type declarations for Remote Playback API
// Using a local interface to avoid conflicts with lib.dom.d.ts and HLS.js
interface RemotePlaybackCompat {
  readonly state: 'connecting' | 'connected' | 'disconnected';
  watchAvailability(callback: (available: boolean) => void): Promise<number>;
  cancelWatchAvailability(id?: number): Promise<void>;
  prompt(): Promise<void>;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

// Helper to safely get remote playback from video element
function getRemotePlayback(video: HTMLVideoElement): RemotePlaybackCompat | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const remote = (video as any).remote;
  return remote ?? null;
}

/**
 * Hook for managing Remote Playback (Chromecast, AirPlay, etc.)
 * Uses the Web Remote Playback API which is supported in Chrome and Edge
 */
export function useCasting({ videoRef, src }: UseCastingOptions): UseCastingResult {
  const [isCastAvailable, setIsCastAvailable] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [castError, setCastError] = useState<string | null>(null);

  // Check if Remote Playback API is available
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Check if Remote Playback API is supported
    const remote = getRemotePlayback(video);
    if (remote) {
      // Watch for device availability changes
      remote.watchAvailability((available) => {
        setIsCastAvailable(available);
      }).catch(() => {
        // watchAvailability not supported, check once
        setIsCastAvailable(true); // Assume available, prompt will fail if not
      });

      // Handle connection state changes
      const handleConnecting = () => {
        setCastError(null);
      };

      const handleConnect = () => {
        setIsCasting(true);
        setCastError(null);
      };

      const handleDisconnect = () => {
        setIsCasting(false);
        setDeviceName(null);
      };

      remote.addEventListener('connecting', handleConnecting);
      remote.addEventListener('connect', handleConnect);
      remote.addEventListener('disconnect', handleDisconnect);

      // Check initial state
      if (remote.state === 'connected') {
        setIsCasting(true);
      }

      return () => {
        remote.removeEventListener('connecting', handleConnecting);
        remote.removeEventListener('connect', handleConnect);
        remote.removeEventListener('disconnect', handleDisconnect);
      };
    } else {
      // Remote Playback API not supported
      setIsCastAvailable(false);
    }
  }, [videoRef, src]);

  const startCasting = useCallback(async () => {
    const video = videoRef.current;
    const remote = video ? getRemotePlayback(video) : null;
    if (!remote) {
      setCastError('Casting not supported');
      return;
    }

    try {
      setCastError(null);
      await remote.prompt();
      // Device name is not exposed by the API, but connection state is
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === 'NotFoundError') {
          setCastError('No cast devices found');
        } else if (error.name === 'InvalidStateError') {
          setCastError('Cannot cast in current state');
        } else if (error.name === 'NotAllowedError') {
          // User cancelled - not an error
          setCastError(null);
        } else {
          setCastError('Failed to start casting');
        }
      } else {
        setCastError('Failed to start casting');
      }
    }
  }, [videoRef]);

  const stopCasting = useCallback(async () => {
    const video = videoRef.current;
    const remote = video ? getRemotePlayback(video) : null;
    if (!remote) return;

    try {
      // There's no explicit stop method - disconnection happens through device UI
      // But we can cancel by reloading the video
      setIsCasting(false);
      setDeviceName(null);
    } catch {
      setCastError('Failed to stop casting');
    }
  }, [videoRef]);

  const toggleCasting = useCallback(async () => {
    if (isCasting) {
      await stopCasting();
    } else {
      await startCasting();
    }
  }, [isCasting, startCasting, stopCasting]);

  return {
    isCastAvailable,
    isCasting,
    deviceName,
    startCasting,
    stopCasting,
    toggleCasting,
    castError,
  };
}
