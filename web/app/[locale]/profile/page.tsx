'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Link } from '@/i18n/routing';
import { Film, Clock, Settings, User as UserIcon, Loader2 } from 'lucide-react';
import { authApi, type UserStats } from '@/lib/auth';

export default function ProfilePage() {
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">Manage your account and view your activity</p>
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
                  <h2 className="text-lg font-semibold text-gray-900">My Rentals</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    View your rented movies and rental history
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
                  <h2 className="text-lg font-semibold text-gray-900">Continue Watching</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Resume movies from where you left off
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
                  <h2 className="text-lg font-semibold text-gray-900">Edit Profile</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Update your display name and profile picture
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
                  <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage your account settings and preferences
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
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt={user.displayName || user.email}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
                  <UserIcon className="h-8 w-8 text-white" />
                </div>
              )}
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {user.displayName || 'User'}
                </h3>
                <p className="text-sm text-gray-600">{user.email}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Member since {new Date(user.createdAt).toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Stats Card */}
        {stats && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Activity</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.totalRentals}</p>
                <p className="text-sm text-gray-600">Total Rentals</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.activeRentals}</p>
                <p className="text-sm text-gray-600">Active Now</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.totalWatchProgress}</p>
                <p className="text-sm text-gray-600">In Progress</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{stats.completedMovies}</p>
                <p className="text-sm text-gray-600">Completed</p>
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
    </div>
  );
}
