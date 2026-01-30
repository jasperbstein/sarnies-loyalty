import { query } from '../db/database';

export type BlacklistReason = 'logout' | 'password_change' | 'admin_revoke' | 'security';

/**
 * Add a token to the blacklist
 */
export const blacklistToken = async (
  jti: string,
  expiresAt: Date,
  userId?: number,
  staffId?: number,
  reason: BlacklistReason = 'logout'
): Promise<void> => {
  try {
    await query(
      `INSERT INTO token_blacklist (jti, user_id, staff_id, reason, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (jti) DO NOTHING`,
      [jti, userId || null, staffId || null, reason, expiresAt]
    );
  } catch (error) {
    console.error('Error blacklisting token:', error);
    // Don't throw - blacklist is best-effort
  }
};

/**
 * Check if a token is blacklisted
 */
export const isTokenBlacklisted = async (jti: string): Promise<boolean> => {
  try {
    const result = await query(
      `SELECT 1 FROM token_blacklist WHERE jti = $1 AND expires_at > NOW()`,
      [jti]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking token blacklist:', error);
    // On error, allow the token (fail open for availability)
    return false;
  }
};

/**
 * Blacklist all tokens for a user (e.g., after password change)
 * This is approximate - we mark current time as the cutoff
 */
export const blacklistAllUserTokens = async (
  userId: number,
  reason: BlacklistReason = 'password_change'
): Promise<void> => {
  // We can't actually invalidate all tokens without tracking them
  // This is a placeholder for a more sophisticated implementation
  // that would use a "tokens_invalid_before" timestamp per user
  console.log(`Token invalidation requested for user ${userId}: ${reason}`);
};

/**
 * Cleanup expired entries from the blacklist
 */
export const cleanupBlacklist = async (): Promise<number> => {
  try {
    const result = await query(
      `DELETE FROM token_blacklist WHERE expires_at < NOW() RETURNING id`
    );
    return result.rowCount || 0;
  } catch (error) {
    console.error('Error cleaning up blacklist:', error);
    return 0;
  }
};
