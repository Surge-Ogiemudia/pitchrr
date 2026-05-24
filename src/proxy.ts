import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(request: NextRequest) {
  if (!request || !request.nextUrl) {
    return NextResponse.next();
  }

  const hasSessionToken = 
    request.cookies.has('next-auth.session-token') || 
    request.cookies.has('__Secure-next-auth.session-token');
    
  const isLoginPage = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register';
  const isApiAuth = request.nextUrl.pathname.startsWith('/api/auth');

  if (!hasSessionToken && !isLoginPage && !isApiAuth) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (hasSessionToken && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
