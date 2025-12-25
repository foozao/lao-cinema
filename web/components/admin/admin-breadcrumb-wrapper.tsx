'use client';

import { usePathname } from 'next/navigation';
import { AdminBreadcrumbs } from './admin-breadcrumbs';

export function AdminBreadcrumbWrapper() {
  const pathname = usePathname();
  
  // Remove locale prefix (e.g., /en/admin or /lo/admin)
  const pathWithoutLocale = pathname.replace(/^\/(en|lo)/, '');
  
  // Hide breadcrumb section on main dashboard page
  if (pathWithoutLocale === '/admin') {
    return null;
  }
  
  return (
    <div className="bg-white border-b border-gray-200 sticky top-16 z-[5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <AdminBreadcrumbs />
      </div>
    </div>
  );
}
