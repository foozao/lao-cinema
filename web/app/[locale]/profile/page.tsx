'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { Link } from '@/i18n/routing';
import { Film, Clock, Settings, User as UserIcon, Loader2 } from 'lucide-react';
import { authApi, type UserStats } from '@/lib/auth';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (isAuthenticated) {
      loadStats();
    }
  }, [isAuthenticated, authLoading, router]);
  
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
  
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header variant="light" />
      <div className="max-w-4xl mx-auto px-4 py-8 flex-grow">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('myProfile')}</h1>
          <p className="text-gray-600 mt-2">{t('manageAccount')}</p>
        </div>
        
        {/* Quick Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* My Rentals */}
          <Link href="/profile/rentals">
            <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Film className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('quickLinks.myRentals')}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('quickLinks.myRentalsDesc')}
                  </p>
                </div>
              </div>
            </div>
          </Link>
          
          {/* Continue Watching */}
          <Link href="/profile/continue-watching">
            <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('quickLinks.continueWatching')}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('quickLinks.continueWatchingDesc')}
                  </p>
                </div>
              </div>
            </div>
          </Link>
          
          {/* Edit Profile */}
          <Link href="/profile/edit">
            <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <UserIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('quickLinks.editProfile')}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('quickLinks.editProfileDesc')}
                  </p>
                </div>
              </div>
            </div>
          </Link>
          
          {/* Account Settings */}
          <Link href="/profile/settings">
            <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <Settings className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('quickLinks.settings')}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('quickLinks.settingsDesc')}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>
        
        {/* User Info Card */}
        {user && (
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
                <UserIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {user.displayName || 'User'}
                </h3>
                <p className="text-sm text-gray-600">{user.email}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {t('memberSince')} {new Date(user.createdAt).toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric',
                    timeZone: user.timezone || 'Asia/Vientiane',
                  })}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Stats Card */}
        {stats && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('yourActivity')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.totalRentals}</p>
                <p className="text-sm text-gray-600">{t('totalRentals')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.activeRentals}</p>
                <p className="text-sm text-gray-600">{t('activeNow')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.totalWatchProgress}</p>
                <p className="text-sm text-gray-600">{t('inProgress')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{stats.completedMovies}</p>
                <p className="text-sm text-gray-600">{t('completed')}</p>
              </div>
            </div>
          </div>
        )}
        
        {isLoadingStats && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
