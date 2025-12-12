'use client';

/**
 * RequireEditor Component
 * 
 * Protects admin routes by requiring editor or admin role.
 * Shows 404 page for unauthorized users.
 */

import { useAuth } from '@/lib/auth/auth-context';

export function RequireEditor({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authorized - show 404
  if (!user || (user.role !== 'editor' && user.role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center px-4">
          <h1 className="text-9xl font-bold text-gray-200">404</h1>
          <h2 className="text-2xl font-semibold text-gray-900 mt-4">Page Not Found</h2>
          <p className="text-gray-600 mt-2 max-w-md">
            The page you are looking for does not exist or you do not have permission to access it.
          </p>
          <a
            href="/"
            className="inline-block mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  // Authorized
  return <>{children}</>;
}
