'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/auth';
import { Link } from '@/i18n/routing';
import { Lock, Trash2, Loader2, AlertTriangle, LogOut, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

// Common timezone options
const TIMEZONE_OPTIONS = [
  { value: 'Asia/Vientiane', label: 'Lao Time (GMT+7)' },
  { value: 'Asia/Bangkok', label: 'Thailand (GMT+7)' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Vietnam (GMT+7)' },
  { value: 'Asia/Singapore', label: 'Singapore (GMT+8)' },
  { value: 'Asia/Tokyo', label: 'Japan (GMT+9)' },
  { value: 'Asia/Shanghai', label: 'China (GMT+8)' },
  { value: 'Asia/Kolkata', label: 'India (GMT+5:30)' },
  { value: 'Europe/London', label: 'UK (GMT+0/+1)' },
  { value: 'Europe/Paris', label: 'Central Europe (GMT+1/+2)' },
  { value: 'America/New_York', label: 'US Eastern (GMT-5/-4)' },
  { value: 'America/Los_Angeles', label: 'US Pacific (GMT-8/-7)' },
  { value: 'Australia/Sydney', label: 'Australia Eastern (GMT+10/+11)' },
];

export default function SettingsPage() {
  const t = useTranslations('profile.settings');
  const { user, isAuthenticated, isLoading: authLoading, logout, refreshUser } = useAuth();
  const router = useRouter();
  
  // Timezone state
  const [timezone, setTimezone] = useState('Asia/Vientiane');
  const [isUpdatingTimezone, setIsUpdatingTimezone] = useState(false);
  const [timezoneSuccess, setTimezoneSuccess] = useState(false);
  
  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Account deletion state
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (user) {
      setTimezone(user.timezone || 'Asia/Vientiane');
    }
  }, [isAuthenticated, authLoading, router, user]);
  
  const handleTimezoneChange = async (newTimezone: string) => {
    setTimezone(newTimezone);
    setIsUpdatingTimezone(true);
    setTimezoneSuccess(false);
    
    try {
      await authApi.updateProfile({ timezone: newTimezone });
      await refreshUser();
      setTimezoneSuccess(true);
      setTimeout(() => setTimezoneSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update timezone:', err);
      // Revert on error
      setTimezone(user?.timezone || 'Asia/Vientiane');
    } finally {
      setIsUpdatingTimezone(false);
    }
  };
  
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);
    
    // Validate
    if (newPassword.length < 8) {
      setPasswordError(t('password.errorMinLength'));
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError(t('password.errorMismatch'));
      return;
    }
    
    setIsChangingPassword(true);
    try {
      await authApi.changePassword({
        currentPassword,
        newPassword,
      });
      
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };
  
  const handleLogoutAll = async () => {
    if (!confirm('This will log you out from all devices. Continue?')) return;
    
    try {
      await authApi.logoutAll();
      // Logout function handles redirect
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to logout from all devices');
    }
  };
  
  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!confirm('⚠️ WARNING: This action CANNOT be undone. All your data will be permanently deleted. Are you absolutely sure?')) {
      return;
    }
    
    setIsDeletingAccount(true);
    try {
      await authApi.deleteAccount(deletePassword);
      // Account deleted, logout function handles redirect
      alert('Your account has been deleted.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setIsDeletingAccount(false);
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
        
        {/* Timezone */}
        <div className="bg-gray-900 rounded-lg shadow-sm p-8 mb-6 border border-gray-700">
          <div className="flex items-start gap-3 mb-6">
            <div className="p-2 bg-green-900/50 rounded-lg">
              <Globe className="h-5 w-5 text-green-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white">{t('timezone.title')}</h2>
              <p className="text-sm text-gray-400 mt-1">
                {t('timezone.description')}
              </p>
            </div>
          </div>
          
          {timezoneSuccess && (
            <div className="rounded-md bg-green-50 p-4 mb-4">
              <p className="text-sm text-green-800">{t('timezone.successMessage')}</p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="timezone">{t('timezone.label')}</Label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              disabled={isUpdatingTimezone}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              {t('timezone.help')}
            </p>
          </div>
        </div>
        
        {/* Change Password */}
        <div className="bg-gray-900 rounded-lg shadow-sm p-8 mb-6 border border-gray-700">
          <button
            type="button"
            onClick={() => {
              setShowPasswordForm(!showPasswordForm);
              if (!showPasswordForm) {
                setPasswordError('');
                setPasswordSuccess(false);
              }
            }}
            className="w-full flex items-start gap-3 text-left"
          >
            <div className="p-2 bg-blue-900/50 rounded-lg">
              <Lock className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white">{t('password.title')}</h2>
              <p className="text-sm text-gray-400 mt-1">
                {t('password.description')}
              </p>
            </div>
            <div className="p-2">
              {showPasswordForm ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </button>
          
          {showPasswordForm && (
          <form onSubmit={handleChangePassword} className="space-y-4 mt-6 pt-6 border-t border-gray-700">
            {passwordError && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{passwordError}</p>
              </div>
            )}
            
            {passwordSuccess && (
              <div className="rounded-md bg-green-50 p-4">
                <p className="text-sm text-green-800">{t('password.successMessage')}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t('password.currentPassword')}</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={isChangingPassword}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('password.newPassword')}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                disabled={isChangingPassword}
              />
              <p className="text-xs text-gray-500">{t('password.requirements')}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('password.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={isChangingPassword}
              />
            </div>
            
            <Button type="submit" disabled={isChangingPassword}>
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('password.changing')}
                </>
              ) : (
                t('password.change')
              )}
            </Button>
          </form>
          )}
        </div>
        
        {/* Sessions */}
        <div className="bg-gray-900 rounded-lg shadow-sm p-8 mb-6 border border-gray-700">
          <div className="flex items-start gap-3 mb-6">
            <div className="p-2 bg-purple-900/50 rounded-lg">
              <LogOut className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{t('sessions.title')}</h2>
              <p className="text-sm text-gray-400 mt-1">
                {t('sessions.description')}
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              {t('sessions.confirmMessage')}
            </p>
            
            <Button 
              variant="outline" 
              onClick={handleLogoutAll}
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('sessions.logoutAll')}
            </Button>
          </div>
        </div>
        
        {/* Danger Zone - Delete Account */}
        <div className="bg-gray-900 rounded-lg shadow-sm border-2 border-red-700 p-8">
          <div className="flex items-start gap-3 mb-6">
            <div className="p-2 bg-red-900/50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-red-400">{t('deleteAccount.title')}</h2>
              <p className="text-sm text-red-500 mt-1">
                {t('deleteAccount.description')}
              </p>
            </div>
          </div>
          
          {!showDeleteConfirm ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                {t('deleteAccount.warningMessage')}
              </p>
              
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('deleteAccount.deleteButton')}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
                <p className="text-sm font-semibold text-red-400 mb-2">
                  ⚠️ {t('deleteAccount.warning')}
                </p>
                <p className="text-sm text-red-800">
                  {t('deleteAccount.confirmMessage')}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="deletePassword">Confirm with your password</Label>
                <Input
                  id="deletePassword"
                  type="password"
                  placeholder="Enter your password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  required
                  disabled={isDeletingAccount}
                />
              </div>
              
              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={isDeletingAccount}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeletingAccount ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('deleteAccount.deleting')}
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('deleteAccount.deleteButton')}
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletePassword('');
                  }}
                  disabled={isDeletingAccount}
                >
                  {t('deleteAccount.cancel')}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
