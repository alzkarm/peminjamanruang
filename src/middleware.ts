import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function parseJwtPayload(token: string): { sub?: string; role?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function isManagerialRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return (
    normalized === 'admin' ||
    normalized === 'superadmin' ||
    normalized === 'admin_lpf' ||
    normalized === 'admin_yayasan' ||
    normalized === 'admin_univ' ||
    normalized === 'admin_umum' ||
    normalized === 'yayasan' ||
    normalized === 'security_cs'
  );
}

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

  // Token extraction & validation from cookies
  const authToken =
    request.cookies.get('siperu_auth_token')?.value ||
    request.cookies.get('siperu_access_token')?.value;

  const jwtPayload = authToken ? parseJwtPayload(authToken) : null;
  const isTokenExpired = Boolean(jwtPayload?.exp && jwtPayload.exp * 1000 < Date.now());
  const effectivePayload = !isTokenExpired ? jwtPayload : null;

  // Strict Token Validation: Verified JWT payload is the SOLE authority for authentication & roles.
  // Cookie fallback removed to prevent client-side cookie forgery of roles.
  const role = effectivePayload?.role || null;
  const isAuthenticated = Boolean(effectivePayload && role);

  // 1. Route Guard: /admin/* (Ketat: hanya role admin / superadmin / manajerial)
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!isAuthenticated || !role) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const res = NextResponse.redirect(loginUrl);
      if (isTokenExpired) {
        res.cookies.delete('siperu_auth_token');
        res.cookies.delete('siperu_user_role');
      }
      return res;
    }

    if (!isManagerialRole(role)) {
      // User biasa mencoba akses halaman admin -> redirect ke dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // 2. Route Guard: /peminjaman-saya & /dashboard
  if (
    pathname === '/peminjaman-saya' ||
    pathname.startsWith('/peminjaman-saya/') ||
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/')
  ) {
    if (!isAuthenticated || !role || role.toLowerCase() === 'guest') {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Jika akun berstatus admin/superadmin -> redirect ke panel verifikasi admin
    if (isManagerialRole(role)) {
      const targetAdmin =
        role.toLowerCase() === 'admin_yayasan' || role.toLowerCase() === 'yayasan'
          ? '/admin/approvals/yayasan'
          : '/admin/approvals';
      return NextResponse.redirect(new URL(targetAdmin, request.url));
    }
  }

  // 3. Jika sudah login dan membuka /auth/login -> redirect ke panel yang sesuai
  if (pathname === '/auth/login' && isAuthenticated && role) {
    const redirectParam = request.nextUrl.searchParams.get('redirect');
    if (redirectParam && redirectParam.startsWith('/')) {
      return NextResponse.redirect(new URL(redirectParam, request.url));
    }
    const destination = isManagerialRole(role) ? '/admin/approvals' : '/dashboard';
    return NextResponse.redirect(new URL(destination, request.url));
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
