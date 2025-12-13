'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, BellOff, Loader2, UserPlus, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { Link } from '@/i18n/routing';
import { authApi } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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

  // Check subscription status on mount
  useEffect(() => {
    if (!isAuthenticated) {
      setIsChecking(false);
      return;
    }

    const checkSubscription = async () => {
      try {
        const token = localStorage.getItem('lao_cinema_session_token');
        const response = await fetch(`${API_URL}/notifications/movies/${movieId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsSubscribed(data.subscribed);
        }
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
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('lao_cinema_session_token');
      const method = isSubscribed ? 'DELETE' : 'POST';
      
      const response = await fetch(`${API_URL}/notifications/movies/${movieId}`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        setIsSubscribed(!isSubscribed);
      }
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
      const response = await fetch(`${API_URL}/auth/send-verification-email`, {
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

  // Authenticated but email not verified - show verify prompt
  if (user && !user.emailVerified) {
    if (inline) {
      return (
        <div>
          <p className="text-sm mb-2 opacity-80">{t('verifyEmailRequired')}</p>
          {verificationSent ? (
            <p className="text-sm text-green-400">{t('verificationSent')}</p>
          ) : (
            <Button
              size="sm"
              onClick={handleSendVerification}
              disabled={isSendingVerification}
              className="gap-2 bg-white text-gray-900 hover:bg-gray-100"
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
      );
    }
    return (
      <div className="bg-amber-600/10 border border-amber-500/30 rounded-lg p-4 mt-3">
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-amber-200 mb-1">
              {t('verifyEmailRequired')}
            </h4>
            <p className="text-sm text-amber-300/80 mb-3">
              {t('verifyEmailMessage')}
            </p>
            {verificationSent ? (
              <p className="text-sm text-green-400">{t('verificationSent')}</p>
            ) : (
              <Button
                size="sm"
                onClick={handleSendVerification}
                disabled={isSendingVerification}
                className="gap-2 bg-amber-600 hover:bg-amber-700"
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
    );
  }

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
  );
}
