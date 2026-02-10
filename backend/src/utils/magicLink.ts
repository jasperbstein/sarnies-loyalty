import crypto from 'crypto';
import { query } from '../db/database';

const MAGIC_LINK_EXPIRY_MINUTES = 30;

// Generate a cryptographically secure magic link token
export const generateMagicToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate a session ID for WebSocket-based login notification
export const generateSessionId = (): string => {
  return crypto.randomBytes(16).toString('hex');
};

// Save magic link token to database with optional session_id for WebSocket notification
export const saveMagicToken = async (email: string, token: string, sessionId?: string): Promise<void> => {
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);

  await query(
    `INSERT INTO magic_link_tokens (email, token, expires_at, session_id)
     VALUES ($1, $2, $3, $4)`,
    [email.toLowerCase(), token, expiresAt, sessionId || null]
  );
};

// Get session_id for a token (used when verifying to notify waiting client)
export const getSessionIdForToken = async (token: string): Promise<string | null> => {
  const result = await query(
    `SELECT session_id FROM magic_link_tokens WHERE token = $1`,
    [token]
  );
  return result.rows.length > 0 ? result.rows[0].session_id : null;
};

// Verify magic link token - returns email if valid, null if invalid/expired/used
export const verifyMagicToken = async (token: string): Promise<string | null> => {
  // Find valid, non-expired token (allow recently used tokens for idempotency)
  const result = await query(
    `SELECT id, email, used_at FROM magic_link_tokens
     WHERE token = $1
       AND expires_at > NOW()`,
    [token]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const { id, email, used_at } = result.rows[0];

  // If already used within last 5 seconds, still return valid (handles double-calls from React StrictMode)
  // Reduced from 60s to 5s to minimize token reuse attack window
  if (used_at) {
    const usedTime = new Date(used_at).getTime();
    const now = Date.now();
    if (now - usedTime < 5000) {
      // Token was used within last 5 seconds - allow it (idempotent)
      return email;
    }
    // Token was used more than 5 seconds ago - reject
    return null;
  }

  // Mark token as used
  await query(
    `UPDATE magic_link_tokens SET used_at = NOW() WHERE id = $1`,
    [id]
  );

  return email;
};

// Check rate limit - returns { allowed: boolean, retryAfterSeconds?: number }
export const checkMagicLinkRateLimit = async (email: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }> => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const result = await query(
    `SELECT created_at FROM magic_link_tokens
     WHERE email = $1 AND created_at > $2
     ORDER BY created_at ASC
     LIMIT 10`,
    [email.toLowerCase(), oneHourAgo]
  );

  const count = result.rows.length;

  // Allow up to 10 magic link requests per hour per email
  if (count < 10) {
    return { allowed: true };
  }

  // Calculate when the oldest token expires (1 hour from its creation)
  const oldestTokenTime = new Date(result.rows[0].created_at).getTime();
  const retryAfterMs = (oldestTokenTime + 60 * 60 * 1000) - Date.now();
  const retryAfterSeconds = Math.max(0, Math.ceil(retryAfterMs / 1000));

  return { allowed: false, retryAfterSeconds };
};

// Cleanup expired tokens (can be called periodically)
export const cleanupExpiredTokens = async (): Promise<void> => {
  await query(
    `DELETE FROM magic_link_tokens WHERE expires_at < NOW() - INTERVAL '1 day'`
  );
};
