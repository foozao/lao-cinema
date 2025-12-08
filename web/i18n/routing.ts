import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'lo'],

  // Used when no locale matches
  defaultLocale: 'en',

  // Prefix the default locale in URLs (e.g., /en/movies)
  localePrefix: 'always'
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
const { Link: NextIntlLink, redirect, usePathname, useRouter } =
  createNavigation(routing);

// Export the base Link for use in AnimatedLink
export { NextIntlLink };

// Export animated link as default Link
// Note: AnimatedLink is imported dynamically to avoid circular deps
export { AnimatedLink as Link } from '@/components/animated-link';

// Export other navigation utilities
export { redirect, usePathname, useRouter };
