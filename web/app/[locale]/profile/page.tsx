import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Film, Clock, Settings, User } from 'lucide-react';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('profile');
  
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function ProfilePage() {
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
          
          {/* Account Settings */}
          <Link href="/profile/edit">
            <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <User className="h-6 w-6 text-purple-600" />
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
        
        {/* Note for Client Component */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This is a server component placeholder. The actual profile data will be loaded client-side using the useAuth hook.
          </p>
        </div>
      </div>
    </div>
  );
}
