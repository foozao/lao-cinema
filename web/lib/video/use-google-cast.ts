/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback, RefObject } from 'react';

interface UseGoogleCastOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  src: string;
  title?: string;
  poster?: string;
}

interface UseGoogleCastResult {
  isCastAvailable: boolean;
  isCasting: boolean;
  deviceName: string | null;
  startCasting: () => Promise<void>;
  stopCasting: () => Promise<void>;
  toggleCasting: () => Promise<void>;
  castError: string | null;
}

// Type declarations for Google Cast SDK
declare global {
  interface Window {
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
    chrome?: any;
  }
}

/**
 * Hook for Google Cast (Chromecast) with HLS support
 */
export function useGoogleCast({
  videoRef,
  src,
  title = 'Lao Cinema',
  poster,
}: UseGoogleCastOptions): UseGoogleCastResult {
  const [isCastAvailable, setIsCastAvailable] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [castError, setCastError] = useState<string | null>(null);
  const [castSession, setCastSession] = useState<any>(null);
  const [videoPosition, setVideoPosition] = useState(0);

  // Handle session ended - defined first to avoid forward reference
  const handleSessionEnded = useCallback(() => {
    setCastSession(null);
    setIsCasting(false);
    setDeviceName(null);
    
    // Resume local playback at cast position
    const video = videoRef.current;
    if (video && videoPosition > 0) {
      video.currentTime = videoPosition;
    }
  }, [videoRef, videoPosition]);

  // Handle session joined - defined after handleSessionEnded since it depends on it
  const handleSessionJoined = useCallback((session: any) => {
    console.log('🎬 Session joined:', session.getSessionId());
    setCastSession(session);
    setIsCasting(true);
    setDeviceName(session.receiver?.friendlyName || 'Unknown Device');

    // Listen for session end
    session.addUpdateListener((isAlive: boolean) => {
      if (!isAlive) {
        console.log('🎬 Cast session ended');
        handleSessionEnded();
      }
    });
  }, [handleSessionEnded]);

  // Initialize Google Cast
  useEffect(() => {
    const initCast = () => {
      if (!window.chrome?.cast) {
        console.log('Google Cast SDK not loaded yet');
        return;
      }

      console.log('🎬 Initializing Google Cast...');

      const sessionRequest = new window.chrome.cast.SessionRequest(
        window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID
      );

      const apiConfig = new window.chrome.cast.ApiConfig(
        sessionRequest,
        (session: any) => {
          console.log('✅ Cast session joined:', session);
          handleSessionJoined(session);
        },
        (availability: string) => {
          console.log('🎬 Cast availability:', availability);
          setIsCastAvailable(availability === 'available');
        }
      );

      window.chrome.cast.initialize(
        apiConfig,
        () => {
          console.log('✅ Google Cast initialized');
          setIsCastAvailable(true);
        },
        (error: any) => {
          console.error('❌ Cast initialization error:', error);
          setIsCastAvailable(false);
          setCastError('Unable to initialize casting. Please check your network connection.');
        }
      );
    };

    // Wait for Cast SDK to load
    window.__onGCastApiAvailable = (isAvailable) => {
      console.log('🎬 Cast API available:', isAvailable);
      if (isAvailable) {
        initCast();
      }
    };

    // Check if already loaded
    if (window.chrome?.cast?.isAvailable) {
      initCast();
    }
  }, [handleSessionJoined]);

  // Start casting
  const startCasting = useCallback(async () => {
    console.log('🎬 Starting cast...');
    
    if (!window.chrome?.cast) {
      console.error('❌ Google Cast SDK not available');
      setCastError('Casting is not available. Please make sure you are using Chrome or Edge browser.');
      return;
    }

    try {
      // Save current playback position
      const video = videoRef.current;
      if (video) {
        setVideoPosition(video.currentTime);
        video.pause();
      }

      // Request cast session
      window.chrome.cast.requestSession(
        (session: any) => {
          console.log('✅ Cast session started:', session.getSessionId());
          handleSessionJoined(session);

          // Load media
          const mediaInfo = new window.chrome.cast.media.MediaInfo(src, 'application/x-mpegURL');
          mediaInfo.metadata = new window.chrome.cast.media.GenericMediaMetadata();
          mediaInfo.metadata.title = title;
          if (poster) {
            mediaInfo.metadata.images = [new window.chrome.cast.media.Image(poster)];
          }

          const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
          request.currentTime = videoPosition;
          request.autoplay = true;

          session.loadMedia(
            request,
            (media: any) => {
              console.log('✅ Media loaded on cast device');
            },
            (error: any) => {
              console.error('❌ Failed to load media:', error);
              setCastError('Unable to load video on your TV. The video format may not be supported.');
            }
          );
        },
        (error: any) => {
          console.error('❌ Failed to start cast session:', error);
          if (error.code === 'cancel') {
            console.log('ℹ️ User cancelled cast dialog');
            setCastError(null);
          } else if (error.code === 'timeout') {
            setCastError('Connection timed out. Make sure your TV is on the same network.');
          } else {
            setCastError('Unable to connect to your TV. Please try again.');
          }
        }
      );
    } catch (error) {
      console.error('❌ Cast error:', error);
      setCastError('An unexpected error occurred while trying to cast. Please try again.');
    }
  }, [videoRef, src, title, poster, videoPosition, handleSessionJoined]);

  // Stop casting
  const stopCasting = useCallback(async () => {
    console.log('🎬 Stopping cast...');
    
    if (castSession) {
      try {
        // Get current playback position from cast
        const media = castSession.media?.[0];
        if (media) {
          setVideoPosition(media.getEstimatedTime());
        }

        castSession.stop(
          () => {
            console.log('✅ Cast session stopped');
            handleSessionEnded();
          },
          (error: any) => {
            console.error('❌ Failed to stop cast:', error);
            handleSessionEnded();
          }
        );
      } catch (error) {
        console.error('❌ Error stopping cast:', error);
        handleSessionEnded();
      }
    }
  }, [castSession, handleSessionEnded]);

  // Toggle casting
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
