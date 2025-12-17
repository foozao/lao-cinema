'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/auth';
import { Lock, Trash2, Loader2, AlertTriangle, LogOut, ChevronDown, ChevronUp, Globe, User, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProfilePageLayout } from '@/components/profile-page-layout';
import { API_BASE_URL } from '@/lib/config';

// Common timezone options - labelKey maps to translation keys
const TIMEZONE_OPTIONS = [
  { value: 'Asia/Vientiane', labelKey: 'lao' },
  { value: 'Asia/Bangkok', labelKey: 'thailand' },
  { value: 'Asia/Ho_Chi_Minh', labelKey: 'vietnam' },
  { value: 'Asia/Singapore', labelKey: 'singapore' },
  { value: 'Asia/Tokyo', labelKey: 'japan' },
  { value: 'Asia/Shanghai', labelKey: 'china' },
  { value: 'Asia/Kolkata', labelKey: 'india' },
  { value: 'Europe/London', labelKey: 'uk' },
  { value: 'Europe/Paris', labelKey: 'europe' },
  { value: 'America/New_York', labelKey: 'usEastern' },
  { value: 'America/Los_Angeles', labelKey: 'usPacific' },
  { value: 'Australia/Sydney', labelKey: 'australia' },
];

export default function SettingsPage() {
  const t = useTranslations('profile.settings');
  const tProfile = useTranslations('profile');
  const { user, logout, refreshUser } = useAuth();
  
  // Display name state
  const [displayName, setDisplayName] = useState('');
  const [isUpdatingDisplayName, setIsUpdatingDisplayName] = useState(false);
  const [displayNameSuccess, setDisplayNameSuccess] = useState(false);
  const [displayNameError, setDisplayNameError] = useState('');
  
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
  
  // Email change state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  
  // Email verification state
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  
  // Account deletion state
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setTimezone(user.timezone || 'Asia/Vientiane');
    }
  }, [user]);
  
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
  
  const handleDisplayNameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingDisplayName(true);
    setDisplayNameSuccess(false);
    setDisplayNameError('');
    
    try {
      await authApi.updateProfile({ displayName: displayName || undefined });
      await refreshUser();
      setDisplayNameSuccess(true);
      setTimeout(() => setDisplayNameSuccess(false), 3000);
    } catch (err) {
      setDisplayNameError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setIsUpdatingDisplayName(false);
    }
  };
  
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
  
  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess(false);
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setEmailError(t('email.errorInvalidEmail'));
      return;
    }
    
    // Check if same as current
    if (user?.email.toLowerCase() === newEmail.toLowerCase()) {
      setEmailError(t('email.errorSameEmail'));
      return;
    }
    
    setIsChangingEmail(true);
    try {
      await authApi.changeEmail({
        newEmail,
        password: emailPassword,
      });
      
      setEmailSuccess(true);
      setNewEmail('');
      setEmailPassword('');
      await refreshUser();
      
      setTimeout(() => {
        setEmailSuccess(false);
        setShowEmailForm(false);
      }, 3000);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Failed to change email');
    } finally {
      setIsChangingEmail(false);
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
  
  return (
    <ProfilePageLayout maxWidth="2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">{t('title')}</h1>
          <p className="text-gray-400 mt-2">{t('subtitle')}</p>
        </div>
        
        {/* Display Name */}
        <div className="bg-gray-900 rounded-lg shadow-sm p-6 mb-6 border border-gray-700">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-purple-900/50 rounded-lg">
              <User className="h-5 w-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white">{t('displayName.title')}</h2>
              <p className="text-sm text-gray-400 mt-1">
                {t('displayName.description')}
              </p>
            </div>
          </div>
          
          {displayNameSuccess && (
            <div className="rounded-md bg-green-900/50 border border-green-700 p-3 mb-4">
              <p className="text-sm text-green-400">{t('displayName.successMessage')}</p>
            </div>
          )}
          
          {displayNameError && (
            <div className="rounded-md bg-red-900/50 border border-red-700 p-3 mb-4">
              <p className="text-sm text-red-400">{displayNameError}</p>
            </div>
          )}
          
          <form onSubmit={handleDisplayNameChange} className="flex gap-3">
            <Input
              type="text"
              placeholder={t('displayName.placeholder')}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isUpdatingDisplayName}
              className="flex-1 bg-gray-800 border-gray-600 text-white"
            />
            <Button type="submit" disabled={isUpdatingDisplayName} size="sm">
              {isUpdatingDisplayName ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('displayName.save')
              )}
            </Button>
          </form>
        </div>
        
        {/* Email Address */}
        <div className="bg-gray-900 rounded-lg shadow-sm p-6 mb-6 border border-gray-700">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-cyan-900/50 rounded-lg">
              <Mail className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white">{t('email.title')}</h2>
              <p className="text-sm text-gray-400 mt-1">
                {t('email.description')}
              </p>
            </div>
          </div>
          
          {/* Current Email & Status */}
          <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300">{user?.email}</span>
                {user?.emailVerified ? (
                  <span className="inline-flex items-center gap-1 text-green-500 text-xs bg-green-900/30 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {tProfile('emailVerification.verified')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-500 text-xs bg-amber-900/30 px-2 py-0.5 rounded-full">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {tProfile('emailVerification.notVerified')}
                  </span>
                )}
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {!user?.emailVerified && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={sendVerificationEmail}
                    disabled={isSendingVerification || verificationSent}
                  >
                    {isSendingVerification ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        {tProfile('emailVerification.sending')}
                      </>
                    ) : verificationSent ? (
                      tProfile('emailVerification.sent')
                    ) : (
                      tProfile('emailVerification.sendVerification')
                    )}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowEmailForm(!showEmailForm);
                    if (!showEmailForm) {
                      setEmailError('');
                      setEmailSuccess(false);
                    }
                  }}
                  className="text-gray-400 hover:text-gray-900 hover:bg-gray-200"
                >
                  {t('email.changeEmail')}
                  {showEmailForm ? (
                    <ChevronUp className="h-4 w-4 ml-1" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-1" />
                  )}
                </Button>
              </div>
            </div>
            
            {verificationSent && (
              <p className="mt-2 text-sm text-green-500">{tProfile('emailVerification.sentMessage')}</p>
            )}
            {verificationError && (
              <p className="mt-2 text-sm text-red-500">{verificationError}</p>
            )}
          </div>
          
          {/* Change Email Form */}
          {showEmailForm && (
          <form onSubmit={handleChangeEmail} className="space-y-4 mt-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
            {emailError && (
              <div className="rounded-md bg-red-900/50 border border-red-700 p-3">
                <p className="text-sm text-red-400">{emailError}</p>
              </div>
            )}
            
            {emailSuccess && (
              <div className="rounded-md bg-green-900/50 border border-green-700 p-3">
                <p className="text-sm text-green-400">{t('email.successMessage')}</p>
              </div>
            )}
            
            {user?.emailVerified && (
              <div className="rounded-md bg-amber-900/30 border border-amber-700 p-3">
                <p className="text-sm text-amber-400">
                  ⚠️ {t('email.verificationNote')}
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="newEmail" className="text-white">{t('email.newEmail')}</Label>
              <Input
                id="newEmail"
                type="email"
                placeholder={t('email.newEmailPlaceholder')}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                disabled={isChangingEmail}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="emailPassword" className="text-white">{t('email.password')}</Label>
              <Input
                id="emailPassword"
                type="password"
                placeholder={t('email.passwordPlaceholder')}
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                required
                disabled={isChangingEmail}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div className="flex gap-3">
              <Button type="submit" disabled={isChangingEmail} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                {isChangingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('email.changing')}
                  </>
                ) : (
                  t('email.change')
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEmailForm(false);
                  setNewEmail('');
                  setEmailPassword('');
                  setEmailError('');
                }}
                disabled={isChangingEmail}
              >
                {t('email.cancel')}
              </Button>
            </div>
          </form>
          )}
        </div>
        
        {/* Timezone */}
        <div className="bg-gray-900 rounded-lg shadow-sm p-6 mb-6 border border-gray-700">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-green-900/50 rounded-lg">
              <Globe className="h-5 w-5 text-green-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white">{t('timezone.title')}</h2>
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
            <Label htmlFor="timezone" className="text-gray-200">{t('timezone.label')}</Label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              disabled={isUpdatingTimezone}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {t(`timezone.options.${tz.labelKey}`)}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400">
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
              <Label htmlFor="currentPassword" className="text-white">{t('password.currentPassword')}</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={isChangingPassword}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-white">{t('password.newPassword')}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                disabled={isChangingPassword}
                className="bg-gray-800 border-gray-600 text-white"
              />
              <p className="text-xs text-gray-500">{t('password.requirements')}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">{t('password.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={isChangingPassword}
                className="bg-gray-800 border-gray-600 text-white"
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
    </ProfilePageLayout>
  );
}
