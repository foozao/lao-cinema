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
    chrome?: {
      cast?: any; // Using any to avoid complex type declarations for external SDK
    };
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

  // Check if device is iOS (iPhone, iPad, iPod)
  const isIOS = typeof window !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Initialize Google Cast
  useEffect(() => {
    // Skip initialization on iOS devices - they use AirPlay instead
    if (isIOS) {
      console.log('📱 iOS device detected - Google Cast not supported, use AirPlay instead');
      return;
    }

    let sdkTimeout: NodeJS.Timeout;
    
    const initCast = () => {
      console.log('🔍 Checking Cast SDK:', {
        hasWindow: typeof window !== 'undefined',
        hasChrome: !!window.chrome,
        hasCast: !!window.chrome?.cast,
        castIsAvailable: window.chrome?.cast?.isAvailable,
        userAgent: navigator.userAgent,
      });
      
      if (!window.chrome?.cast) {
        console.log('⏳ Google Cast SDK not loaded yet, waiting...');
        return;
      }

      // Clear the timeout since SDK loaded successfully
      if (sdkTimeout) {
        clearTimeout(sdkTimeout);
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
          console.log('🎬 Cast availability changed:', availability);
          const isAvailable = availability === 'available';
          setIsCastAvailable(isAvailable);
          
          if (!isAvailable) {
            console.log('⚠️ No Chromecast devices detected on network');
          } else {
            console.log('✅ Chromecast devices found on network');
          }
        }
      );

      window.chrome.cast.initialize(
        apiConfig,
        () => {
          console.log('✅ Google Cast initialized successfully');
          // Don't set isCastAvailable here - wait for availability callback
        },
        (error: any) => {
          console.error('❌ Cast initialization error:', {
            code: error.code,
            description: error.description,
            message: error.message,
          });
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
      } else {
        console.error('❌ Cast API reported as unavailable');
      }
    };

    // Check if already loaded
    if (window.chrome?.cast?.isAvailable) {
      initCast();
    } else {
      // Set timeout to detect if SDK never loads
      sdkTimeout = setTimeout(() => {
        if (!window.chrome?.cast) {
          console.error('❌ Cast SDK failed to load within 10 seconds');
          console.log('🔍 Final state check:', {
            hasChrome: !!window.chrome,
            hasCast: !!window.chrome?.cast,
            url: window.location.href,
            protocol: window.location.protocol,
          });
        }
      }, 10000);
    }

    return () => {
      if (sdkTimeout) {
        clearTimeout(sdkTimeout);
      }
    };
  }, [isIOS]);

  // Handle session joined
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
  }, []);

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

  // Start casting
  const startCasting = useCallback(async () => {
    console.log('🎬 Starting cast...');
    console.log('🔍 Debug info:', {
      hasWindow: typeof window !== 'undefined',
      hasChrome: !!window.chrome,
      hasCast: !!window.chrome?.cast,
      castIsAvailable: window.chrome?.cast?.isAvailable,
      userAgent: navigator.userAgent,
    });
    
    if (!window.chrome?.cast) {
      console.error('❌ Google Cast SDK not available');
      
      // More specific error for mobile Chrome
      if (/Chrome/i.test(navigator.userAgent) && /Mobile/i.test(navigator.userAgent)) {
        setCastError('Cast SDK not loaded. Try refreshing the page or check if the script is blocked.');
      } else {
        setCastError('Casting is not available. Please make sure you are using Chrome or Edge browser.');
      }
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
      window.chrome!.cast!.requestSession(
        (session: any) => {
          console.log('✅ Cast session started:', session.getSessionId());
          console.log('🎬 Session details:', {
            sessionId: session.getSessionId(),
            receiverName: session.receiver?.friendlyName,
            receiverDisplayName: session.receiver?.displayName,
            appId: session.appId,
          });
          handleSessionJoined(session);

          // Load media
          console.log('🎬 Preparing media for cast:', {
            src,
            contentType: 'application/x-mpegURL',
            title,
            hasPoster: !!poster,
            startTime: videoPosition,
          });

          const mediaInfo = new window.chrome!.cast!.media.MediaInfo(src, 'application/x-mpegURL');
          mediaInfo.metadata = new window.chrome!.cast!.media.GenericMediaMetadata();
          mediaInfo.metadata.title = title;
          if (poster) {
            mediaInfo.metadata.images = [new window.chrome!.cast!.Image(poster)];
          }

          const request = new window.chrome!.cast!.media.LoadRequest(mediaInfo);
          request.currentTime = videoPosition;
          request.autoplay = true;

          console.log('🎬 Loading media on cast device...');
          session.loadMedia(
            request,
            (media: any) => {
              console.log('✅ Media loaded successfully on cast device');
              console.log('🎬 Media details:', {
                mediaSessionId: media.mediaSessionId,
                playerState: media.playerState,
                currentTime: media.currentTime,
                duration: media.media?.duration,
              });
            },
            (error: any) => {
              console.error('❌ Failed to load media:', {
                code: error.code,
                description: error.description,
                details: error.details,
                message: error.message,
              });
              setCastError('Unable to load video on your TV. The video format may not be supported.');
            }
          );
        },
        (error: any) => {
          console.error('❌ Failed to start cast session:', {
            code: error.code,
            description: error.description,
            details: error.details,
            message: error.message,
            fullError: JSON.stringify(error, null, 2),
          });
          
          if (error.code === 'cancel') {
            console.log('ℹ️ User cancelled cast dialog');
            setCastError(null);
          } else if (error.code === 'timeout') {
            setCastError('Connection timed out. Make sure your TV is on the same network.');
          } else if (error.code === 'receiver_unavailable') {
            setCastError('No Chromecast devices found. Make sure your TV is on and connected to the same network.');
          } else {
            setCastError(`Unable to connect to your TV. Error: ${error.code || 'unknown'}`);
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
