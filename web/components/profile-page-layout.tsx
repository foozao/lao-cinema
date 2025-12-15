'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ProfileBreadcrumbWrapper } from '@/components/profile-breadcrumb-wrapper';

interface ProfilePageLayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
  allowAnonymous?: boolean;
  isLoading?: boolean;
  maxWidth?: 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl';
}

/**
 * Shared layout wrapper for profile pages
 * 
 * Handles:
 * - Auth check and redirect to /login if needed
 * - Full-page loading state
 * - Consistent Header/Footer/Breadcrumb layout
 * - Max-width container with responsive padding
 * 
 * @param requireAuth - If true, redirects to /login if not authenticated (default: true)
 * @param allowAnonymous - If true, allows anonymous users with anonymousId (default: false)
 * @param isLoading - Show loading spinner while page data loads (default: false)
 * @param maxWidth - Max width of content container (default: '6xl')
 */
export function ProfilePageLayout({
  children,
  requireAuth = true,
  allowAnonymous = false,
  isLoading = false,
  maxWidth = '6xl',
}: ProfilePageLayoutProps) {
  const { isAuthenticated, anonymousId, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth to initialize
    if (authLoading) return;

    // Check auth requirements
    if (requireAuth) {
      if (allowAnonymous) {
        // Must be authenticated OR have anonymous ID
        if (!isAuthenticated && !anonymousId) {
          router.push('/login');
        }
      } else {
        // Must be authenticated (no anonymous allowed)
        if (!isAuthenticated) {
          router.push('/login');
        }
      }
    }
  }, [isAuthenticated, anonymousId, authLoading, requireAuth, allowAnonymous, router]);

  // Show loading spinner while auth initializes or page data loads
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Don't render content if auth check failed (will redirect)
  if (requireAuth) {
    if (allowAnonymous) {
      if (!isAuthenticated && !anonymousId) {
        return null;
      }
    } else {
      if (!isAuthenticated) {
        return null;
      }
    }
  }

  const maxWidthClass = {
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
  }[maxWidth];

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Header variant="dark" />
      <ProfileBreadcrumbWrapper />
      <div className={`${maxWidthClass} mx-auto px-4 py-8 flex-grow w-full`}>
        {children}
      </div>
      <Footer variant="dark" />
    </div>
  );
}
