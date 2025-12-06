'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/auth';
import { Link } from '@/i18n/routing';
import { User, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function EditProfilePage() {
  const { user, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
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
      setProfileImageUrl(user.profileImageUrl || '');
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
        profileImageUrl: profileImageUrl || undefined,
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
          <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
          <p className="text-gray-600 mt-2">Update your display name and profile picture</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Current Profile Preview */}
          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-200">
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt={user.displayName || user.email}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center">
                <User className="h-10 w-10 text-white" />
              </div>
            )}
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {user?.displayName || 'User'}
              </p>
              <p className="text-sm text-gray-600">{user?.email}</p>
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
              <div className="rounded-md bg-green-50 p-4">
                <p className="text-sm text-green-800">Profile updated successfully!</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">
                This is how your name will appear across the site
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="profileImageUrl">Profile Picture URL</Label>
              <Input
                id="profileImageUrl"
                type="url"
                placeholder="https://example.com/avatar.jpg"
                value={profileImageUrl}
                onChange={(e) => setProfileImageUrl(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">
                Enter a URL to an image you'd like to use as your profile picture
              </p>
            </div>
            
            {/* Preview of new image */}
            {profileImageUrl && profileImageUrl !== user?.profileImageUrl && (
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Preview:</p>
                <img
                  src={profileImageUrl}
                  alt="Profile preview"
                  className="w-20 h-20 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
              
              <Link href="/profile">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </div>
        
        {/* Account Info */}
        <div className="mt-6 bg-gray-100 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Account Information</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Role:</strong> {user?.role}</p>
            <p><strong>Member Since:</strong> {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
