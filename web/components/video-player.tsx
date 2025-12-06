'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2, Info, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { useVideoAnalytics } from '@/lib/analytics';
import { useTranslations } from 'next-intl';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  autoPlay?: boolean;
  videoId?: string; // Unique identifier for saving playback position
  movieId?: string; // Movie ID for analytics tracking
  movieTitle?: string; // Movie title for analytics
  movieDuration?: number; // Movie duration in seconds for analytics
  constrainToViewport?: boolean; // Constrain video height to fit within viewport
  aspectRatio?: string; // Known aspect ratio from metadata (e.g., '16:9', '2.35:1')
  onInfoClick?: () => void; // Callback when info button is clicked
}

// Helper to generate localStorage key for video playback position
const getPlaybackKey = (videoId: string) => `lao-cinema-playback-${videoId}`;

// Playback data structure
interface PlaybackData {
  position: number;
  timestamp: number;
}

// Time thresholds for continue watching behavior
const CONTINUE_WATCHING_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days - max age before clearing saved position
const CONTINUE_WATCHING_MIN_PROMPT_TIME = 30 * 60 * 1000; // 30 minutes - min time before showing prompt

export function VideoPlayer({ 
  src, 
  poster, 
  title, 
  autoPlay = false, 
  videoId,
  movieId,
  movieTitle,
  movieDuration,
  constrainToViewport = false,
  aspectRatio,
  onInfoClick,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [savedPosition, setSavedPosition] = useState<number | null>(null);
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<number | null>(null);
  const [error, setError] = useState<{ type: 'network' | 'fatal' | 'media'; message: string } | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Translations
  const t = useTranslations('video');

  // Analytics tracking
  const analytics = useVideoAnalytics({
    movieId: movieId || videoId || 'unknown',
    movieTitle: movieTitle || title || 'Unknown Movie',
    duration: movieDuration || duration || 0,
    source: 'watch_page',
  });

  // Load saved playback position on mount
  useEffect(() => {
    if (!videoId) return;
    
    try {
      const saved = localStorage.getItem(getPlaybackKey(videoId));
      if (saved) {
        // Try parsing as new format (with timestamp)
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
              // Over 30 min, always show prompt
              setPendingPosition(data.position);
              setShowContinueDialog(true);
              setHasStarted(true);
            }
          }
        } catch {
          // Fallback for old format (just a number)
          const position = parseFloat(saved);
          if (!isNaN(position) && position > 0) {
            // Assume it's recent and show dialog
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

  // Retry loading video
  const retryLoad = () => {
    setError(null);
    setIsLoading(true);
    
    // Clean up existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    // Force re-initialization by updating a ref
    const video = videoRef.current;
    if (video) {
      video.src = '';
      // Small delay to allow cleanup
      setTimeout(() => {
        initializeVideo();
      }, 100);
    }
  };

  const initializeVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    // Reset error state
    setError(null);

    // Check if HLS is supported
    if (src.endsWith('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          // Retry settings for network issues
          manifestLoadingMaxRetry: 3,
          manifestLoadingRetryDelay: 1000,
          levelLoadingMaxRetry: 3,
          fragLoadingMaxRetry: 3,
        });
        
        hlsRef.current = hls;

        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          setError(null);
          // Restore saved position if available
          if (savedPosition !== null && video) {
            video.currentTime = savedPosition;
          }
          // Auto-play if requested
          if (autoPlay && video) {
            video.play().catch(err => console.log('Auto-play prevented:', err));
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS error:', data);
          
          if (data.fatal) {
            setIsLoading(false);
            
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // Network error - could be video server unreachable
                if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
                    data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT) {
                  setError({
                    type: 'network',
                    message: t('unableToConnectServer'),
                  });
                } else if (data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR ||
                           data.details === Hls.ErrorDetails.FRAG_LOAD_TIMEOUT) {
                  setError({
                    type: 'network',
                    message: t('streamInterrupted'),
                  });
                } else {
                  setError({
                    type: 'network',
                    message: t('networkError'),
                  });
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                // Try to recover from media errors
                setError({
                  type: 'media',
                  message: t('mediaError'),
                });
                hls.recoverMediaError();
                break;
              default:
                setError({
                  type: 'fatal',
                  message: t('genericError'),
                });
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
          setError({
            type: 'network',
            message: t('unableToLoad'),
          });
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
        setError({
          type: 'network',
          message: t('unableToLoad'),
        });
      };
      
      video.addEventListener('error', handleError, { once: true });
      video.addEventListener('loadeddata', () => {
        setIsLoading(false);
        setError(null);
      }, { once: true });
      
      if (autoPlay) {
        video.play().catch(err => console.log('Auto-play prevented:', err));
      }
      
      return () => {
        video.removeEventListener('error', handleError);
      };
    }
  };

  useEffect(() => {
    return initializeVideo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, autoPlay, savedPosition]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);
      // Track analytics
      analytics.trackTimeUpdate(time);
      // Save playback position to localStorage with timestamp (throttled by video's timeupdate event)
      if (videoId && time > 0) {
        try {
          const data: PlaybackData = {
            position: time,
            timestamp: Date.now()
          };
          localStorage.setItem(getPlaybackKey(videoId), JSON.stringify(data));
        } catch (error) {
          console.error('Error saving playback position:', error);
        }
      }
    };
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => {
      setIsPlaying(true);
      setHasStarted(true);
      analytics.trackPlay(video.currentTime);
    };
    const handlePause = () => {
      setIsPlaying(false);
      analytics.trackPause(video.currentTime);
    };
    const handleEnded = () => {
      analytics.trackComplete();
    };
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      analytics.trackEnd();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]); // analytics functions are stable (use refs internally)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          video.muted = !video.muted;
          setIsMuted(!video.muted);
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, duration]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleContinueWatching = () => {
    if (pendingPosition !== null) {
      setSavedPosition(pendingPosition);
    }
    setShowContinueDialog(false);
  };

  const handleStartFromBeginning = () => {
    setSavedPosition(null);
    setShowContinueDialog(false);
    if (videoId) {
      localStorage.removeItem(getPlaybackKey(videoId));
    }
  };

  // Simple approach: let video fill available space naturally
  // Controls now overlay on video, so we only need space for header ~64px
  const containerClasses = "w-full";
  
  const videoContainerClasses = constrainToViewport
    ? "relative bg-black rounded-lg overflow-hidden group w-full h-[calc(100vh-64px)] flex items-center justify-center"
    : "relative bg-black rounded-lg overflow-hidden group w-full";

  return (
    <div className={containerClasses}>
      <div
        ref={containerRef}
        className={videoContainerClasses}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
      <video
        ref={videoRef}
        className="max-w-full max-h-full"
        poster={!hasStarted ? poster : undefined}
        playsInline
        onClick={togglePlay}
      >
        Your browser does not support the video tag.
      </video>

      {/* Big Play Button (before video starts) */}
      {!hasStarted && !isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer"
          onClick={togglePlay}
        >
          <div className="bg-red-600 hover:bg-red-700 rounded-full p-6 transition-transform hover:scale-110">
            <Play className="w-16 h-16 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90">
          <div className="text-center max-w-md mx-4 p-6">
            <div className="bg-red-600/20 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {error.type === 'network' ? t('connectionError') : t('playbackError')}
            </h3>
            <p className="text-gray-400 mb-6">{error.message}</p>
            <Button
              onClick={retryLoad}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('tryAgain')}
            </Button>
          </div>
        </div>
      )}

      {/* Continue Watching Dialog */}
      {showContinueDialog && pendingPosition !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md mx-4 shadow-2xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-3">{t('continueWatching')}</h3>
            <p className="text-gray-300 mb-6">
              {t('youWereAt', { time: formatTime(pendingPosition) })}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleStartFromBeginning}
                variant="outline"
                className="flex-1"
              >
                {t('startFromBeginning')}
              </Button>
              <Button
                onClick={handleContinueWatching}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {t('continue')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Controls - always overlay on video like native player */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Bar - simple like native player */}
        <div className="w-full h-1 mb-4 bg-white/30 rounded cursor-pointer" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const percent = (e.clientX - rect.left) / rect.width;
          if (videoRef.current && duration) {
            videoRef.current.currentTime = percent * duration;
          }
        }}>
          <div 
            className="h-full bg-white rounded"
            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
          />
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="text-white hover:bg-white/20"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="text-white hover:bg-white/20"
            >
              {isMuted ? (
                <VolumeX className="w-6 h-6" />
              ) : (
                <Volume2 className="w-6 h-6" />
              )}
            </Button>

            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onInfoClick && !isFullscreen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onInfoClick}
                className="text-white hover:bg-white/20"
              >
                <Info className="w-6 h-6" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              <Maximize className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
