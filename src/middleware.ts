import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get('firebase-session');

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');

  // The dashboard is publicly accessible for development purposes.
  // To protect it, remove this if statement and uncomment the block below.
  if (pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  /*
  if (!sessionToken && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  */

  if (sessionToken && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
};
