'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, RefreshCw, ServerCrash } from 'lucide-react';
import { Button } from './ui/button';

interface APIErrorProps {
  onRetry: () => void;
  type?: 'network' | 'server' | 'generic';
  isRetrying?: boolean;
}

export function APIError({ onRetry, type = 'network', isRetrying = false }: APIErrorProps) {
  const t = useTranslations('apiError');

  const getIcon = () => {
    switch (type) {
      case 'network':
        return <ServerCrash className="w-8 h-8 text-red-500" />;
      case 'server':
        return <ServerCrash className="w-8 h-8 text-amber-500" />;
      default:
        return <AlertTriangle className="w-8 h-8 text-red-500" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'network':
        return t('networkErrorTitle');
      case 'server':
        return t('serverErrorTitle');
      default:
        return t('genericErrorTitle');
    }
  };

  const getMessage = () => {
    switch (type) {
      case 'network':
        return t('networkErrorMessage');
      case 'server':
        return t('serverErrorMessage');
      default:
        return t('genericErrorMessage');
    }
  };

  return (
    <div className="text-center py-16 px-4">
      <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
        {getIcon()}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {getTitle()}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
        {getMessage()}
      </p>
      <Button
        onClick={onRetry}
        disabled={isRetrying}
        className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
        {isRetrying ? t('retrying') : t('tryAgain')}
      </Button>
    </div>
  );
}
