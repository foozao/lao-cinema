import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

// Create the i18n middleware with locale detection
const intlMiddleware = createMiddleware({
  ...routing,
  localeDetection: true, // Enable automatic locale detection
});

// Role-based Basic Auth configuration
// Format: "username:password:role,username2:password2:role2"
// Example: "admin:pass123:admin,test:test456:viewer"
const AUTH_USERS = process.env.AUTH_USERS || '';

// Parse users from environment variable
interface User {
  username: string;
  password: string;
  role: 'admin' | 'viewer';
}

function parseAuthUsers(): User[] {
  if (!AUTH_USERS) return [];
  
  return AUTH_USERS.split(',').map(userStr => {
    const [username, password, role] = userStr.trim().split(':');
    return {
      username,
      password,
      role: (role as 'admin' | 'viewer') || 'viewer'
    };
  });
}

const users = parseAuthUsers();

/**
 * Detect locale from Accept-Language header
 * Maps Thai (th) to Lao (lo) since they're similar languages
 */
function detectLocaleFromHeader(request: NextRequest): 'en' | 'lo' {
  const acceptLanguage = request.headers.get('accept-language');
  
  if (!acceptLanguage) {
    return 'en'; // Default to English
  }
  
  // Parse Accept-Language header (e.g., "en-US,en;q=0.9,lo;q=0.8,th;q=0.7")
  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const [code, qValue] = lang.trim().split(';');
      const quality = qValue ? parseFloat(qValue.replace('q=', '')) : 1.0;
      return { code: code.split('-')[0].toLowerCase(), quality };
    })
    .sort((a, b) => b.quality - a.quality);
  
  // Check for Lao or Thai (map Thai to Lao)
  for (const lang of languages) {
    if (lang.code === 'lo' || lang.code === 'th') {
      return 'lo';
    }
    if (lang.code === 'en') {
      return 'en';
    }
  }
  
  return 'en'; // Default to English
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if the path already has a locale prefix
  const hasLocalePrefix = /^\/(en|lo)(\/|$)/.test(pathname);
  
  // If no locale prefix, detect and redirect
  if (!hasLocalePrefix && pathname !== '/') {
    const detectedLocale = detectLocaleFromHeader(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${detectedLocale}${pathname}`;
    return NextResponse.redirect(url);
  }
  
  // Skip auth if no users configured (local development)
  if (users.length === 0) {
    return intlMiddleware(request);
  }
  
  // Check for Basic Auth header
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Lao Cinema"',
      },
    });
  }

  // Decode and verify credentials
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  // Find matching user
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    return new NextResponse('Invalid credentials', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Lao Cinema"',
      },
    });
  }

  // Check if user has access to admin pages
  const isAdminPath = pathname.includes('/admin');
  
  if (isAdminPath && user.role !== 'admin') {
    return new NextResponse('Access denied - Admin privileges required', {
      status: 403,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }

  // Authentication successful, proceed with i18n middleware
  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except static files and API routes
  matcher: [
    // Match all pathnames except for:
    // - API routes (/api/*)
    // - Static files (/_next/*, /favicon.ico, etc.)
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)',
  ]
};
