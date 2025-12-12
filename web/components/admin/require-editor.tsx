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
  // IMPORTANT: Keep these styles IDENTICAL to /app/not-found.tsx
  if (!user || (user.role !== 'editor' && user.role !== 'admin')) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
      }}>
        <div style={{ textAlign: 'center', padding: '0 1rem' }}>
          <h1 style={{ 
            fontSize: '8rem',
            lineHeight: 1,
            fontWeight: 700,
            color: '#e5e7eb',
            margin: 0,
          }}>
            404
          </h1>
          <h2 style={{ 
            fontSize: '1.5rem',
            lineHeight: '2rem',
            fontWeight: 600,
            color: '#111827',
            marginTop: '1rem',
            marginBottom: 0,
          }}>
            Page Not Found
          </h2>
          <p style={{ 
            color: '#4b5563',
            marginTop: '0.5rem',
            maxWidth: '28rem',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            The page you are looking for does not exist or you do not have permission to access it.
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              marginTop: '1.5rem',
              paddingTop: '0.75rem',
              paddingBottom: '0.75rem',
              paddingLeft: '1.5rem',
              paddingRight: '1.5rem',
              backgroundColor: '#2563eb',
              color: 'white',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '1rem',
              lineHeight: '1.5rem',
            }}
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
