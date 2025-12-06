'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useVideoAnalytics } from '@/lib/analytics';
import { useHlsPlayer, useContinueWatching, useVideoKeyboard } from '@/lib/video';
import { 
  VideoControls, 
  BigPlayButton, 
  VideoLoadingSpinner, 
  VideoErrorState, 
  ContinueWatchingDialog 
} from './video';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  autoPlay?: boolean;
  videoId?: string;
  movieId?: string;
  movieTitle?: string;
  movieDuration?: number;
  constrainToViewport?: boolean;
  aspectRatio?: string;
  onInfoClick?: () => void;
}

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
  onInfoClick,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Continue watching hook
  const {
    savedPosition,
    showContinueDialog,
    pendingPosition,
    handleContinueWatching,
    handleStartFromBeginning,
    savePosition,
    hasStarted,
    setHasStarted,
  } = useContinueWatching({ videoId });

  // HLS player hook
  const { videoRef, isLoading, error, retryLoad } = useHlsPlayer({
    src,
    autoPlay,
    savedPosition,
  });

  // Analytics tracking
  const analytics = useVideoAnalytics({
    movieId: movieId || videoId || 'unknown',
    movieTitle: movieTitle || title || 'Unknown Movie',
    duration: movieDuration || duration || 0,
    source: 'watch_page',
  });

  // Toggle functions
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  }, [videoRef, isPlaying]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(!isMuted);
  }, [videoRef, isMuted]);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Keyboard shortcuts
  useVideoKeyboard({
    videoRef,
    isPlaying,
    duration,
    onToggleFullscreen: toggleFullscreen,
    onMuteChange: setIsMuted,
  });

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);
      analytics.trackTimeUpdate(time);
      savePosition(time);
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
    const handleWaiting = () => {}; // Loading handled by HLS hook
    const handleCanPlay = () => {};

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
  }, [videoRef, analytics, savePosition, setHasStarted]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Container classes
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
        {!hasStarted && !isLoading && !error && (
          <BigPlayButton onClick={togglePlay} />
        )}

        {/* Loading Spinner */}
        {isLoading && !error && (
          <VideoLoadingSpinner />
        )}

        {/* Error State */}
        {error && (
          <VideoErrorState error={error} onRetry={retryLoad} />
        )}

        {/* Continue Watching Dialog */}
        {showContinueDialog && pendingPosition !== null && (
          <ContinueWatchingDialog
            pendingPosition={pendingPosition}
            onContinue={handleContinueWatching}
            onStartFromBeginning={handleStartFromBeginning}
          />
        )}

        {/* Controls */}
        <VideoControls
          isPlaying={isPlaying}
          isMuted={isMuted}
          currentTime={currentTime}
          duration={duration}
          showControls={showControls}
          isFullscreen={isFullscreen}
          videoRef={videoRef}
          onTogglePlay={togglePlay}
          onToggleMute={toggleMute}
          onToggleFullscreen={toggleFullscreen}
          onInfoClick={onInfoClick}
        />
      </div>
    </div>
  );
}
