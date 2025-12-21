'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { useTranslations } from 'next-intl';
import { getSignedVideoUrl } from '@/lib/api/video-tokens-client';

export interface VideoError {
  type: 'network' | 'fatal' | 'media' | 'auth';
  message: string;
  isRefreshing?: boolean;
}

interface UseHlsPlayerOptions {
  src: string;
  autoPlay?: boolean;
  savedPosition?: number | null;
  onManifestParsed?: () => void;
  // For automatic token refresh on 401 errors
  movieId?: string;
  videoSourceId?: string;
  onTokenRefreshed?: (newUrl: string) => void;
}

interface UseHlsPlayerReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hlsRef: React.RefObject<Hls | null>;
  isLoading: boolean;
  error: VideoError | null;
  retryLoad: () => void;
}

/**
 * Hook for managing HLS video playback
 * Handles HLS.js initialization, native HLS (Safari), and regular MP4
 */
export function useHlsPlayer({
  src,
  autoPlay = false,
  savedPosition = null,
  onManifestParsed,
  movieId,
  videoSourceId,
  onTokenRefreshed,
}: UseHlsPlayerOptions): UseHlsPlayerReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<VideoError | null>(null);
  const isRefreshingToken = useRef(false);
  const currentPosition = useRef<number>(0);
  
  const t = useTranslations('video');

  // Refresh token and reload video
  const refreshToken = useCallback(async () => {
    if (!movieId || !videoSourceId || isRefreshingToken.current) {
      return false;
    }
    
    isRefreshingToken.current = true;
    setError({ type: 'auth', message: t('refreshingSession'), isRefreshing: true });
    
    try {
      // Save current position before reloading
      if (videoRef.current) {
        currentPosition.current = videoRef.current.currentTime;
      }
      
      const { url } = await getSignedVideoUrl(movieId, videoSourceId);
      
      // Notify parent of new URL
      onTokenRefreshed?.(url);
      
      isRefreshingToken.current = false;
      return true;
    } catch (err) {
      console.error('Failed to refresh video token:', err);
      isRefreshingToken.current = false;
      setError({ type: 'auth', message: t('sessionExpired') });
      return false;
    }
  }, [movieId, videoSourceId, onTokenRefreshed, t]);

  const initializeVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);

    // HLS stream - check pathname, not full URL (which may have query params)
    const isHlsStream = src.includes('.m3u8');
    
    if (isHlsStream) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          manifestLoadingMaxRetry: 1, // Reduce retries to fail faster on 401
          manifestLoadingRetryDelay: 500,
          levelLoadingMaxRetry: 1,
          fragLoadingMaxRetry: 1,
          // Enable credentials (cookies) for signed URL sessions
          xhrSetup: (xhr) => {
            xhr.withCredentials = true;
            
            // Detect 401 errors before HLS processes them - triggers automatic token refresh
            xhr.addEventListener('loadend', () => {
              if (xhr.status === 401 && !isRefreshingToken.current) {
                refreshToken();
              }
            });
          },
        });
        
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          setError(null);
          if (savedPosition !== null && video) {
            video.currentTime = savedPosition;
          }
          if (autoPlay && video) {
            video.play().catch(err => console.log('Auto-play prevented:', err));
          }
          onManifestParsed?.();
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          // Skip logging for 401 errors - handled by XHR detection
          const httpStatus = (data.response as any)?.code;
          if (httpStatus === 401 || isRefreshingToken.current) {
            return; // Token refresh in progress via XHR detection
          }
          
          console.error('HLS error:', data);
          
          if (data.fatal) {
            setIsLoading(false);
            
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
                    data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT) {
                  setError({ type: 'network', message: t('unableToConnectServer') });
                } else if (data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR ||
                           data.details === Hls.ErrorDetails.FRAG_LOAD_TIMEOUT) {
                  setError({ type: 'network', message: t('streamInterrupted') });
                } else {
                  setError({ type: 'network', message: t('networkError') });
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                setError({ type: 'media', message: t('mediaError') });
                hls.recoverMediaError();
                break;
              default:
                setError({ type: 'fatal', message: t('genericError') });
                break;
            }
          }
        });

        return () => {
          hls.destroy();
          hlsRef.current = null;
        };
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = src;
        
        const handleError = () => {
          setIsLoading(false);
          setError({ type: 'network', message: t('unableToLoad') });
        };
        
        video.addEventListener('error', handleError, { once: true });
        video.addEventListener('loadedmetadata', () => {
          setIsLoading(false);
          setError(null);
          if (savedPosition !== null) {
            video.currentTime = savedPosition;
          }
          if (autoPlay) {
            video.play().catch(err => console.log('Auto-play prevented:', err));
          }
          onManifestParsed?.();
        }, { once: true });
        
        return () => {
          video.removeEventListener('error', handleError);
        };
      }
    } else {
      // Regular MP4 video
      video.src = src;
      
      const handleError = () => {
        setIsLoading(false);
        setError({ type: 'network', message: t('unableToLoad') });
      };
      
      video.addEventListener('error', handleError, { once: true });
      video.addEventListener('loadeddata', () => {
        setIsLoading(false);
        setError(null);
        onManifestParsed?.();
      }, { once: true });
      
      if (autoPlay) {
        video.play().catch(err => console.log('Auto-play prevented:', err));
      }
      
      return () => {
        video.removeEventListener('error', handleError);
      };
    }
  }, [src, autoPlay, savedPosition, onManifestParsed, t, refreshToken]);

  const retryLoad = useCallback(() => {
    setError(null);
    setIsLoading(true);
    
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    const video = videoRef.current;
    if (video) {
      video.src = '';
      setTimeout(() => {
        initializeVideo();
      }, 100);
    }
  }, [initializeVideo]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    return initializeVideo();
  }, [initializeVideo]);

  return {
    videoRef,
    hlsRef,
    isLoading,
    error,
    retryLoad,
  };
}
