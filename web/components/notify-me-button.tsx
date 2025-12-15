'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, BellOff, Loader2, UserPlus, Mail, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { Link } from '@/i18n/routing';
import { getNotificationStatus, toggleNotification } from '@/lib/api/notifications-client';
import { API_BASE_URL } from '@/lib/config';

interface NotifyMeButtonProps {
  movieId: string;
  inline?: boolean;
}

export function NotifyMeButton({ movieId, inline = false }: NotifyMeButtonProps) {
  const t = useTranslations('movie.notifications');
  const { user, isAuthenticated } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  // Check subscription status on mount
  useEffect(() => {
    if (!isAuthenticated) {
      setIsChecking(false);
      return;
    }

    const checkSubscription = async () => {
      try {
        const data = await getNotificationStatus(movieId);
        setIsSubscribed(data.subscribed);
      } catch (error) {
        console.error('Failed to check notification status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkSubscription();
  }, [movieId, isAuthenticated]);

  const handleToggleNotification = async () => {
    if (!isAuthenticated) return;
    
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

  // Not authenticated - show sign up prompt
  if (!isAuthenticated) {
    if (inline) {
      return (
        <div className="flex flex-wrap gap-2">
          <Link href="/register">
            <Button size="sm" className="gap-2 bg-white text-gray-900 hover:bg-gray-100">
              <UserPlus className="w-4 h-4" />
              {t('createAccount')}
            </Button>
          </Link>
          <Link href="/login">
            <Button size="sm" variant="outline" className="border-white/50 text-white hover:bg-white/10">
              {t('signIn')}
            </Button>
          </Link>
        </div>
      );
    }
    return (
      <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-4 mt-3">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-blue-200 mb-1">
              {t('wantToBeNotified')}
            </h4>
            <p className="text-sm text-blue-300/80 mb-3">
              {t('signUpBenefits')}
            </p>
            <div className="flex gap-2">
              <Link href="/register">
                <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="w-4 h-4" />
                  {t('createAccount')}
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm" variant="outline" className="border-blue-500/50 text-blue-300 hover:bg-blue-600/20">
                  {t('signIn')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Verification modal for unverified users
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

  // Loading state
  if (isChecking) {
    return (
      <Button variant="outline" size="sm" disabled className={`gap-2 ${inline ? 'border-white/50 text-white' : ''}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        {t('checking')}
      </Button>
    );
  }

  // Authenticated user - show toggle button
  const baseClass = inline
    ? isSubscribed
      ? 'bg-green-500 text-white hover:bg-green-600'
      : 'bg-white text-gray-900 hover:bg-gray-100'
    : isSubscribed
      ? 'bg-green-600/20 text-green-300 border-green-500/50 hover:bg-green-600/30'
      : '';

  return (
    <>
      <VerifyEmailModal />
      <Button
        variant={isSubscribed ? "secondary" : "outline"}
        size="sm"
        onClick={handleToggleNotification}
        disabled={isLoading}
        className={`gap-2 ${baseClass}`}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isSubscribed ? (
          <BellOff className="w-4 h-4" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
        {isSubscribed ? t('notifyMeEnabled') : t('notifyMe')}
      </Button>
    </>
  );
}
