import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db/database';
import { generateToken, REMEMBER_ME_DURATIONS, RememberMeDuration } from '../utils/jwt';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { handleAndLogError, getUserFriendlyMessage } from '../utils/errorMessages';

const router = Router();

// Constants
const PIN_LENGTH = 6;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const BCRYPT_ROUNDS = 10;

/**
 * Validate PIN format
 */
function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

/**
 * Check if user is locked out from PIN login
 */
async function isUserLockedOut(userId: number): Promise<boolean> {
  const result = await query(
    'SELECT pin_locked_until FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) return false;

  const lockedUntil = result.rows[0].pin_locked_until;
  if (!lockedUntil) return false;

  return new Date(lockedUntil) > new Date();
}

/**
 * Increment failed attempts and lock if necessary
 */
async function recordFailedAttempt(userId: number): Promise<{ attempts: number; locked: boolean }> {
  // Increment attempts
  const result = await query(
    `UPDATE users
     SET pin_attempts = COALESCE(pin_attempts, 0) + 1
     WHERE id = $1
     RETURNING pin_attempts`,
    [userId]
  );

  const attempts = result.rows[0]?.pin_attempts || 1;

  // Lock if exceeded max attempts
  if (attempts >= MAX_ATTEMPTS) {
    const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
    await query(
      'UPDATE users SET pin_locked_until = $1 WHERE id = $2',
      [lockUntil, userId]
    );
    return { attempts, locked: true };
  }

  return { attempts, locked: false };
}

/**
 * Reset failed attempts on successful login
 */
async function resetFailedAttempts(userId: number): Promise<void> {
  await query(
    'UPDATE users SET pin_attempts = 0, pin_locked_until = NULL WHERE id = $1',
    [userId]
  );
}

// =============================================================================
// PIN STATUS - Check if PIN is set up
// =============================================================================
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Please log in to access this feature.'
      });
    }

    const result = await query(
      'SELECT pin_enabled, pin_hash IS NOT NULL as has_pin FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'User not found.'
      });
    }

    const { pin_enabled, has_pin } = result.rows[0];

    res.json({
      pin_enabled: pin_enabled || false,
      has_pin: has_pin || false
    });
  } catch (error) {
    const message = handleAndLogError('PIN status', error, 'Unable to check PIN status.');
    res.status(500).json({ error: 'pin_status_failed', message });
  }
});

// =============================================================================
// PIN STATUS BY EMAIL - Check if user has PIN set up (for login page)
// =============================================================================
router.post('/check', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'missing_email',
        message: 'Please provide an email address.'
      });
    }

    const emailLower = email.toLowerCase().trim();

    const result = await query(
      'SELECT id, pin_enabled FROM users WHERE LOWER(email) = $1',
      [emailLower]
    );

    if (result.rows.length === 0) {
      // Don't reveal if user exists
      return res.json({ pin_available: false });
    }

    const { pin_enabled } = result.rows[0];

    res.json({
      pin_available: pin_enabled || false
    });
  } catch (error) {
    const message = handleAndLogError('PIN check', error, 'Unable to check PIN availability.');
    res.status(500).json({ error: 'pin_check_failed', message });
  }
});

// =============================================================================
// PIN SETUP - Set up a new PIN (requires auth)
// =============================================================================
router.post('/setup', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { pin } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Please log in to set up a PIN.'
      });
    }

    if (!pin || !isValidPin(pin)) {
      return res.status(400).json({
        error: 'invalid_pin',
        message: 'PIN must be exactly 6 digits.'
      });
    }

    // Check if user already has a PIN
    const existingResult = await query(
      'SELECT pin_enabled FROM users WHERE id = $1',
      [userId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'User not found.'
      });
    }

    if (existingResult.rows[0].pin_enabled) {
      return res.status(400).json({
        error: 'pin_already_set',
        message: 'PIN is already set up. Use change PIN to update it.'
      });
    }

    // Hash the PIN
    const pinHash = await bcrypt.hash(pin, BCRYPT_ROUNDS);

    // Save PIN
    await query(
      `UPDATE users
       SET pin_hash = $1, pin_enabled = true, pin_attempts = 0, pin_locked_until = NULL
       WHERE id = $2`,
      [pinHash, userId]
    );

    res.json({
      message: 'PIN set up successfully.',
      pin_enabled: true
    });
  } catch (error) {
    const message = handleAndLogError('PIN setup', error, 'Unable to set up PIN.');
    res.status(500).json({ error: 'pin_setup_failed', message });
  }
});

// =============================================================================
// PIN VERIFY - Login with PIN
// =============================================================================
router.post('/verify', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, pin, remember_me } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'missing_email',
        message: 'Please provide your email address.'
      });
    }

    if (!pin || !isValidPin(pin)) {
      return res.status(400).json({
        error: 'invalid_pin',
        message: 'PIN must be exactly 6 digits.'
      });
    }

    const emailLower = email.toLowerCase().trim();

    // Find user
    const result = await query(
      `SELECT id, name, surname, phone, email, birthday, gender, company,
              points_balance, user_type, customer_id, company_id, is_company_verified,
              created_at, registration_completed, pin_hash, pin_enabled
       FROM users
       WHERE LOWER(email) = $1`,
      [emailLower]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Invalid email or PIN.'
      });
    }

    const user = result.rows[0];

    // Check if PIN is enabled
    if (!user.pin_enabled || !user.pin_hash) {
      return res.status(401).json({
        error: 'pin_not_enabled',
        message: 'PIN login is not set up for this account.'
      });
    }

    // Check if locked out
    const lockedOut = await isUserLockedOut(user.id);
    if (lockedOut) {
      return res.status(429).json({
        error: 'account_locked',
        message: `Too many failed attempts. Please use magic link to log in, or wait ${LOCKOUT_MINUTES} minutes.`
      });
    }

    // Verify PIN
    const pinValid = await bcrypt.compare(pin, user.pin_hash);

    if (!pinValid) {
      const { attempts, locked } = await recordFailedAttempt(user.id);
      const remaining = MAX_ATTEMPTS - attempts;

      if (locked) {
        return res.status(429).json({
          error: 'account_locked',
          message: `Too many failed attempts. Please use magic link to log in, or wait ${LOCKOUT_MINUTES} minutes.`
        });
      }

      return res.status(401).json({
        error: 'invalid_pin',
        message: `Incorrect PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
        attempts_remaining: remaining
      });
    }

    // Reset failed attempts on success
    await resetFailedAttempts(user.id);

    // Determine token expiry
    const expiresIn = remember_me && REMEMBER_ME_DURATIONS[remember_me as RememberMeDuration]
      ? remember_me
      : undefined;

    // Generate JWT token (same as magic link login)
    const token = generateToken({
      id: user.id,
      email: user.email,
      type: user.user_type || 'customer'
    }, expiresIn);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        phone: user.phone,
        email: user.email,
        birthday: user.birthday,
        gender: user.gender,
        company: user.company,
        points_balance: user.points_balance,
        user_type: user.user_type,
        customer_id: user.customer_id,
        company_id: user.company_id,
        is_company_verified: user.is_company_verified,
        created_at: user.created_at,
        registration_completed: user.registration_completed || false,
        type: user.user_type || 'customer'
      },
      remember_me: expiresIn || '7d'
    });
  } catch (error) {
    const message = handleAndLogError('PIN verify', error, 'Unable to verify PIN.');
    res.status(500).json({ error: 'pin_verify_failed', message });
  }
});

// =============================================================================
// PIN CHANGE - Change existing PIN (requires auth + current PIN)
// =============================================================================
router.post('/change', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { current_pin, new_pin } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Please log in to change your PIN.'
      });
    }

    if (!current_pin || !isValidPin(current_pin)) {
      return res.status(400).json({
        error: 'invalid_current_pin',
        message: 'Current PIN must be exactly 6 digits.'
      });
    }

    if (!new_pin || !isValidPin(new_pin)) {
      return res.status(400).json({
        error: 'invalid_new_pin',
        message: 'New PIN must be exactly 6 digits.'
      });
    }

    if (current_pin === new_pin) {
      return res.status(400).json({
        error: 'same_pin',
        message: 'New PIN must be different from current PIN.'
      });
    }

    // Get current PIN hash
    const result = await query(
      'SELECT pin_hash, pin_enabled FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'User not found.'
      });
    }

    const { pin_hash, pin_enabled } = result.rows[0];

    if (!pin_enabled || !pin_hash) {
      return res.status(400).json({
        error: 'pin_not_set',
        message: 'PIN is not set up. Use setup PIN first.'
      });
    }

    // Verify current PIN
    const currentValid = await bcrypt.compare(current_pin, pin_hash);
    if (!currentValid) {
      return res.status(401).json({
        error: 'invalid_current_pin',
        message: 'Current PIN is incorrect.'
      });
    }

    // Hash and save new PIN
    const newPinHash = await bcrypt.hash(new_pin, BCRYPT_ROUNDS);
    await query(
      'UPDATE users SET pin_hash = $1, pin_attempts = 0, pin_locked_until = NULL WHERE id = $2',
      [newPinHash, userId]
    );

    res.json({
      message: 'PIN changed successfully.'
    });
  } catch (error) {
    const message = handleAndLogError('PIN change', error, 'Unable to change PIN.');
    res.status(500).json({ error: 'pin_change_failed', message });
  }
});

// =============================================================================
// PIN DISABLE - Disable PIN login (requires auth)
// =============================================================================
router.post('/disable', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Please log in to disable PIN.'
      });
    }

    // Disable PIN but keep the hash (in case user wants to re-enable)
    await query(
      'UPDATE users SET pin_enabled = false, pin_attempts = 0, pin_locked_until = NULL WHERE id = $1',
      [userId]
    );

    res.json({
      message: 'PIN disabled successfully.',
      pin_enabled: false
    });
  } catch (error) {
    const message = handleAndLogError('PIN disable', error, 'Unable to disable PIN.');
    res.status(500).json({ error: 'pin_disable_failed', message });
  }
});

export default router;
