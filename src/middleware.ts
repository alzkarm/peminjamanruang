import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Daftar rute publik yang bebas diakses tanpa pemeriksaan login
const PUBLIC_ROUTES = [
  '/',
  '/schedule',
  '/auth/login',
  '/verify',
  '/approval',
  '/cbt-room',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let Next.js internal static assets & chunks pass through directly
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Rute verifikasi publik (/verify/:path*) bebas diakses guest tanpa pemeriksaan sesi
  if (pathname.startsWith('/verify')) {
    const response = NextResponse.next();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return response;
  }

  // Set standard security and cache headers
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
