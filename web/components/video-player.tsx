'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useVideoAnalytics } from '@/lib/analytics';
import { useHlsPlayer, useContinueWatching, useVideoKeyboard } from '@/lib/video';
import { useGoogleCast } from '@/lib/video/use-google-cast';
import { 
  VideoControls, 
  BigPlayButton, 
  VideoLoadingSpinner, 
  VideoErrorState, 
  ContinueWatchingDialog,
  CastErrorNotification
} from './video';

export interface SubtitleTrack {
  id: string;
  language: string;
  label: string;
  url: string;
  isDefault: boolean;
  kind: 'subtitles' | 'captions' | 'descriptions';
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  autoPlay?: boolean;
  videoId?: string;
  movieId?: string;
  videoSourceId?: string;
  movieTitle?: string;
  movieDuration?: number;
  constrainToViewport?: boolean;
  aspectRatio?: string;
  subtitles?: SubtitleTrack[];
  onTokenRefreshed?: (newUrl: string) => void;
  onInfoClick?: () => void;
  onEnded?: () => void;
  nextVideoTitle?: string;
  autoPlayCountdown?: number | null;
  onCancelAutoPlay?: () => void;
  onPlayNow?: () => void;
  showBackToPack?: boolean;
  backToPackUrl?: string;
  onDismissBackToPack?: () => void;
}

export function VideoPlayer({ 
  src, 
  poster, 
  title, 
  autoPlay = false, 
  videoId,
  movieId,
  videoSourceId,
  movieTitle,
  movieDuration,
  constrainToViewport = false,
  subtitles = [],
  onTokenRefreshed,
  onInfoClick,
  onEnded,
  nextVideoTitle,
  autoPlayCountdown,
  onCancelAutoPlay,
  onPlayNow,
  showBackToPack,
  backToPackUrl,
  onDismissBackToPack,
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
  } = useContinueWatching({ videoId, movieDuration });

  // HLS player hook
  const { videoRef, isLoading, error, retryLoad } = useHlsPlayer({
    src,
    autoPlay,
    savedPosition,
    movieId,
    videoSourceId,
    onTokenRefreshed,
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
    const video = videoRef.current;
    const container = containerRef.current;
    
    if (!video || !container) return;

    // Check if already in fullscreen
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );

    if (!isCurrentlyFullscreen) {
      // Mobile devices: use video element fullscreen
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        // iOS Safari uses webkitEnterFullscreen
        if ((video as any).webkitEnterFullscreen) {
          (video as any).webkitEnterFullscreen();
        } 
        // Android Chrome and other mobile browsers
        else if (video.requestFullscreen) {
          video.requestFullscreen();
        } else if ((video as any).webkitRequestFullscreen) {
          (video as any).webkitRequestFullscreen();
        } else if ((video as any).mozRequestFullScreen) {
          (video as any).mozRequestFullScreen();
        } else if ((video as any).msRequestFullscreen) {
          (video as any).msRequestFullscreen();
        }
      } 
      // Desktop: use container fullscreen for better controls
      else {
        if (container.requestFullscreen) {
          container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          (container as any).webkitRequestFullscreen();
        } else if ((container as any).mozRequestFullScreen) {
          (container as any).mozRequestFullScreen();
        } else if ((container as any).msRequestFullscreen) {
          (container as any).msRequestFullscreen();
        }
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
      // iOS Safari doesn't have exitFullscreen, user must exit manually
      else if ((video as any).webkitExitFullscreen) {
        (video as any).webkitExitFullscreen();
      }
    }
  }, [videoRef]);

  // Keyboard shortcuts
  useVideoKeyboard({
    videoRef,
    isPlaying,
    duration,
    onToggleFullscreen: toggleFullscreen,
    onMuteChange: setIsMuted,
  });

  // Casting to TV (Google Cast for HLS support)
  const {
    isCastAvailable,
    isCasting,
    toggleCasting,
    castError,
  } = useGoogleCast({ 
    videoRef, 
    src,
    title: movieTitle || title,
    poster,
  });

  // Local state for cast error (to allow dismissal)
  const [displayCastError, setDisplayCastError] = useState<string | null>(null);

  // Update displayed error when castError changes
  useEffect(() => {
    if (castError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayCastError(castError);
    }
  }, [castError]);

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
      onEnded?.();
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
      const isInFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isInFullscreen);
    };
    
    // Listen to all fullscreen change events for cross-browser support
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    // iOS Safari specific - listen on video element
    const video = videoRef.current;
    if (video) {
      video.addEventListener('webkitbeginfullscreen', handleFullscreenChange);
      video.addEventListener('webkitendfullscreen', handleFullscreenChange);
    }
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      if (video) {
        video.removeEventListener('webkitbeginfullscreen', handleFullscreenChange);
        video.removeEventListener('webkitendfullscreen', handleFullscreenChange);
      }
    };
  }, [videoRef]);

  // Container classes
  const containerClasses = "w-full";
  const videoContainerClasses = constrainToViewport
    ? "relative bg-black rounded-lg overflow-hidden group w-full md:h-[calc(100vh-64px)] flex items-center justify-center"
    : "relative bg-black rounded-lg overflow-hidden group w-full";

  return (
    <div className={containerClasses}>
      <div
        ref={containerRef}
        className={videoContainerClasses}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* 
          x-webkit-airplay="allow" enables AirPlay casting to Apple TV.
          This (along with Google Cast SDK) triggers the browser's "Look for and 
          connect to devices on your local network" permission dialog.
        */}
        <video
          ref={videoRef}
          className="max-w-full max-h-full"
          poster={!hasStarted ? poster : undefined}
          playsInline
          onClick={togglePlay}
          webkit-playsinline="true"
          x-webkit-airplay="allow"
          controlsList="nodownload"
        >
          {subtitles.map((track) => (
            <track
              key={track.id}
              kind={track.kind}
              src={track.url}
              srcLang={track.language}
              label={track.label}
              default={track.isDefault}
            />
          ))}
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

        {/* Cast Error Notification */}
        <CastErrorNotification
          error={displayCastError}
          onDismiss={() => setDisplayCastError(null)}
        />

        {/* Auto-play Countdown Overlay or Back to Pack */}
        {autoPlayCountdown !== undefined && autoPlayCountdown !== null && autoPlayCountdown > 0 && nextVideoTitle && (
          <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/60 backdrop-blur-sm">
            <div className="text-center px-8 py-6 bg-black/80 rounded-lg border border-gray-700 max-w-md">
              <p className="text-gray-400 text-sm mb-2">Up Next</p>
              <p className="text-white text-xl font-semibold mb-4">{nextVideoTitle}</p>
              <div className="flex items-center justify-center gap-4">
                <div className="text-5xl font-bold text-white">{autoPlayCountdown}</div>
              </div>
              <div className="mt-4 flex gap-3 justify-center">
                {onPlayNow && (
                  <button
                    onClick={onPlayNow}
                    className="px-6 py-2 bg-white hover:bg-gray-200 text-black rounded-md transition-colors font-medium"
                  >
                    Play Now
                  </button>
                )}
                {onCancelAutoPlay && (
                  <button
                    onClick={onCancelAutoPlay}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-colors text-sm"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {showBackToPack && backToPackUrl && (
          <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/60 backdrop-blur-sm">
            <div className="text-center px-8 py-6 bg-black/80 rounded-lg border border-gray-700 max-w-md">
              <p className="text-gray-400 text-sm mb-2">Auto-play cancelled</p>
              <p className="text-white text-lg mb-6">What would you like to do?</p>
              <div className="flex flex-col gap-3">
                <a
                  href={backToPackUrl}
                  className="px-6 py-3 bg-white hover:bg-gray-200 text-black rounded-md transition-colors font-medium"
                >
                  Back to Pack
                </a>
                <button
                  onClick={onDismissBackToPack}
                  className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-colors text-sm"
                >
                  Stay Here
                </button>
              </div>
            </div>
          </div>
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
          isCastAvailable={isCastAvailable}
          isCasting={isCasting}
          onToggleCast={toggleCasting}
        />
      </div>
    </div>
  );
}
