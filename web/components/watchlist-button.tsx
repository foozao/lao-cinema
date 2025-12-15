'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Bookmark, BookmarkCheck, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { Link } from '@/i18n/routing';
import { getWatchlistStatus, toggleWatchlist } from '@/lib/api/watchlist-client';

interface WatchlistButtonProps {
  movieId: string;
  variant?: 'default' | 'icon' | 'inline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function WatchlistButton({ movieId, variant = 'default', size = 'default', className }: WatchlistButtonProps) {
  const t = useTranslations('watchlist');
  const { user, isAuthenticated } = useAuth();
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsChecking(false);
      return;
    }

    const checkWatchlist = async () => {
      try {
        const data = await getWatchlistStatus(movieId);
        setInWatchlist(data.inWatchlist);
      } catch (error) {
        console.error('Failed to check watchlist status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkWatchlist();
  }, [movieId, isAuthenticated]);

  const handleToggle = async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    try {
      const newStatus = await toggleWatchlist(movieId, inWatchlist);
      setInWatchlist(newStatus);
    } catch (error) {
      console.error('Failed to toggle watchlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Not authenticated - show sign up prompt (inline variant only)
  if (!isAuthenticated) {
    if (variant === 'inline') {
      return (
        <Link href="/login">
          <Button size={size} variant="outline" className="gap-2 border-white/50 text-white hover:bg-white/10">
            <Bookmark className="w-4 h-4" />
            {t('addToWatchlist')}
          </Button>
        </Link>
      );
    }
    // For default/icon variant, show disabled button that links to login
    return (
      <Link href="/login">
        <Button
          variant="outline"
          size={size}
          className={`gap-2 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300 ${className || ''}`}
        >
          {variant === 'icon' ? (
            <Bookmark className="w-4 h-4" />
          ) : (
            <>
              <Bookmark className="w-4 h-4" />
              {t('addToWatchlist')}
            </>
          )}
        </Button>
      </Link>
    );
  }

  // Loading state
  if (isChecking) {
    return (
      <Button variant="outline" size={size} disabled className={`gap-2 ${className || ''}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        {variant !== 'icon' && t('checking')}
      </Button>
    );
  }

  // Authenticated user - show toggle button
  const buttonContent = isLoading ? (
    <Loader2 className="w-4 h-4 animate-spin" />
  ) : inWatchlist ? (
    <BookmarkCheck className="w-4 h-4" />
  ) : (
    <Bookmark className="w-4 h-4" />
  );

  const buttonText = inWatchlist ? t('inWatchlist') : t('addToWatchlist');

  if (variant === 'icon') {
    return (
      <Button
        variant={inWatchlist ? 'secondary' : 'outline'}
        size="icon"
        onClick={handleToggle}
        disabled={isLoading}
        className={`${inWatchlist 
          ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border-amber-500/50' 
          : 'border-gray-600 text-gray-400 hover:border-amber-500/50 hover:text-amber-300'
        } ${className || ''}`}
        title={buttonText}
      >
        {buttonContent}
      </Button>
    );
  }

  return (
    <Button
      variant={inWatchlist ? 'secondary' : 'outline'}
      size={size}
      onClick={handleToggle}
      disabled={isLoading}
      className={`gap-2 ${inWatchlist 
        ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border-amber-500/50' 
        : 'border-gray-600 text-gray-400 hover:border-amber-500/50 hover:text-amber-300'
      } ${className || ''}`}
    >
      {buttonContent}
      {buttonText}
    </Button>
  );
}
