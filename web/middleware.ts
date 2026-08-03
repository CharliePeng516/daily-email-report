import { NextResponse, type NextRequest } from 'next/server';
import { isValidSessionCookieValue, SESSION_COOKIE_NAME } from './lib/auth';

// This dashboard shows personal/university inbox summaries, so it's gated
// behind a single shared password (see DASHBOARD_PASSWORD) rather than
// deployed fully public. Node.js runtime (stable since Next 15.5) so we can
// use node:crypto's timingSafeEqual for the cookie signature check.
export const runtime = 'nodejs';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/login' || pathname.startsWith('/api/login')) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (isValidSessionCookieValue(cookie)) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
