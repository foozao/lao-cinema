'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, BellOff, Loader2, UserPlus, Mail, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { Link } from '@/i18n/routing';
import { getNotificationStatus, toggleNotification } from '@/lib/api/notifications-client';
import { API_BASE_URL } from '@/lib/config';
import { usePathname, useSearchParams } from 'next/navigation';

interface NotifyMeButtonProps {
  movieId: string;
  inline?: boolean;
}

export function NotifyMeButton({ movieId, inline = false }: NotifyMeButtonProps) {
  const t = useTranslations('movie.notifications');
  const { user, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const hasAutoNotified = useRef(false);

  // Check subscription status on mount and handle action parameter
  useEffect(() => {
    if (!isAuthenticated) {
      setIsChecking(false);
      return;
    }

    const checkSubscription = async () => {
      try {
        const data = await getNotificationStatus(movieId);
        setIsSubscribed(data.subscribed);
        
        // Check if user was redirected here with auto_notify parameter
        const autoNotify = searchParams.get('auto_notify');
        if (autoNotify === 'true' && !data.subscribed && !hasAutoNotified.current) {
          // Mark as processing to prevent duplicate subscriptions in React Strict Mode
          hasAutoNotified.current = true;
          
          // Auto-subscribe after successful auth
          const newStatus = await toggleNotification(movieId, false);
          setIsSubscribed(newStatus);
          // Clean up URL
          window.history.replaceState({}, '', pathname);
        }
      } catch (error) {
        console.error('Failed to check notification status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkSubscription();
  }, [movieId, isAuthenticated, pathname, searchParams]);

  const handleToggleNotification = async () => {
    // If not authenticated, show auth modal instead
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    
    // If user's email is not verified and they're trying to subscribe, show modal
    if (user && !user.emailVerified && !isSubscribed) {
      setShowVerifyModal(true);
      return;
    }
    
    setIsLoading(true);
    try {
      const newStatus = await toggleNotification(movieId, isSubscribed);
      setIsSubscribed(newStatus);
    } catch (error) {
      console.error('Failed to toggle notification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendVerification = async () => {
    setIsSendingVerification(true);
    try {
      const token = localStorage.getItem('lao_cinema_session_token');
      const response = await fetch(`${API_BASE_URL}/auth/send-verification-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ locale: 'en' }),
      });
      
      if (response.ok) {
        setVerificationSent(true);
      }
    } catch (error) {
      console.error('Failed to send verification email:', error);
    } finally {
      setIsSendingVerification(false);
    }
  };

  // Auth required modal for unauthenticated users
  const AuthRequiredModal = () => {
    if (!showAuthModal) return null;
    
    // Create redirect URL with auto_notify parameter
    const redirectUrl = `${pathname}?auto_notify=true`;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/70"
          onClick={() => setShowAuthModal(false)}
        />
        
        {/* Modal */}
        <div className="relative bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full shadow-xl">
          <button
            onClick={() => setShowAuthModal(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/20 rounded-full">
              <Bell className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">
                {t('authRequired')}
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                {t('authRequiredMessage')}
              </p>
              
              <div className="flex flex-col gap-2">
                <Link href={`/register?redirect=${encodeURIComponent(redirectUrl)}`} className="w-full">
                  <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                    <UserPlus className="w-4 h-4" />
                    {t('createAccount')}
                  </Button>
                </Link>
                <Link href={`/login?redirect=${encodeURIComponent(redirectUrl)}`} className="w-full">
                  <Button variant="outline" className="w-full border-gray-500 bg-transparent text-gray-200 hover:text-white hover:bg-gray-800 hover:border-gray-400">
                    {t('signIn')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Verification modal for verified users
  const VerifyEmailModal = () => {
    if (!showVerifyModal) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/70"
          onClick={() => setShowVerifyModal(false)}
        />
        
        {/* Modal */}
        <div className="relative bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full shadow-xl">
          <button
            onClick={() => setShowVerifyModal(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/20 rounded-full">
              <Mail className="w-6 h-6 text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">
                {t('verifyEmailRequired')}
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                {t('verifyEmailMessage')}
              </p>
              
              {verificationSent ? (
                <p className="text-green-400 text-sm">{t('verificationSent')}</p>
              ) : (
                <Button
                  onClick={handleSendVerification}
                  disabled={isSendingVerification}
                  className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isSendingVerification ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  {t('sendVerificationEmail')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading state (only for authenticated users)
  if (isChecking && isAuthenticated) {
    return (
      <Button variant="outline" size="sm" disabled className={`gap-2 ${inline ? 'border-white/50 text-white' : ''}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        {t('checking')}
      </Button>
    );
  }

  // Button styling based on auth and subscription status
  const baseClass = inline
    ? isAuthenticated && isSubscribed
      ? 'bg-green-500 text-white hover:bg-green-600'
      : 'bg-white text-gray-900 hover:bg-gray-100'
    : isAuthenticated && isSubscribed
      ? 'bg-green-600/20 text-green-300 border-green-500/50 hover:bg-green-600/30'
      : '';

  return (
    <>
      <AuthRequiredModal />
      <VerifyEmailModal />
      <Button
        variant={isAuthenticated && isSubscribed ? "secondary" : "outline"}
        size="sm"
        onClick={handleToggleNotification}
        disabled={isLoading}
        className={`gap-2 ${baseClass}`}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isAuthenticated && isSubscribed ? (
          <BellOff className="w-4 h-4" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
        {isAuthenticated && isSubscribed ? t('notifyMeEnabled') : t('notifyMe')}
      </Button>
    </>
  );
}
