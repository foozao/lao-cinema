'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/auth';
import { Link } from '@/i18n/routing';
import { User, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export default function EditProfilePage() {
  const t = useTranslations('profile.edit');
  const { user, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (user) {
      setDisplayName(user.displayName || '');
    }
  }, [user, isAuthenticated, authLoading, router]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);
    
    try {
      await authApi.updateProfile({
        displayName: displayName || undefined,
      });
      
      // Refresh user data
      await refreshUser();
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Header variant="dark" />
      <div className="max-w-2xl mx-auto px-4 py-8 flex-grow">
        {/* Header */}
        <div className="mb-8">
          <Link href="/profile" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">
            ← {t('backToProfile')}
          </Link>
          <h1 className="text-3xl font-bold text-white">{t('title')}</h1>
          <p className="text-gray-400 mt-2">{t('subtitle')}</p>
        </div>
        
        <div className="bg-gray-900 rounded-lg shadow-sm p-8 border border-gray-700">
          {/* Current Profile Preview */}
          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-700">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center">
              <User className="h-10 w-10 text-white" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">
                {user?.displayName || 'User'}
              </p>
              <p className="text-sm text-gray-400">{user?.email}</p>
            </div>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="rounded-md bg-green-50 p-4 mb-6">
                <p className="text-sm text-green-800">{t('successMessage')}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="displayName">{t('displayName')}</Label>
              <Input
                id="displayName"
                type="text"
                placeholder={t('displayNamePlaceholder')}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">
                {t('displayNameHelp')}
              </p>
            </div>
            
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t('save')}
                  </>
                )}
              </Button>
              <Link href="/profile" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  {t('cancel')}
                </Button>
              </Link>
            </div>
          </form>
        </div>
        
        {/* Account Info */}
        <div className="mt-6 bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-2">{t('accountInfo')}</h3>
          <div className="space-y-1 text-sm text-gray-400">
            <p><strong>{t('email')}:</strong> {user?.email}</p>
            <p><strong>{t('memberSince')}:</strong> {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              timeZone: user.timezone || 'Asia/Vientiane',
            }) : 'N/A'}</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
