'use client';

import { usePathname } from 'next/navigation';
import { ProfileBreadcrumbs } from './profile-breadcrumbs';

export function ProfileBreadcrumbWrapper() {
  const pathname = usePathname();
  
  // Remove locale prefix (e.g., /en/profile or /lo/profile)
  const pathWithoutLocale = pathname.replace(/^\/(en|lo)/, '');
  
  
  return (
    <div className="bg-gray-900/50 border-b border-gray-800 sticky top-16 z-10 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-2">
        <ProfileBreadcrumbs />
      </div>
    </div>
  );
}
