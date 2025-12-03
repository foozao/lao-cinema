import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

// Create the i18n middleware
const intlMiddleware = createMiddleware(routing);

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

export default function middleware(request: NextRequest) {
  // Skip auth if no users configured (local development)
  if (users.length === 0) {
    return intlMiddleware(request);
  }

  const { pathname } = request.nextUrl;
  
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
  // Match only internationalized pathnames
  matcher: ['/', '/(lo|en)/:path*']
};
