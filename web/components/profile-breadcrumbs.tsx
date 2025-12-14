'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BreadcrumbSegment {
  label: string;
  href: string;
  isLast: boolean;
}

export function ProfileBreadcrumbs() {
  const pathname = usePathname();
  const t = useTranslations('profile');
  const [segments, setSegments] = useState<BreadcrumbSegment[]>([]);

  useEffect(() => {
    const buildBreadcrumbs = () => {
      // Remove locale prefix (e.g., /en/profile or /lo/profile)
      const pathWithoutLocale = pathname.replace(/^\/(en|lo)/, '');
      const parts = pathWithoutLocale.split('/').filter(Boolean);

      // Always start with Home, then Profile
      const breadcrumbs: BreadcrumbSegment[] = [
        {
          label: 'Lao Cinema',
          href: '/',
          isLast: false,
        },
        {
          label: t('myProfile'),
          href: '/profile',
          isLast: parts.length === 1, // Only 'profile'
        },
      ];

      // If we're just on /profile, return early
      if (parts.length === 1) {
        setSegments(breadcrumbs);
        return;
      }

      // Handle different profile routes
      if (parts[1] === 'rentals') {
        breadcrumbs.push({
          label: t('quickLinks.myRentals'),
          href: '/profile/rentals',
          isLast: true,
        });
      } else if (parts[1] === 'continue-watching') {
        breadcrumbs.push({
          label: t('quickLinks.continueWatching'),
          href: '/profile/continue-watching',
          isLast: true,
        });
      } else if (parts[1] === 'watchlist') {
        breadcrumbs.push({
          label: t('quickLinks.watchlist'),
          href: '/profile/watchlist',
          isLast: true,
        });
      } else if (parts[1] === 'settings') {
        breadcrumbs.push({
          label: t('quickLinks.settings'),
          href: '/profile/settings',
          isLast: true,
        });
      } else if (parts[1] === 'notifications') {
        breadcrumbs.push({
          label: t('quickLinks.notifications'),
          href: '/profile/notifications',
          isLast: true,
        });
      }

      setSegments(breadcrumbs);
    };

    buildBreadcrumbs();
  }, [pathname, t]);


  if (segments.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
      {segments.map((segment, index) => (
        <div key={segment.href} className="flex items-center space-x-2">
          {index > 0 && <ChevronRight className="w-4 h-4 text-gray-500" />}
          {segment.isLast ? (
            <span className="font-medium text-white">{segment.label}</span>
          ) : (
            <Link
              href={segment.href}
              className="text-gray-400 hover:text-gray-200 transition-colors"
            >
              {segment.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
