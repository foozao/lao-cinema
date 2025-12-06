'use client';

import { Play, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { useTranslations } from 'next-intl';
import { type VideoError } from '@/lib/video/use-hls-player';
import { formatVideoTime } from '@/lib/video/utils';

// =============================================================================
// BIG PLAY BUTTON
// =============================================================================

interface BigPlayButtonProps {
  onClick: () => void;
}

export function BigPlayButton({ onClick }: BigPlayButtonProps) {
  return (
    <div 
      className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer"
      onClick={onClick}
    >
      <div className="bg-red-600 hover:bg-red-700 rounded-full p-6 transition-transform hover:scale-110">
        <Play className="w-16 h-16 text-white fill-white" />
      </div>
    </div>
  );
}

// =============================================================================
// LOADING SPINNER
// =============================================================================

export function VideoLoadingSpinner() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
      <Loader2 className="w-12 h-12 text-white animate-spin" />
    </div>
  );
}

// =============================================================================
// ERROR STATE
// =============================================================================

interface VideoErrorStateProps {
  error: VideoError;
  onRetry: () => void;
}

export function VideoErrorState({ error, onRetry }: VideoErrorStateProps) {
  const t = useTranslations('video');
  
  return (
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
          onClick={onRetry}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('tryAgain')}
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// CONTINUE WATCHING DIALOG
// =============================================================================

interface ContinueWatchingDialogProps {
  pendingPosition: number;
  onContinue: () => void;
  onStartFromBeginning: () => void;
}

export function ContinueWatchingDialog({
  pendingPosition,
  onContinue,
  onStartFromBeginning,
}: ContinueWatchingDialogProps) {
  const t = useTranslations('video');
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md mx-4 shadow-2xl border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-3">{t('continueWatching')}</h3>
        <p className="text-gray-300 mb-6">
          {t('youWereAt', { time: formatVideoTime(pendingPosition) })}
        </p>
        <div className="flex gap-3">
          <Button
            onClick={onStartFromBeginning}
            variant="outline"
            className="flex-1"
          >
            {t('startFromBeginning')}
          </Button>
          <Button
            onClick={onContinue}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            {t('continue')}
          </Button>
        </div>
      </div>
    </div>
  );
}
