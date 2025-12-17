'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { getWatchlistStatus, toggleWatchlist } from '@/lib/api/watchlist-client';
import { useAuthAction } from '@/lib/hooks/use-auth-action';
import { AuthRequiredModal } from '@/components/auth-required-modal';

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
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Use shared auth action hook for auto-add after login/register
  const { redirectUrl } = useAuthAction({
    parameterName: 'auto_add_to_watchlist',
    shouldTrigger: async () => {
      const data = await getWatchlistStatus(movieId);
      setInWatchlist(data.inWatchlist);
      return !data.inWatchlist;
    },
    onTrigger: async () => {
      const newStatus = await toggleWatchlist(movieId, false);
      setInWatchlist(newStatus);
    },
  });

  // Check watchlist status on mount
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
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    
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


  // Not authenticated - show button that triggers auth modal
  if (!isAuthenticated) {
    return (
      <>
        <AuthRequiredModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          redirectUrl={redirectUrl}
          icon={Bookmark}
          iconColor="text-amber-400"
          iconBgColor="bg-amber-500/20"
          title={t('authRequired')}
          message={t('authRequiredMessage')}
          createAccountText={t('createAccount')}
          signInText={t('signIn')}
        />
        <Button
          variant={variant === 'inline' ? 'outline' : 'outline'}
          size={size}
          onClick={() => setShowAuthModal(true)}
          className={`gap-2 ${
            variant === 'inline'
              ? 'border-white/50 text-white hover:bg-white/10'
              : 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'
          } ${className || ''}`}
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
      </>
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
    <>
      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        redirectUrl={redirectUrl}
        icon={Bookmark}
        iconColor="text-amber-400"
        iconBgColor="bg-amber-500/20"
        title={t('authRequired')}
        message={t('authRequiredMessage')}
        createAccountText={t('createAccount')}
        signInText={t('signIn')}
      />
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
    </>
  );
}
