import { describe, it, expect } from 'vitest';
import {
  isValidAppUser,
  isStaffUser,
  isAdminUser,
  getHomeRoute,
  isPublicRoute,
  PUBLIC_ROUTES,
  APP_USER_TYPES,
  STAFF_USER_TYPES,
  ADMIN_USER_TYPES,
} from './middlewareAuth';

describe('middlewareAuth', () => {
  describe('isValidAppUser', () => {
    it('returns true for customer', () => {
      expect(isValidAppUser('customer')).toBe(true);
    });

    it('returns true for employee', () => {
      expect(isValidAppUser('employee')).toBe(true);
    });

    it('returns true for staff', () => {
      expect(isValidAppUser('staff')).toBe(true);
    });

    it('returns false for admin (admin uses admin routes)', () => {
      expect(isValidAppUser('admin')).toBe(false);
    });

    it('returns false for investor', () => {
      expect(isValidAppUser('investor')).toBe(false);
    });

    it('returns false for media', () => {
      expect(isValidAppUser('media')).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isValidAppUser(undefined)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidAppUser('')).toBe(false);
    });

    it('returns false for unknown type', () => {
      expect(isValidAppUser('unknown')).toBe(false);
    });
  });

  describe('isStaffUser', () => {
    it('returns true for staff', () => {
      expect(isStaffUser('staff')).toBe(true);
    });

    it('returns true for employee', () => {
      expect(isStaffUser('employee')).toBe(true);
    });

    it('returns true for admin', () => {
      expect(isStaffUser('admin')).toBe(true);
    });

    it('returns false for customer', () => {
      expect(isStaffUser('customer')).toBe(false);
    });

    it('returns false for investor', () => {
      expect(isStaffUser('investor')).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isStaffUser(undefined)).toBe(false);
    });
  });

  describe('isAdminUser', () => {
    it('returns true for admin', () => {
      expect(isAdminUser('admin')).toBe(true);
    });

    it('returns false for staff', () => {
      expect(isAdminUser('staff')).toBe(false);
    });

    it('returns false for employee', () => {
      expect(isAdminUser('employee')).toBe(false);
    });

    it('returns false for customer', () => {
      expect(isAdminUser('customer')).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isAdminUser(undefined)).toBe(false);
    });
  });

  describe('getHomeRoute', () => {
    it('returns /admin/dashboard for admin', () => {
      expect(getHomeRoute('admin')).toBe('/admin/dashboard');
    });

    it('returns /staff/scan for staff', () => {
      expect(getHomeRoute('staff')).toBe('/staff/scan');
    });

    it('returns /app/home for employee', () => {
      expect(getHomeRoute('employee')).toBe('/app/home');
    });

    it('returns /app/home for customer', () => {
      expect(getHomeRoute('customer')).toBe('/app/home');
    });

    it('returns /app/home for undefined (fallback)', () => {
      expect(getHomeRoute(undefined)).toBe('/app/home');
    });

    it('returns /app/home for unknown type (fallback)', () => {
      expect(getHomeRoute('investor')).toBe('/app/home');
    });
  });

  describe('isPublicRoute', () => {
    it('returns true for /login', () => {
      expect(isPublicRoute('/login')).toBe(true);
    });

    it('returns true for /login with query params', () => {
      expect(isPublicRoute('/login?redirect=/app/home')).toBe(true);
    });

    it('returns true for /splash', () => {
      expect(isPublicRoute('/splash')).toBe(true);
    });

    it('returns true for /staff/register', () => {
      expect(isPublicRoute('/staff/register')).toBe(true);
    });

    it('returns true for /staff/forgot-password', () => {
      expect(isPublicRoute('/staff/forgot-password')).toBe(true);
    });

    it('returns true for /staff/reset-password', () => {
      expect(isPublicRoute('/staff/reset-password')).toBe(true);
    });

    it('returns true for /auth/verify', () => {
      expect(isPublicRoute('/auth/verify')).toBe(true);
    });

    it('returns true for /auth/verify-staff', () => {
      expect(isPublicRoute('/auth/verify-staff')).toBe(true);
    });

    it('returns true for /register', () => {
      expect(isPublicRoute('/register')).toBe(true);
    });

    it('returns false for /app/home', () => {
      expect(isPublicRoute('/app/home')).toBe(false);
    });

    it('returns false for /staff/scan', () => {
      expect(isPublicRoute('/staff/scan')).toBe(false);
    });

    it('returns false for /admin/dashboard', () => {
      expect(isPublicRoute('/admin/dashboard')).toBe(false);
    });

    it('returns false for root path', () => {
      expect(isPublicRoute('/')).toBe(false);
    });
  });

  describe('user type arrays', () => {
    it('APP_USER_TYPES contains customer, employee, staff', () => {
      expect(APP_USER_TYPES).toContain('customer');
      expect(APP_USER_TYPES).toContain('employee');
      expect(APP_USER_TYPES).toContain('staff');
      expect(APP_USER_TYPES).not.toContain('admin');
    });

    it('STAFF_USER_TYPES contains staff, employee, admin', () => {
      expect(STAFF_USER_TYPES).toContain('staff');
      expect(STAFF_USER_TYPES).toContain('employee');
      expect(STAFF_USER_TYPES).toContain('admin');
      expect(STAFF_USER_TYPES).not.toContain('customer');
    });

    it('ADMIN_USER_TYPES contains only admin', () => {
      expect(ADMIN_USER_TYPES).toEqual(['admin']);
    });
  });

  describe('PUBLIC_ROUTES', () => {
    it('includes all expected public routes', () => {
      expect(PUBLIC_ROUTES).toContain('/login');
      expect(PUBLIC_ROUTES).toContain('/logout');
      expect(PUBLIC_ROUTES).toContain('/reset');
      expect(PUBLIC_ROUTES).toContain('/splash');
      expect(PUBLIC_ROUTES).toContain('/join');
      expect(PUBLIC_ROUTES).toContain('/auth/verify');
      expect(PUBLIC_ROUTES).toContain('/auth/verify-staff');
      expect(PUBLIC_ROUTES).toContain('/staff/register');
      expect(PUBLIC_ROUTES).toContain('/staff/forgot-password');
      expect(PUBLIC_ROUTES).toContain('/staff/reset-password');
      expect(PUBLIC_ROUTES).toContain('/register');
    });

    it('does not include protected routes', () => {
      expect(PUBLIC_ROUTES).not.toContain('/app');
      expect(PUBLIC_ROUTES).not.toContain('/staff');
      expect(PUBLIC_ROUTES).not.toContain('/admin');
    });
  });

  // Cross-check with authUtils behavior
  describe('consistency with authUtils', () => {
    it('employee can access both app and staff routes', () => {
      expect(isValidAppUser('employee')).toBe(true);
      expect(isStaffUser('employee')).toBe(true);
      expect(isAdminUser('employee')).toBe(false);
    });

    it('staff can access both app and staff routes', () => {
      expect(isValidAppUser('staff')).toBe(true);
      expect(isStaffUser('staff')).toBe(true);
      expect(isAdminUser('staff')).toBe(false);
    });

    it('customer can only access app routes', () => {
      expect(isValidAppUser('customer')).toBe(true);
      expect(isStaffUser('customer')).toBe(false);
      expect(isAdminUser('customer')).toBe(false);
    });

    it('admin can access staff and admin routes but not app routes directly', () => {
      expect(isValidAppUser('admin')).toBe(false);
      expect(isStaffUser('admin')).toBe(true);
      expect(isAdminUser('admin')).toBe(true);
    });
  });
});
