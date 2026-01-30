/**
 * Middleware Auth Utilities
 * Server-side auth helpers for Next.js middleware
 * These mirror the logic from lib/authUtils.ts but can be used in Edge runtime
 */

export type UserType = 'customer' | 'employee' | 'staff' | 'admin' | 'investor' | 'media';

// Valid user types that can access the main app (/app/*)
export const APP_USER_TYPES: UserType[] = ['customer', 'employee', 'staff'];

// User types that can access staff routes (/staff/*)
export const STAFF_USER_TYPES: UserType[] = ['staff', 'employee', 'admin'];

// User types that can access admin routes (/admin/*)
export const ADMIN_USER_TYPES: UserType[] = ['admin'];

/**
 * Check if user type can access app routes (/app/*)
 */
export function isValidAppUser(userType: string | undefined): boolean {
  if (!userType) return false;
  return APP_USER_TYPES.includes(userType as UserType);
}

/**
 * Check if user type can access staff routes (/staff/*)
 */
export function isStaffUser(userType: string | undefined): boolean {
  if (!userType) return false;
  return STAFF_USER_TYPES.includes(userType as UserType);
}

/**
 * Check if user type can access admin routes (/admin/*)
 */
export function isAdminUser(userType: string | undefined): boolean {
  if (!userType) return false;
  return ADMIN_USER_TYPES.includes(userType as UserType);
}

/**
 * Get the appropriate home route for a user type
 */
export function getHomeRoute(userType: string | undefined): string {
  if (isAdminUser(userType)) return '/admin/dashboard';
  if (userType === 'staff') return '/staff/scan';
  // Employees and customers go to app
  return '/app/home';
}

/**
 * Public routes that don't require authentication
 */
export const PUBLIC_ROUTES = [
  '/login',
  '/logout',
  '/reset',
  '/splash',
  '/join',
  '/auth/verify',
  '/auth/verify-staff',
  '/staff/register',
  '/staff/forgot-password',
  '/staff/reset-password',
  '/register',
];

/**
 * Check if a path is a public route
 */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}
