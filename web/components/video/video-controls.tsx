'use client';

import { Play, Pause, Volume2, VolumeX, Maximize, Info, Cast } from 'lucide-react';
import { Button } from '../ui/button';
import { formatVideoTime } from '@/lib/video/utils';

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
}: VideoControlsProps) {
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    if (videoRef.current && duration) {
      videoRef.current.currentTime = percent * duration;
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
        className="w-full h-1 mb-4 bg-white/30 rounded cursor-pointer" 
        onClick={handleProgressClick}
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
