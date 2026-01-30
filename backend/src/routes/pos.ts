import { Router, Request, Response, NextFunction } from 'express';
import { query, transaction } from '../db/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { verifyQRToken } from '../utils/jwt';
import { getSocket } from '../socket';
import crypto from 'crypto';
import { getUserFriendlyMessage, handleAndLogError } from '../utils/errorMessages';

const router = Router();

// Points calculation for external POS: 1 point per 100 THB
const POINTS_PER_100_THB = 1;

interface POSExternalRequest extends Request {
  apiKey?: {
    id: number;
    outlet_id: number | null;
    name: string;
  };
}

/**
 * POST /api/pos/scan-qr
 * Handle TWO types of QR codes:
 * 1. Static QR (loyalty_id) - Award points for purchase
 * 2. Dynamic QR (voucher_redemption) - Use voucher
 */
router.post('/scan-qr', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { qr_token, amount, outlet, staff_id } = req.body;

    if (!qr_token || !outlet || !staff_id) {
      return res.status(400).json({
        error: 'missing_fields',
        message: 'Please scan a valid QR code and ensure outlet information is provided.'
      });
    }

    // Verify and decode QR token
    let payload;
    try {
      payload = verifyQRToken(qr_token);
    } catch (error) {
      return res.status(400).json({
        error: 'qr_invalid',
        message: getUserFriendlyMessage('qr_invalid')
      });
    }

    const { type } = payload;

    // Route to appropriate handler based on QR type
    if (type === 'loyalty_id') {
      return await handleLoyaltyIdScan(payload, amount, outlet, staff_id, res);
    } else if (type === 'voucher_redemption') {
      return await handleVoucherRedemption(payload, outlet, staff_id, res);
    } else {
      return res.status(400).json({
        error: 'qr_invalid',
        message: 'This QR code type is not recognized. Please try a different code.'
      });
    }
  } catch (error) {
    const message = handleAndLogError('Scan QR', error, 'Unable to process QR code. Please try again.');
    res.status(500).json({
      error: 'qr_processing_failed',
      message: message
    });
  }
});

/**
 * Handle static loyalty ID QR scan - award points for purchase
 * Uses database transaction with SELECT FOR UPDATE to prevent race conditions
 */
async function handleLoyaltyIdScan(
  payload: any,
  amount: number | undefined,
  outlet: string,
  staff_id: number,
  res: Response
) {
  if (!amount || amount <= 0) {
    return res.status(400).json({
      error: 'invalid_amount',
      message: 'Please enter the purchase amount to award loyalty points.'
    });
  }

  const customerId = parseInt(payload.customer_id);

  try {
    // Use database transaction with row-level locking to prevent race conditions
    const result = await transaction(async (client) => {
      // Get customer details WITH ROW LOCK to prevent concurrent point awards
      const userResult = await client.query(
        'SELECT * FROM users WHERE id = $1 FOR UPDATE',
        [customerId]
      );
      if (userResult.rows.length === 0) {
        throw { status: 404, error: 'customer_not_found', message: getUserFriendlyMessage('customer_not_found') };
      }

      const user = userResult.rows[0];

      // Calculate points (1 point per 100 THB)
      const pointsAwarded = Math.floor(amount / 100) * POINTS_PER_100_THB;
      const newBalance = user.points_balance + pointsAwarded;

      // Update user points and total spend (within same transaction)
      await client.query(
        `UPDATE users
         SET points_balance = $1,
             total_spend = total_spend + $2,
             total_purchases_count = total_purchases_count + 1
         WHERE id = $3`,
        [newBalance, amount, customerId]
      );

      // Create transaction record (within same transaction)
      await client.query(
        `INSERT INTO transactions
         (user_id, type, points_delta, amount_value, outlet, staff_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [customerId, 'earn', pointsAwarded, amount, outlet, staff_id]
      );

      return { user, pointsAwarded, newBalance };
    });

    return res.json({
      type: 'points_awarded',
      customer: {
        id: result.user.id,
        name: result.user.name,
        surname: result.user.surname,
        phone: result.user.phone
      },
      points_awarded: result.pointsAwarded,
      new_balance: result.newBalance,
      amount_spent: amount
    });
  } catch (error: any) {
    // Handle known errors from transaction
    if (error.status && error.error) {
      return res.status(error.status).json({
        error: error.error,
        message: error.message || getUserFriendlyMessage(error.error)
      });
    }
    // Unknown error
    const message = handleAndLogError('Loyalty scan', error, 'Unable to award points. Please try again.');
    return res.status(500).json({
      error: 'points_award_failed',
      message: message
    });
  }
}

/**
 * Handle voucher redemption QR scan - use voucher
 * Uses database transaction with SELECT FOR UPDATE to prevent double-spend race condition
 */
async function handleVoucherRedemption(
  payload: any,
  outlet: string,
  staff_id: number,
  res: Response
) {
  const { customer_id, voucher_id, voucher_instance_id, expires_at } = payload;

  // Check if QR has expired (from JWT payload)
  if (new Date(expires_at) < new Date()) {
    return res.status(400).json({
      error: 'qr_expired',
      message: getUserFriendlyMessage('qr_expired')
    });
  }

  try {
    // Use database transaction with row-level locking to prevent double-spend
    const result = await transaction(async (client) => {
      // Get voucher instance WITH ROW LOCK to prevent concurrent redemptions
      const instanceResult = await client.query(
        'SELECT * FROM voucher_instances WHERE uuid = $1 FOR UPDATE',
        [voucher_instance_id]
      );

      if (instanceResult.rows.length === 0) {
        throw { status: 404, error: 'voucher_not_found', message: getUserFriendlyMessage('voucher_not_found') };
      }

      const instance = instanceResult.rows[0];

      // Check if already used (after acquiring lock)
      if (instance.status === 'used') {
        throw { status: 400, error: 'voucher_already_used', message: getUserFriendlyMessage('voucher_already_used') };
      }

      // Check if expired
      if (instance.status === 'expired') {
        throw { status: 400, error: 'voucher_expired', message: getUserFriendlyMessage('voucher_expired') };
      }

      // Also verify against database expiry_date (not just JWT)
      if (instance.expires_at && new Date(instance.expires_at) < new Date()) {
        throw { status: 400, error: 'voucher_expired', message: getUserFriendlyMessage('voucher_expired') };
      }

      // Get customer details
      const userResult = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [instance.user_id]
      );

      if (userResult.rows.length === 0) {
        throw { status: 404, error: 'customer_not_found', message: getUserFriendlyMessage('customer_not_found') };
      }

      const user = userResult.rows[0];

      // Get voucher details
      const voucherResult = await client.query(
        'SELECT * FROM vouchers WHERE id = $1',
        [voucher_id]
      );

      if (voucherResult.rows.length === 0) {
        throw { status: 404, error: 'voucher_not_found', message: getUserFriendlyMessage('voucher_not_found') };
      }

      const voucher = voucherResult.rows[0];

      // Mark voucher instance as used (within same transaction)
      await client.query(
        `UPDATE voucher_instances
         SET status = 'used', used_at = NOW(), used_by_staff_id = $1, used_at_outlet = $2
         WHERE id = $3`,
        [staff_id, outlet, instance.id]
      );

      // Create transaction record (within same transaction)
      await client.query(
        `INSERT INTO transactions
         (user_id, type, points_delta, amount_value, voucher_id, outlet, staff_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          user.id,
          'use',
          0,
          voucher.cash_value,
          voucher_id,
          outlet,
          staff_id
        ]
      );

      return { user, voucher };
    });

    // Emit WebSocket event AFTER transaction commits successfully
    try {
      const io = getSocket();
      io.to(`user:${result.user.id}`).emit('voucher_redeemed', {
        voucher_id: result.voucher.id,
        voucher_title: result.voucher.title,
        voucher_type: result.voucher.voucher_type,
        cash_value: result.voucher.cash_value,
        used_at: new Date().toISOString(),
        outlet: outlet
      });
      console.log(`📡 Emitted voucher_redeemed event to user:${result.user.id}`);
    } catch (socketError) {
      console.error('WebSocket emit error:', socketError);
      // Continue even if WebSocket fails - redemption already committed
    }

    return res.json({
      type: 'voucher_used',
      customer: {
        id: result.user.id,
        name: result.user.name,
        surname: result.user.surname,
        phone: result.user.phone
      },
      voucher: {
        id: result.voucher.id,
        title: result.voucher.title,
        description: result.voucher.description,
        voucher_type: result.voucher.voucher_type
      },
      value: result.voucher.cash_value
    });
  } catch (error: any) {
    // Handle known errors from transaction
    if (error.status && error.error) {
      return res.status(error.status).json({
        error: error.error,
        message: error.message || getUserFriendlyMessage(error.error)
      });
    }
    // Unknown error
    const message = handleAndLogError('Voucher redemption', error, 'Unable to redeem voucher. Please try again.');
    return res.status(500).json({
      error: 'voucher_redemption_failed',
      message: message
    });
  }
}

// =============================================================================
// EXTERNAL POS INTEGRATION API
// =============================================================================
// These endpoints allow external POS systems to submit transactions
// via API key authentication (X-API-Key header)

/**
 * Middleware: Validate External POS API Key
 */
async function validateExternalApiKey(req: POSExternalRequest, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'missing_api_key',
      message: 'X-API-Key header is required'
    });
  }

  try {
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const result = await query(
      `SELECT id, outlet_id, name, is_active
       FROM pos_api_keys
       WHERE api_key_hash = $1`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'invalid_api_key',
        message: 'Invalid API key'
      });
    }

    const key = result.rows[0];

    if (!key.is_active) {
      return res.status(401).json({
        success: false,
        error: 'api_key_revoked',
        message: 'API key has been revoked'
      });
    }

    await query(
      'UPDATE pos_api_keys SET last_used_at = NOW(), total_transactions = total_transactions + 1 WHERE id = $1',
      [key.id]
    );

    req.apiKey = {
      id: key.id,
      outlet_id: key.outlet_id,
      name: key.name
    };

    next();
  } catch (error) {
    const message = handleAndLogError('API key validation', error, 'Unable to validate API key. Please try again.');
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: message
    });
  }
}

/**
 * Helper: Normalize phone number for lookup
 */
function normalizePhoneForLookup(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '66' + cleaned.slice(1);
  }
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

/**
 * Helper: Find customer by phone or member ID
 */
async function findCustomerByIdentifier(identifier: string) {
  // Try phone number first
  if (identifier.startsWith('+') || /^\d+$/.test(identifier)) {
    const normalizedPhone = normalizePhoneForLookup(identifier);
    const result = await query(
      'SELECT id, name, phone, points_balance, tier_level, customer_id, birthday FROM users WHERE phone = $1',
      [normalizedPhone]
    );
    if (result.rows.length > 0) {
      return result.rows[0];
    }
  }

  // Try member ID (MEM-XXXXX format or customer_id)
  const memberIdMatch = identifier.match(/^(?:MEM-)?(\w+)$/i);
  if (memberIdMatch) {
    const result = await query(
      'SELECT id, name, phone, points_balance, tier_level, customer_id, birthday FROM users WHERE customer_id = $1',
      [memberIdMatch[1]]
    );
    if (result.rows.length > 0) {
      return result.rows[0];
    }
  }

  return null;
}

/**
 * POST /api/pos/transaction
 * Submit a transaction from external POS system
 * Uses database transaction with SELECT FOR UPDATE to prevent race conditions
 */
router.post('/transaction', validateExternalApiKey, async (req: POSExternalRequest, res: Response) => {
  const {
    customer_identifier,
    transaction_id,
    transaction_time,
    amount,
    receipt_number,
    line_items
  } = req.body;

  // Validate required fields (before transaction)
  if (!customer_identifier) {
    return res.status(400).json({
      success: false,
      error: 'missing_customer_identifier',
      message: 'customer_identifier is required'
    });
  }

  if (!transaction_id) {
    return res.status(400).json({
      success: false,
      error: 'missing_transaction_id',
      message: 'transaction_id is required for idempotency'
    });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'invalid_amount',
      message: 'amount must be a positive number'
    });
  }

  try {
    // Use database transaction with row-level locking to prevent race conditions
    const result = await transaction(async (client) => {
      // Check for duplicate (idempotency) WITH ROW LOCK
      // Using FOR UPDATE to prevent concurrent duplicate checks
      const duplicateCheck = await client.query(
        `SELECT id, points_earned, status FROM pos_transactions_log
         WHERE api_key_id = $1 AND external_transaction_id = $2
         FOR UPDATE`,
        [req.apiKey!.id, transaction_id]
      );

      if (duplicateCheck.rows.length > 0) {
        const existing = duplicateCheck.rows[0];
        if (existing.status === 'success') {
          return {
            isDuplicate: true,
            points_earned: existing.points_earned
          };
        }
      }

      // Find customer by identifier - need to normalize phone for lookup
      let customer = null;

      // Try phone number first
      if (customer_identifier.startsWith('+') || /^\d+$/.test(customer_identifier)) {
        let cleaned = customer_identifier.replace(/\D/g, '');
        if (cleaned.startsWith('0')) {
          cleaned = '66' + cleaned.slice(1);
        }
        if (!cleaned.startsWith('+')) {
          cleaned = '+' + cleaned;
        }
        const phoneResult = await client.query(
          'SELECT id, name, phone, points_balance, tier_level, customer_id, birthday, lifetime_points_earned FROM users WHERE phone = $1 FOR UPDATE',
          [cleaned]
        );
        if (phoneResult.rows.length > 0) {
          customer = phoneResult.rows[0];
        }
      }

      // Try member ID (MEM-XXXXX format or customer_id) if phone didn't match
      if (!customer) {
        const memberIdMatch = customer_identifier.match(/^(?:MEM-)?(\w+)$/i);
        if (memberIdMatch) {
          const memberResult = await client.query(
            'SELECT id, name, phone, points_balance, tier_level, customer_id, birthday, lifetime_points_earned FROM users WHERE customer_id = $1 FOR UPDATE',
            [memberIdMatch[1]]
          );
          if (memberResult.rows.length > 0) {
            customer = memberResult.rows[0];
          }
        }
      }

      if (!customer) {
        // Log failed lookup (within transaction)
        await client.query(
          `INSERT INTO pos_transactions_log
           (api_key_id, external_transaction_id, transaction_time, customer_identifier, amount, receipt_number, line_items, status, error_message)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            req.apiKey!.id,
            transaction_id,
            transaction_time || new Date(),
            customer_identifier,
            amount,
            receipt_number || null,
            line_items ? JSON.stringify(line_items) : null,
            'customer_not_found',
            'No member found with this identifier'
          ]
        );

        throw { status: 404, error: 'customer_not_found', message: getUserFriendlyMessage('customer_not_found') };
      }

      // Calculate points
      const pointsEarned = Math.floor(amount / 100) * POINTS_PER_100_THB;

      // Check birthday multiplier - applies on exact birthday date only
      let multiplier = 1;
      if (customer.birthday) {
        const [day, month] = customer.birthday.split('-').map(Number);
        const now = new Date();
        // Check both day AND month match for 2x birthday bonus
        if (now.getDate() === day && now.getMonth() + 1 === month) {
          multiplier = 2;
        }
      }

      const totalPointsEarned = pointsEarned * multiplier;
      const newBalance = customer.points_balance + totalPointsEarned;
      const newLifetimePoints = (customer.lifetime_points_earned || 0) + totalPointsEarned;

      // Update user points (within same transaction, row already locked)
      await client.query(
        `UPDATE users
         SET points_balance = $1,
             last_activity_date = NOW(),
             lifetime_points_earned = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [newBalance, newLifetimePoints, customer.id]
      );

      // Calculate and update tier (within same transaction)
      const newTier = newLifetimePoints >= 1000 ? 'Platinum' :
                      newLifetimePoints >= 500 ? 'Gold' :
                      newLifetimePoints >= 200 ? 'Silver' : 'Bronze';

      if (newTier !== customer.tier_level) {
        await client.query('UPDATE users SET tier_level = $1 WHERE id = $2', [newTier, customer.id]);
      }

      // Create transaction record (within same transaction)
      const txResult = await client.query(
        `INSERT INTO transactions
         (user_id, type, points_delta, amount_value, outlet, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [customer.id, 'earn', totalPointsEarned, amount, req.apiKey!.name, transaction_time || new Date()]
      );

      // Log POS transaction (within same transaction)
      await client.query(
        `INSERT INTO pos_transactions_log
         (api_key_id, external_transaction_id, transaction_time, customer_identifier, customer_id, amount, receipt_number, line_items, points_earned, transaction_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          req.apiKey!.id,
          transaction_id,
          transaction_time || new Date(),
          customer_identifier,
          customer.id,
          amount,
          receipt_number || null,
          line_items ? JSON.stringify(line_items) : null,
          totalPointsEarned,
          txResult.rows[0].id,
          'success'
        ]
      );

      // Queue notification (within same transaction)
      await client.query(
        `INSERT INTO notification_queue
         (user_id, notification_type, title, body, data, category, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          customer.id,
          'points_earned',
          'Points Earned!',
          `You earned ${totalPointsEarned} points${multiplier > 1 ? ' (2x birthday bonus!)' : ''} from your purchase.`,
          JSON.stringify({ points_earned: totalPointsEarned, multiplier, amount, new_balance: newBalance }),
          'points_rewards',
          'pending'
        ]
      );

      return {
        isDuplicate: false,
        totalPointsEarned,
        multiplier,
        newBalance,
        customer,
        newTier
      };
    });

    // Handle duplicate response (after transaction completes)
    if (result.isDuplicate) {
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: 'Transaction already processed',
        points_earned: result.points_earned
      });
    }

    // Success response
    return res.json({
      success: true,
      points_earned: result.totalPointsEarned,
      multiplier: (result.multiplier && result.multiplier > 1) ? result.multiplier : undefined,
      new_balance: result.newBalance,
      user: {
        id: result.customer!.id,
        name: result.customer!.name,
        tier: result.newTier
      }
    });

  } catch (error: any) {
    // Handle known errors from transaction
    if (error.status && error.error) {
      return res.status(error.status).json({
        success: false,
        error: error.error,
        message: error.message || getUserFriendlyMessage(error.error)
      });
    }
    // Unknown error
    const message = handleAndLogError('POS transaction', error, 'Unable to process transaction. Please try again.');
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: message
    });
  }
});

/**
 * GET /api/pos/search-customer
 * Unified customer search for staff portal (phone, email, ID, name)
 */
router.get('/search-customer', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.status(400).json({
        error: 'invalid_search',
        message: 'Please enter at least 2 characters to search.'
      });
    }

    const searchTerm = q.trim();
    let customers: any[] = [];

    // Try to determine search type - order matters!
    // Phone check must come before numeric ID (phone can be all digits)
    const isPhone = searchTerm.startsWith('+') || /^0\d{8,9}$/.test(searchTerm) || /^66\d{9}$/.test(searchTerm);
    const isNumericId = !isPhone && /^\d{1,6}$/.test(searchTerm); // IDs are short numbers
    const isEmail = searchTerm.includes('@');

    if (isPhone) {
      // Search by phone - get last 9 digits for matching
      const digitsOnly = searchTerm.replace(/\D/g, '');
      const last9 = digitsOnly.slice(-9);
      const normalizedPhone = normalizePhoneForLookup(searchTerm);
      const result = await query(
        `SELECT id, name, surname, phone, email, points_balance, user_type, tier_level, customer_id
         FROM users
         WHERE phone = $1 OR phone LIKE $2 OR phone LIKE $3
         LIMIT 10`,
        [normalizedPhone, `%${last9}%`, `%${digitsOnly}%`]
      );
      customers = result.rows;
    } else if (isNumericId) {
      // Search by ID (numeric user id or customer_id string)
      const result = await query(
        `SELECT id, name, surname, phone, email, points_balance, user_type, tier_level, customer_id
         FROM users
         WHERE id = $1 OR customer_id = $2
         LIMIT 10`,
        [parseInt(searchTerm), searchTerm]
      );
      customers = result.rows;
    } else if (isEmail) {
      // Search by email
      const result = await query(
        `SELECT id, name, surname, phone, email, points_balance, user_type, tier_level, customer_id
         FROM users
         WHERE LOWER(email) LIKE LOWER($1)
         LIMIT 10`,
        [`%${searchTerm}%`]
      );
      customers = result.rows;
    } else {
      // Search by name
      const result = await query(
        `SELECT id, name, surname, phone, email, points_balance, user_type, tier_level, customer_id
         FROM users
         WHERE LOWER(name) LIKE LOWER($1) OR LOWER(surname) LIKE LOWER($1)
            OR LOWER(name || ' ' || COALESCE(surname, '')) LIKE LOWER($1)
         ORDER BY
           CASE WHEN LOWER(name) = LOWER($2) THEN 0
                WHEN LOWER(name) LIKE LOWER($3) THEN 1
                ELSE 2
           END,
           name ASC
         LIMIT 10`,
        [`%${searchTerm}%`, searchTerm, `${searchTerm}%`]
      );
      customers = result.rows;
    }

    return res.json({
      customers: customers.map(c => ({
        id: c.id,
        name: c.name,
        surname: c.surname,
        phone: c.phone,
        email: c.email,
        points_balance: c.points_balance,
        user_type: c.user_type,
        tier_level: c.tier_level,
        member_id: c.customer_id ? `MEM-${c.customer_id}` : null
      })),
      search_term: searchTerm,
      count: customers.length
    });

  } catch (error) {
    const message = handleAndLogError('Customer search', error, 'Unable to search customers. Please try again.');
    return res.status(500).json({
      error: 'search_failed',
      message: message
    });
  }
});

/**
 * GET /api/pos/lookup/:identifier
 * Lookup customer by phone or member ID (for external POS)
 */
router.get('/lookup/:identifier', validateExternalApiKey, async (req: POSExternalRequest, res: Response) => {
  try {
    const { identifier } = req.params;
    const customer = await findCustomerByIdentifier(identifier);

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'customer_not_found',
        message: getUserFriendlyMessage('customer_not_found')
      });
    }

    return res.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        member_id: customer.customer_id ? `MEM-${customer.customer_id}` : null,
        points_balance: customer.points_balance,
        tier: customer.tier_level
      }
    });

  } catch (error) {
    const message = handleAndLogError('Customer lookup', error, 'Unable to look up customer. Please try again.');
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: message
    });
  }
});

// =============================================================================
// ADMIN: POS API KEY MANAGEMENT
// =============================================================================

/**
 * GET /api/pos/keys
 * List all POS API keys (admin only)
 */
router.get('/keys', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Check admin role
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'forbidden',
        message: getUserFriendlyMessage('forbidden')
      });
    }

    const result = await query(`
      SELECT
        id,
        name,
        key_prefix,
        outlet_id,
        is_active,
        created_at,
        last_used_at,
        total_requests,
        (SELECT COUNT(*) FROM pos_transactions_log WHERE api_key_id = pos_api_keys.id AND status = 'success') as total_transactions
      FROM pos_api_keys
      ORDER BY created_at DESC
    `);

    return res.json({ keys: result.rows });

  } catch (error) {
    const message = handleAndLogError('List POS keys', error, 'Unable to load API keys. Please try again.');
    return res.status(500).json({
      error: 'load_failed',
      message: message
    });
  }
});

/**
 * POST /api/pos/keys
 * Create a new POS API key (admin only)
 */
router.post('/keys', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Check admin role
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'forbidden',
        message: getUserFriendlyMessage('forbidden')
      });
    }

    const { name, outlet_id } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'missing_name',
        message: 'Please provide a name for the API key.'
      });
    }

    // Generate secure API key
    const apiKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const keyPrefix = apiKey.substring(0, 12);

    // Insert key
    const result = await query(
      `INSERT INTO pos_api_keys (name, api_key_hash, key_prefix, outlet_id, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, key_prefix, outlet_id, is_active, created_at`,
      [name.trim(), keyHash, keyPrefix, outlet_id || null, req.user.id]
    );

    return res.json({
      key: result.rows[0],
      apiKey // Return the full key only once!
    });

  } catch (error) {
    const message = handleAndLogError('Create POS key', error, 'Unable to create API key. Please try again.');
    return res.status(500).json({
      error: 'create_failed',
      message: message
    });
  }
});

/**
 * DELETE /api/pos/keys/:id
 * Revoke a POS API key (admin only)
 */
router.delete('/keys/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Check admin role
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'forbidden',
        message: getUserFriendlyMessage('forbidden')
      });
    }

    const { id } = req.params;

    const result = await query(
      `UPDATE pos_api_keys
       SET is_active = false, revoked_at = NOW(), revoked_by = $2
       WHERE id = $1
       RETURNING id`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'not_found',
        message: 'API key not found or already revoked.'
      });
    }

    return res.json({ success: true, message: 'API key revoked successfully.' });

  } catch (error) {
    const message = handleAndLogError('Revoke POS key', error, 'Unable to revoke API key. Please try again.');
    return res.status(500).json({
      error: 'revoke_failed',
      message: message
    });
  }
});

/**
 * GET /api/pos/keys/:id/logs
 * Get transaction logs for a specific API key (admin only)
 */
router.get('/keys/:id/logs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Check admin role
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'forbidden',
        message: getUserFriendlyMessage('forbidden')
      });
    }

    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const result = await query(`
      SELECT
        ptl.id,
        ptl.external_transaction_id,
        ptl.customer_identifier as customer_phone,
        ptl.amount,
        ptl.points_earned,
        ptl.status,
        ptl.error_message,
        ptl.created_at,
        pak.name as outlet
      FROM pos_transactions_log ptl
      JOIN pos_api_keys pak ON ptl.api_key_id = pak.id
      WHERE ptl.api_key_id = $1
      ORDER BY ptl.created_at DESC
      LIMIT $2 OFFSET $3
    `, [id, limit, offset]);

    return res.json({
      logs: result.rows.map(row => ({
        ...row,
        amount_thb: row.amount
      }))
    });

  } catch (error) {
    const message = handleAndLogError('Get POS logs', error, 'Unable to load transaction logs. Please try again.');
    return res.status(500).json({
      error: 'load_failed',
      message: message
    });
  }
});

/**
 * GET /api/pos/keys/stats
 * Get overall POS integration statistics (admin only)
 */
router.get('/keys/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Check admin role
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'forbidden',
        message: getUserFriendlyMessage('forbidden')
      });
    }

    const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM pos_api_keys WHERE is_active = true) as active_keys,
        (SELECT COUNT(*) FROM pos_api_keys WHERE is_active = false) as revoked_keys,
        (SELECT COUNT(*) FROM pos_transactions_log WHERE status = 'success') as successful_transactions,
        (SELECT COUNT(*) FROM pos_transactions_log WHERE status != 'success') as failed_transactions,
        (SELECT COALESCE(SUM(amount), 0) FROM pos_transactions_log WHERE status = 'success') as total_amount,
        (SELECT COALESCE(SUM(points_earned), 0) FROM pos_transactions_log WHERE status = 'success') as total_points_earned
    `);

    return res.json({ stats: stats.rows[0] });

  } catch (error) {
    const message = handleAndLogError('Get POS stats', error, 'Unable to load statistics. Please try again.');
    return res.status(500).json({
      error: 'load_failed',
      message: message
    });
  }
});

export default router;
