import { describe, it, expect } from 'vitest';
import {
  getUserType,
  isValidAppUser,
  isStaffUser,
  isAdminUser,
  isEmployeeUser,
  getLoginRedirectPath,
  type AuthUser,
} from './authUtils';

describe('authUtils', () => {
  describe('getUserType', () => {
    it('returns user_type when present', () => {
      const user: AuthUser = { user_type: 'employee' };
      expect(getUserType(user)).toBe('employee');
    });

    it('falls back to type field when user_type is missing', () => {
      const user: AuthUser = { type: 'staff' };
      expect(getUserType(user)).toBe('staff');
    });

    it('prefers user_type over type when both present', () => {
      const user: AuthUser = { user_type: 'employee', type: 'customer' };
      expect(getUserType(user)).toBe('employee');
    });

    it('defaults to customer when no type fields present', () => {
      const user: AuthUser = { name: 'John' };
      expect(getUserType(user)).toBe('customer');
    });

    it('returns customer for null user', () => {
      expect(getUserType(null)).toBe('customer');
    });

    it('returns customer for undefined user', () => {
      expect(getUserType(undefined)).toBe('customer');
    });
  });

  describe('isValidAppUser', () => {
    it('returns true for customer', () => {
      expect(isValidAppUser({ user_type: 'customer' })).toBe(true);
    });

    it('returns true for employee', () => {
      expect(isValidAppUser({ user_type: 'employee' })).toBe(true);
    });

    it('returns true for staff', () => {
      expect(isValidAppUser({ user_type: 'staff' })).toBe(true);
    });

    it('returns false for investor', () => {
      expect(isValidAppUser({ user_type: 'investor' })).toBe(false);
    });

    it('returns false for media', () => {
      expect(isValidAppUser({ user_type: 'media' })).toBe(false);
    });

    it('returns false for null user', () => {
      expect(isValidAppUser(null)).toBe(false);
    });

    it('returns false for undefined user', () => {
      expect(isValidAppUser(undefined)).toBe(false);
    });

    it('handles legacy type field', () => {
      expect(isValidAppUser({ type: 'customer' })).toBe(true);
      expect(isValidAppUser({ type: 'staff' })).toBe(true);
    });
  });

  describe('isStaffUser', () => {
    it('returns true for staff user_type', () => {
      expect(isStaffUser({ user_type: 'staff' })).toBe(true);
    });

    it('returns true for employee user_type', () => {
      expect(isStaffUser({ user_type: 'employee' })).toBe(true);
    });

    it('returns true for admin role', () => {
      expect(isStaffUser({ user_type: 'customer', role: 'admin' })).toBe(true);
    });

    it('returns false for customer without admin role', () => {
      expect(isStaffUser({ user_type: 'customer' })).toBe(false);
    });

    it('returns false for investor', () => {
      expect(isStaffUser({ user_type: 'investor' })).toBe(false);
    });

    it('returns false for null user', () => {
      expect(isStaffUser(null)).toBe(false);
    });

    it('handles legacy type field', () => {
      expect(isStaffUser({ type: 'staff' })).toBe(true);
      expect(isStaffUser({ type: 'employee' })).toBe(true);
    });
  });

  describe('isAdminUser', () => {
    it('returns true when role is admin', () => {
      expect(isAdminUser({ role: 'admin' })).toBe(true);
    });

    it('returns true for admin with any user_type', () => {
      expect(isAdminUser({ user_type: 'staff', role: 'admin' })).toBe(true);
      expect(isAdminUser({ user_type: 'customer', role: 'admin' })).toBe(true);
    });

    it('returns false when role is not admin', () => {
      expect(isAdminUser({ role: 'staff' })).toBe(false);
      expect(isAdminUser({ role: 'user' })).toBe(false);
    });

    it('returns false when no role', () => {
      expect(isAdminUser({ user_type: 'staff' })).toBe(false);
    });

    it('returns false for null user', () => {
      expect(isAdminUser(null)).toBe(false);
    });

    it('returns false for undefined user', () => {
      expect(isAdminUser(undefined)).toBe(false);
    });
  });

  describe('isEmployeeUser', () => {
    it('returns true for employee user_type', () => {
      expect(isEmployeeUser({ user_type: 'employee' })).toBe(true);
    });

    it('returns false for staff user_type', () => {
      expect(isEmployeeUser({ user_type: 'staff' })).toBe(false);
    });

    it('returns false for customer', () => {
      expect(isEmployeeUser({ user_type: 'customer' })).toBe(false);
    });

    it('returns false for null user', () => {
      expect(isEmployeeUser(null)).toBe(false);
    });

    it('handles legacy type field', () => {
      expect(isEmployeeUser({ type: 'employee' })).toBe(true);
      expect(isEmployeeUser({ type: 'staff' })).toBe(false);
    });
  });

  describe('getLoginRedirectPath', () => {
    it('returns /login for null user', () => {
      expect(getLoginRedirectPath(null)).toBe('/login');
    });

    it('returns /login for undefined user', () => {
      expect(getLoginRedirectPath(undefined)).toBe('/login');
    });

    it('returns /admin/dashboard for admin', () => {
      expect(getLoginRedirectPath({ role: 'admin' })).toBe('/admin/dashboard');
    });

    it('returns /staff for staff user', () => {
      expect(getLoginRedirectPath({ user_type: 'staff' })).toBe('/staff');
    });

    it('returns /app/home for employee', () => {
      expect(getLoginRedirectPath({ user_type: 'employee' })).toBe('/app/home');
    });

    it('returns /app/home for customer', () => {
      expect(getLoginRedirectPath({ user_type: 'customer' })).toBe('/app/home');
    });

    it('admin takes priority over staff type', () => {
      expect(getLoginRedirectPath({ user_type: 'staff', role: 'admin' })).toBe('/admin/dashboard');
    });

    it('returns /app/home for user with no type (defaults to customer)', () => {
      expect(getLoginRedirectPath({ name: 'John' })).toBe('/app/home');
    });
  });

  // Edge cases and real-world scenarios
  describe('real-world scenarios', () => {
    it('handles API response with both type and user_type', () => {
      // Backend might return both fields during transition
      const apiUser: AuthUser = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        type: 'customer',
        user_type: 'employee', // normalized value should win
        role: undefined,
      };

      expect(getUserType(apiUser)).toBe('employee');
      expect(isEmployeeUser(apiUser)).toBe(true);
      expect(isStaffUser(apiUser)).toBe(true); // employees can access staff routes
      expect(getLoginRedirectPath(apiUser)).toBe('/app/home');
    });

    it('handles admin staff member correctly', () => {
      const adminStaff: AuthUser = {
        id: 1,
        name: 'Admin User',
        user_type: 'staff',
        role: 'admin',
      };

      expect(isAdminUser(adminStaff)).toBe(true);
      expect(isStaffUser(adminStaff)).toBe(true);
      expect(getLoginRedirectPath(adminStaff)).toBe('/admin/dashboard');
    });

    it('handles regular customer correctly', () => {
      const customer: AuthUser = {
        id: 123,
        name: 'Jane Customer',
        user_type: 'customer',
      };

      expect(isValidAppUser(customer)).toBe(true);
      expect(isStaffUser(customer)).toBe(false);
      expect(isAdminUser(customer)).toBe(false);
      expect(isEmployeeUser(customer)).toBe(false);
      expect(getLoginRedirectPath(customer)).toBe('/app/home');
    });

    it('handles empty object', () => {
      const emptyUser: AuthUser = {};

      expect(getUserType(emptyUser)).toBe('customer');
      expect(isValidAppUser(emptyUser)).toBe(true); // defaults to customer which is valid
      expect(isStaffUser(emptyUser)).toBe(false);
      expect(isAdminUser(emptyUser)).toBe(false);
    });
  });
});
