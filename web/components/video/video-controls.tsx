'use client';

import { Play, Pause, Volume2, VolumeX, Maximize, Info, Cast, Subtitles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { formatVideoTime } from '@/lib/video/utils';

interface SubtitleTrack {
  id: string;
  language: string;
  label: string;
}

interface VideoControlsProps {
  isPlaying: boolean;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  showControls: boolean;
  isFullscreen: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onInfoClick?: () => void;
  // Casting
  isCastAvailable?: boolean;
  isCasting?: boolean;
  onToggleCast?: () => void;
  // Subtitles
  subtitles?: SubtitleTrack[];
  hasBurnedSubtitles?: boolean;
  burnedSubtitlesLanguage?: string;
  activeSubtitleId?: string | null;
  onSubtitleChange?: (trackId: string | null) => void;
}

export function VideoControls({
  isPlaying,
  isMuted,
  currentTime,
  duration,
  showControls,
  isFullscreen,
  videoRef,
  onTogglePlay,
  onToggleMute,
  onToggleFullscreen,
  onInfoClick,
  isCastAvailable,
  isCasting,
  onToggleCast,
  subtitles = [],
  hasBurnedSubtitles = false,
  burnedSubtitlesLanguage,
  activeSubtitleId: externalActiveSubtitleId,
  onSubtitleChange: externalOnSubtitleChange,
}: VideoControlsProps) {
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [internalActiveSubtitle, setInternalActiveSubtitle] = useState<string | null>(null);

  // Use external state if provided, otherwise use internal state
  const activeSubtitleId = externalActiveSubtitleId !== undefined ? externalActiveSubtitleId : internalActiveSubtitle;

  // Initialize active subtitle from video element (only if no external state)
  useEffect(() => {
    if (externalActiveSubtitleId !== undefined) return; // Skip if controlled externally
    if (videoRef.current) {
      const tracks = videoRef.current.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        if (tracks[i].mode === 'showing') {
          const track = subtitles.find(s => s.language === tracks[i].language);
          setInternalActiveSubtitle(track?.id || null);
          break;
        }
      }
    }
  }, [videoRef, subtitles, externalActiveSubtitleId]);

  const handleSubtitleChange = (trackId: string | null) => {
    if (externalOnSubtitleChange) {
      // Use external handler (which handles video track switching)
      externalOnSubtitleChange(trackId);
    } else {
      // Fallback: handle internally
      if (!videoRef.current) return;
      const selectedTrack = subtitles.find(s => s.id === trackId);
      const tracks = videoRef.current.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = selectedTrack && tracks[i].language === selectedTrack.language ? 'showing' : 'hidden';
      }
      setInternalActiveSubtitle(trackId);
    }
    setShowSubtitleMenu(false);
  };
  const seekToPosition = (clientX: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    if (videoRef.current && duration) {
      videoRef.current.currentTime = percent * duration;
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    seekToPosition(e.clientX, e.currentTarget);
  };

  const handleProgressTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      seekToPosition(e.touches[0].clientX, e.currentTarget);
    }
  };

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Progress Bar */}
      <div 
        className="w-full h-2 md:h-1 mb-4 bg-white/30 rounded cursor-pointer touch-none" 
        onClick={handleProgressClick}
        onTouchStart={handleProgressTouch}
        onTouchMove={handleProgressTouch}
      >
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
            onClick={onTogglePlay}
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
            onClick={onToggleMute}
            className="text-white hover:bg-white/20"
          >
            {isMuted ? (
              <VolumeX className="w-6 h-6" />
            ) : (
              <Volume2 className="w-6 h-6" />
            )}
          </Button>

          <span className="text-white text-sm">
            {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Subtitle/CC Button */}
          {subtitles.length > 0 && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSubtitleMenu(!showSubtitleMenu)}
                className={`text-white hover:bg-white/20 ${activeSubtitleId ? 'text-blue-400' : ''}`}
                title="Subtitles"
              >
                <Subtitles className="w-6 h-6" />
              </Button>
              
              {/* Subtitle Menu */}
              {showSubtitleMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg overflow-hidden min-w-[200px] shadow-lg">
                  {hasBurnedSubtitles && burnedSubtitlesLanguage && (
                    <div className="px-4 py-2 border-b border-white/10 bg-yellow-900/30">
                      <p className="text-xs text-yellow-300 flex items-center gap-1">
                        <span>⚠️</span>
                        <span>Video has burned-in subtitles</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        VTT subtitles will appear at top
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => handleSubtitleChange(null)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-white/20 ${
                      !activeSubtitleId ? 'text-blue-400 font-medium' : 'text-white'
                    }`}
                  >
                    Off
                  </button>
                  {subtitles.map((track) => (
                    <button
                      key={track.id}
                      onClick={() => handleSubtitleChange(track.id)}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-white/20 ${
                        activeSubtitleId === track.id ? 'text-blue-400 font-medium' : 'text-white'
                      }`}
                    >
                      {track.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
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
          {isCastAvailable && onToggleCast && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCast}
              className={`text-white hover:bg-white/20 ${isCasting ? 'text-blue-400' : ''}`}
              title={isCasting ? 'Stop casting' : 'Cast to TV'}
            >
              <Cast className="w-6 h-6" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFullscreen}
            className="text-white hover:bg-white/20"
          >
            <Maximize className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
