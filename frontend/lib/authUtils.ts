/**
 * Shared Auth Utilities
 * Single source of truth for auth type checking across the app
 */

export type UserType = 'customer' | 'employee' | 'staff' | 'investor' | 'media';

export interface AuthUser {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
  type?: string;
  user_type?: UserType;
}

/**
 * Get the normalized user type from a user object.
 * Handles both `user_type` and legacy `type` fields.
 */
export function getUserType(user: AuthUser | null | undefined): UserType {
  if (!user) return 'customer';
  return (user.user_type || user.type || 'customer') as UserType;
}

/**
 * Check if user is valid for the main app (customer-facing routes).
 * Valid types: customer, employee, staff
 */
export function isValidAppUser(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  const type = getUserType(user);
  return ['customer', 'employee', 'staff'].includes(type);
}

/**
 * Check if user is a staff member (can access staff routes).
 * Staff includes: staff, employee users, or anyone with admin role.
 */
export function isStaffUser(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  const type = getUserType(user);
  return type === 'staff' || type === 'employee' || user.role === 'admin';
}

/**
 * Check if user is an admin (can access admin routes).
 */
export function isAdminUser(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'admin';
}

/**
 * Check if user is an employee (for employee-specific features).
 */
export function isEmployeeUser(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  const type = getUserType(user);
  return type === 'employee';
}

/**
 * Get the appropriate login redirect path based on user type.
 */
export function getLoginRedirectPath(user: AuthUser | null | undefined): string {
  if (!user) return '/login';

  if (isAdminUser(user)) {
    return '/admin/dashboard';
  }

  if (isStaffUser(user) && !isEmployeeUser(user)) {
    return '/staff';
  }

  // Employees and customers go to the app
  return '/app/home';
}
