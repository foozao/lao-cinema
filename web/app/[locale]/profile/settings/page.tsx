'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/auth';
import { Link } from '@/i18n/routing';
import { Lock, Trash2, Loader2, AlertTriangle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  
  // Password change state
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
    }
  }, [isAuthenticated, authLoading, router]);
  
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);
    
    // Validate
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/profile" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">
            ← Back to Profile
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 mt-2">Manage your security and account preferences</p>
        </div>
        
        {/* Change Password */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="flex items-start gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Lock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
              <p className="text-sm text-gray-600 mt-1">
                Update your password to keep your account secure
              </p>
            </div>
          </div>
          
          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordError && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{passwordError}</p>
              </div>
            )}
            
            {passwordSuccess && (
              <div className="rounded-md bg-green-50 p-4">
                <p className="text-sm text-green-800">Password changed successfully!</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
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
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                disabled={isChangingPassword}
              />
              <p className="text-xs text-gray-500">At least 8 characters</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
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
                  Changing Password...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </form>
        </div>
        
        {/* Sessions */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="flex items-start gap-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <LogOut className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Active Sessions</h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage your login sessions across devices
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              You are currently signed in. If you suspect unauthorized access to your account, 
              you can log out from all devices.
            </p>
            
            <Button 
              variant="outline" 
              onClick={handleLogoutAll}
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log Out From All Devices
            </Button>
          </div>
        </div>
        
        {/* Danger Zone - Delete Account */}
        <div className="bg-white rounded-lg shadow-sm border-2 border-red-200 p-8">
          <div className="flex items-start gap-3 mb-6">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-red-900">Danger Zone</h2>
              <p className="text-sm text-red-600 mt-1">
                Irreversible actions that affect your account
              </p>
            </div>
          </div>
          
          {!showDeleteConfirm ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Deleting your account will permanently remove all your data, including rentals, 
                watch progress, and profile information. This action cannot be undone.
              </p>
              
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </div>
          ) : (
            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-red-900 mb-2">
                  ⚠️ This action cannot be undone!
                </p>
                <p className="text-sm text-red-800">
                  All your data will be permanently deleted, including:
                </p>
                <ul className="text-sm text-red-800 list-disc ml-5 mt-2">
                  <li>Your profile and account information</li>
                  <li>All rental history</li>
                  <li>Watch progress for all movies</li>
                  <li>Saved preferences and settings</li>
                </ul>
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
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Yes, Delete My Account
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
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
