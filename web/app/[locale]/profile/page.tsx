'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { Link } from '@/i18n/routing';
import { Film, Settings, User as UserIcon, Loader2, Mail, CheckCircle2, AlertCircle, Bell, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authApi, type UserStats } from '@/lib/auth';
import { ProfilePageLayout } from '@/components/profile-page-layout';
import { API_BASE_URL } from '@/lib/config';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const { user, refreshUser } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  
  useEffect(() => {
    loadStats();
  }, []);
  
  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const data = await authApi.getUserStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };
  
  const sendVerificationEmail = async () => {
    setIsSendingVerification(true);
    setVerificationError('');
    setVerificationSent(false);
    
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
      } else {
        const data = await response.json();
        setVerificationError(data.message || 'Failed to send verification email');
      }
    } catch (err) {
      setVerificationError('Failed to send verification email');
    } finally {
      setIsSendingVerification(false);
    }
  };
  
  return (
    <ProfilePageLayout maxWidth="4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">{t('myProfile')}</h1>
          <p className="text-gray-400 mt-2">{t('manageAccount')}</p>
        </div>
        
        {/* Quick Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* My Movies */}
          <Link href="/profile/movies">
            <div className="bg-gray-900 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border border-gray-700">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Film className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{t('quickLinks.myMovies')}</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {t('quickLinks.myMoviesDesc')}
                  </p>
                </div>
              </div>
            </div>
          </Link>
          
          {/* Account Settings */}
          <Link href="/profile/settings">
            <div className="bg-gray-900 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border border-gray-700">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <Settings className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{t('quickLinks.settings')}</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {t('quickLinks.settingsDesc')}
                  </p>
                </div>
              </div>
            </div>
          </Link>
          
          {/* Notifications */}
          <Link href="/profile/notifications">
            <div className="bg-gray-900 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border border-gray-700">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <Bell className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{t('quickLinks.notifications')}</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {t('quickLinks.notificationsDesc')}
                  </p>
                </div>
              </div>
            </div>
          </Link>
          
          {/* Watchlist */}
          <Link href="/profile/watchlist">
            <div className="bg-gray-900 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border border-gray-700">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Bookmark className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{t('quickLinks.watchlist')}</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {t('quickLinks.watchlistDesc')}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>
        
        {/* User Info Card */}
        {user && (
          <div className="mt-8 bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
                <UserIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {user.displayName || 'User'}
                </h3>
                <p className="text-sm text-gray-400">{user.email}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {t('memberSince')} {new Date(user.createdAt).toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric',
                    timeZone: user.timezone || 'Asia/Vientiane',
                  })}
                </p>
              </div>
            </div>
            
            {/* Email Verification Status */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-400">{t('emailVerification.status')}</span>
                </div>
                {user.emailVerified ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">{t('emailVerification.verified')}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">{t('emailVerification.notVerified')}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={sendVerificationEmail}
                      disabled={isSendingVerification || verificationSent}
                    >
                      {isSendingVerification ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          {t('emailVerification.sending')}
                        </>
                      ) : verificationSent ? (
                        t('emailVerification.sent')
                      ) : (
                        t('emailVerification.sendVerification')
                      )}
                    </Button>
                  </div>
                )}
              </div>
              
              {verificationSent && (
                <p className="mt-2 text-sm text-green-600">{t('emailVerification.sentMessage')}</p>
              )}
              
              {verificationError && (
                <p className="mt-2 text-sm text-red-600">{verificationError}</p>
              )}
            </div>
          </div>
        )}
        
        {/* Stats Card */}
        {stats && (
          <div className="mt-6 bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">{t('yourActivity')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.totalRentals}</p>
                <p className="text-sm text-gray-400">{t('totalRentals')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.activeRentals}</p>
                <p className="text-sm text-gray-400">{t('activeNow')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.totalWatchProgress}</p>
                <p className="text-sm text-gray-400">{t('inProgress')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{stats.completedMovies}</p>
                <p className="text-sm text-gray-400">{t('completed')}</p>
              </div>
            </div>
          </div>
        )}
        
        {isLoadingStats && (
          <div className="mt-6 bg-gray-900 rounded-lg shadow-sm p-12 flex items-center justify-center border border-gray-700">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        )}
    </ProfilePageLayout>
  );
}
