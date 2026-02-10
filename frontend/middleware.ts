import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  isValidAppUser,
  isStaffUser,
  isAdminUser,
  getHomeRoute,
  PUBLIC_ROUTES,
} from './lib/middlewareAuth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get auth cookies
  const authToken = request.cookies.get('auth-token');
  const userType = request.cookies.get('user-type')?.value;

  // Check if this is a public route
  const isPublicPath = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

  // Emergency reset - clear cookies and redirect to login
  if (pathname === '/reset') {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    response.cookies.delete('user-type');
    response.cookies.delete('splash-seen');
    return response;
  }

  // Root path - redirect to splash if first visit
  if (pathname === '/') {
    const hasSeen = request.cookies.get('splash-seen');

    if (!hasSeen) {
      const response = NextResponse.redirect(new URL('/splash', request.url));
      response.cookies.set('splash-seen', 'true', { maxAge: 60 * 60 * 24 * 30 }); // 30 days
      return response;
    }

    // If already logged in, redirect to appropriate home
    if (authToken) {
      return NextResponse.redirect(new URL(getHomeRoute(userType), request.url));
    }

    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Protected app routes (customer/employee only - NOT staff)
  if (pathname.startsWith('/app/')) {
    if (!authToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Staff should use /staff/* portal, not /app/*
    if (userType === 'staff') {
      return NextResponse.redirect(new URL('/staff/scan', request.url));
    }
    // Admin goes to admin dashboard
    if (isAdminUser(userType)) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    // Validate user type can access app routes (customer, employee)
    if (!isValidAppUser(userType)) {
      // Invalid user type, clear and redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth-token');
      response.cookies.delete('user-type');
      return response;
    }
  }

  // Protected staff routes
  const staffPublicPaths = ['/staff/login', '/staff/register', '/staff/forgot-password', '/staff/reset-password'];
  const isStaffPublicPath = staffPublicPaths.some(path => pathname.startsWith(path));

  if (pathname.startsWith('/staff/') && !isStaffPublicPath) {
    if (!authToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Staff routes require staff, employee, or admin role
    if (!isStaffUser(userType)) {
      return NextResponse.redirect(new URL('/app/home', request.url));
    }
  }

  // Protected admin routes
  if (pathname.startsWith('/admin/')) {
    if (!authToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Admin routes require admin role only
    if (!isAdminUser(userType)) {
      // Staff goes to staff portal
      if (isStaffUser(userType)) {
        return NextResponse.redirect(new URL('/staff/scan', request.url));
      }
      // Others go to app
      return NextResponse.redirect(new URL('/app/home', request.url));
    }
  }

  // Redirect authenticated users away from login page
  if (pathname === '/login' && authToken) {
    return NextResponse.redirect(new URL(getHomeRoute(userType), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     * - api routes (handled by API)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|api/).*)',
  ],
};
