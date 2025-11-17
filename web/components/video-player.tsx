'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2 } from 'lucide-react';
import { Button } from './ui/button';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  autoPlay?: boolean;
  videoId?: string; // Unique identifier for saving playback position
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

export function VideoPlayer({ src, poster, title, autoPlay = false, videoId }: VideoPlayerProps) {
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Check if HLS is supported
    if (src.endsWith('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
        });

        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
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
          }
        });

        return () => {
          hls.destroy();
        };
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = src;
        video.addEventListener('loadedmetadata', () => {
          setIsLoading(false);
          if (savedPosition !== null) {
            video.currentTime = savedPosition;
          }
          if (autoPlay) {
            video.play().catch(err => console.log('Auto-play prevented:', err));
          }
        }, { once: true });
      }
    } else {
      // Regular MP4 video
      video.src = src;
      setIsLoading(false);
      if (autoPlay) {
        video.play().catch(err => console.log('Auto-play prevented:', err));
      }
    }
  }, [src, autoPlay, savedPosition]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);
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
    };
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [videoId]);

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

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-black rounded-lg overflow-hidden group"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
      <video
        ref={videoRef}
        className="w-full h-full"
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
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      )}

      {/* Continue Watching Dialog */}
      {showContinueDialog && pendingPosition !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md mx-4 shadow-2xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-3">Continue Watching?</h3>
            <p className="text-gray-300 mb-6">
              You were at {formatTime(pendingPosition)}. Would you like to continue from where you left off?
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleStartFromBeginning}
                variant="outline"
                className="flex-1"
              >
                Start from Beginning
              </Button>
              <Button
                onClick={handleContinueWatching}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Continue Watching
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Controls - overlay in fullscreen, below video otherwise */}
      {isFullscreen && (
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
        {/* Progress Bar */}
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 mb-4 bg-gray-400 rounded-lg appearance-none cursor-pointer slider [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-1.5 [&::-webkit-slider-thumb]:h-1.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-1.5 [&::-moz-range-thumb]:h-1.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer [&::-webkit-slider-runnable-track]:bg-gray-400 [&::-webkit-slider-runnable-track]:rounded-lg [&::-moz-range-track]:bg-gray-400 [&::-moz-range-track]:rounded-lg"
          style={{
            background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${(currentTime / duration) * 100}%, #9ca3af ${(currentTime / duration) * 100}%, #9ca3af 100%)`
          }}
        />

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
      )}
      </div>

      {/* Controls below video when not fullscreen */}
      {!isFullscreen && (
        <div className="bg-black p-4 rounded-b-lg">
          {/* Progress Bar */}
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 mb-4 bg-gray-400 rounded-lg appearance-none cursor-pointer slider [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-1.5 [&::-webkit-slider-thumb]:h-1.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-1.5 [&::-moz-range-thumb]:h-1.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer [&::-webkit-slider-runnable-track]:bg-gray-400 [&::-webkit-slider-runnable-track]:rounded-lg [&::-moz-range-track]:bg-gray-400 [&::-moz-range-track]:rounded-lg"
            style={{
              background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${(currentTime / duration) * 100}%, #9ca3af ${(currentTime / duration) * 100}%, #9ca3af 100%)`
            }}
          />

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
      )}
    </div>
  );
}
