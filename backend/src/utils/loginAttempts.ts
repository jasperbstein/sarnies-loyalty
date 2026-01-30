import { query } from '../db/database';

export type AttemptType = 'staff' | 'customer' | 'admin';

/**
 * Log a failed login attempt for security monitoring
 */
export const logFailedAttempt = async (
  email: string,
  ipAddress: string,
  userAgent: string,
  attemptType: AttemptType = 'staff'
): Promise<void> => {
  try {
    await query(
      `INSERT INTO failed_login_attempts (email, ip_address, user_agent, attempt_type)
       VALUES ($1, $2, $3, $4)`,
      [email?.toLowerCase(), ipAddress, userAgent?.substring(0, 500), attemptType]
    );
  } catch (error) {
    console.error('Error logging failed login attempt:', error);
    // Don't throw - logging is best-effort
  }
};

/**
 * Get recent failed attempts for an email (for account lockout decisions)
 */
export const getRecentFailedAttempts = async (
  email: string,
  windowMinutes: number = 15
): Promise<number> => {
  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM failed_login_attempts
       WHERE email = $1 AND created_at > NOW() - INTERVAL '${windowMinutes} minutes'`,
      [email?.toLowerCase()]
    );
    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    console.error('Error getting failed attempts:', error);
    return 0;
  }
};

/**
 * Get recent failed attempts from an IP (for rate limiting decisions)
 */
export const getRecentFailedAttemptsFromIP = async (
  ipAddress: string,
  windowMinutes: number = 15
): Promise<number> => {
  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM failed_login_attempts
       WHERE ip_address = $1 AND created_at > NOW() - INTERVAL '${windowMinutes} minutes'`,
      [ipAddress]
    );
    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    console.error('Error getting failed attempts from IP:', error);
    return 0;
  }
};

/**
 * Check if account should be temporarily locked
 * Returns true if locked, false if allowed to attempt
 */
export const isAccountLocked = async (
  email: string,
  maxAttempts: number = 5,
  windowMinutes: number = 15
): Promise<boolean> => {
  const attempts = await getRecentFailedAttempts(email, windowMinutes);
  return attempts >= maxAttempts;
};

/**
 * Cleanup old failed attempts (keep 30 days for audit)
 */
export const cleanupOldAttempts = async (): Promise<number> => {
  try {
    const result = await query(
      `DELETE FROM failed_login_attempts WHERE created_at < NOW() - INTERVAL '30 days' RETURNING id`
    );
    return result.rowCount || 0;
  } catch (error) {
    console.error('Error cleaning up old attempts:', error);
    return 0;
  }
};
