import { Router, Response } from 'express';
import { query } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { generateQRToken } from '../utils/jwt';
import { logUserAction, logPointsAdjustment } from '../utils/auditLog';
import { generateOTP, saveOTP, verifyOTP, sendOTP, saveEmailOTP, verifyEmailOTP, sendEmailOTP } from '../utils/otp';
import { generateMagicToken, saveMagicToken } from '../utils/magicLink';
import { sendMagicLinkEmail } from '../utils/email';
import QRCode from 'qrcode';

const router = Router();

// Get all users (admin only)
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;

    // Join with companies table to get company name
    let sql = `
      SELECT u.*,
        COALESCE(c.name, u.company) as company,
        c.name as company_name,
        c.discount_percentage as company_discount
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
    `;
    let params: any[] = [];

    if (search) {
      sql += ' WHERE u.name ILIKE $1 OR u.surname ILIKE $1 OR u.phone ILIKE $1';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY u.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await query(sql, params);

    res.json({
      users: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Customers can only view their own profile
    if (req.user?.type === 'customer' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query('SELECT * FROM users WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name, surname, email, birthday, company, gender,
      user_type, is_active,
      referral_enabled_override, referral_discount_override
    } = req.body;

    const isAdmin = req.user?.type === 'staff' || req.user?.role === 'admin';

    // Customers can only update their own profile, admins can update any
    if (!isAdmin && req.user?.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get old user data for audit trail
    const oldUserResult = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (oldUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const oldUser = oldUserResult.rows[0];

    // Validate birthday format if provided (DD-MM)
    if (birthday) {
      if (!/^\d{2}-\d{2}$/.test(birthday)) {
        return res.status(400).json({ error: 'Birthday must be in DD-MM format' });
      }
      const [day, month] = birthday.split('-').map(Number);
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        return res.status(400).json({ error: 'Invalid birthday date' });
      }
    }

    // Validate user_type if provided (admin only)
    const validUserTypes = ['customer', 'employee', 'staff', 'investor', 'media', 'partner'];
    if (user_type !== undefined && !validUserTypes.includes(user_type)) {
      return res.status(400).json({ error: `Invalid user_type. Must be one of: ${validUserTypes.join(', ')}` });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Basic fields - anyone can update their own
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (surname !== undefined) {
      updates.push(`surname = $${paramCount++}`);
      values.push(surname);
    }
    if (birthday !== undefined) {
      updates.push(`birthday = $${paramCount++}`);
      values.push(birthday);
    }
    if (company !== undefined) {
      updates.push(`company = $${paramCount++}`);
      values.push(company);
    }
    if (gender !== undefined) {
      updates.push(`gender = $${paramCount++}`);
      values.push(gender);
    }

    // Email update (admin only for now - to avoid verification complexity)
    if (isAdmin && email !== undefined) {
      // Check for duplicate email
      if (email) {
        const emailLower = email.toLowerCase().trim();
        const existingEmail = await query(
          'SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2',
          [emailLower, id]
        );
        if (existingEmail.rows.length > 0) {
          return res.status(400).json({ error: 'This email is already used by another account' });
        }
        updates.push(`email = $${paramCount++}`);
        values.push(emailLower);
      } else {
        updates.push(`email = $${paramCount++}`);
        values.push(null);
      }
    }

    // Admin-only fields
    if (isAdmin) {
      if (user_type !== undefined) {
        updates.push(`user_type = $${paramCount++}`);
        values.push(user_type);
      }
      if (is_active !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(is_active);
      }
      if (referral_enabled_override !== undefined) {
        updates.push(`referral_enabled_override = $${paramCount++}`);
        values.push(referral_enabled_override);
      }
      if (referral_discount_override !== undefined) {
        updates.push(`referral_discount_override = $${paramCount++}`);
        values.push(referral_discount_override);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = result.rows[0];

    // Log audit trail
    await logUserAction(
      req,
      'update',
      updatedUser.id,
      `${updatedUser.name || ''} ${updatedUser.surname || ''}`.trim(),
      {
        before: oldUser,
        after: updatedUser
      }
    );

    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Get user's static QR code
router.get('/:id/static-qr', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Users can only view their own QR code (unless staff)
    const userType = req.user?.type;
    if (userType !== 'staff' && req.user?.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      'SELECT id, customer_id, static_qr_code FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const customerId = user.customer_id || user.id.toString().padStart(6, '0');

    // If no static_qr_code exists, generate one
    let qrToken = user.static_qr_code;
    if (!qrToken) {
      // Static user QR is a permanent customer identifier, so no expiry (undefined)
      // This differs from payment QR codes which expire in 120s
      qrToken = generateQRToken({ userId: user.id, customerId, type: 'static_user_id' }, undefined);
      await query(
        'UPDATE users SET static_qr_code = $1, static_qr_created_at = NOW() WHERE id = $2',
        [qrToken, id]
      );
      console.log('✅ Generated new static QR token for user', id);
    }

    // Generate QR code image from token
    const qrDataUrl = await QRCode.toDataURL(qrToken, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    console.log('✅ Generated QR image, starts with:', qrDataUrl.substring(0, 30));

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const response = {
      qr_code: qrDataUrl,
      customer_id: customerId
    };

    console.log('📤 Returning QR response, qr_code starts with:', response.qr_code?.substring(0, 30));

    res.json(response);
  } catch (error) {
    console.error('Get static QR error:', error);
    res.status(500).json({ error: 'Failed to fetch static QR code' });
  }
});

// Manually adjust points (admin only)
router.post('/:id/points', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { points, reason } = req.body;

    if (!points || !reason) {
      return res.status(400).json({ error: 'Points and reason are required' });
    }

    // Get current user
    const userResult = await query('SELECT * FROM users WHERE id = $1', [id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const newBalance = user.points_balance + points;

    if (newBalance < 0) {
      return res.status(400).json({ error: 'Insufficient points balance' });
    }

    // Update user points
    await query(
      'UPDATE users SET points_balance = $1 WHERE id = $2',
      [newBalance, id]
    );

    // Create transaction record
    await query(
      `INSERT INTO transactions (user_id, type, points_delta, amount_value, staff_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, 'grant', points, null, req.user?.id]
    );

    // Log audit trail
    await logPointsAdjustment(
      req,
      parseInt(id),
      `${user.name || ''} ${user.surname || ''}`.trim(),
      points,
      reason,
      newBalance
    );

    res.json({
      message: 'Points adjusted successfully',
      new_balance: newBalance
    });
  } catch (error) {
    console.error('Adjust points error:', error);
    res.status(500).json({ error: 'Failed to adjust points' });
  }
});

// Get user's voucher instances
router.get('/:id/voucher-instances', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.query; // Optional filter: 'active', 'used', 'expired'

    // Customers can only view their own voucher instances
    if (req.user?.type === 'customer' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let sql = `
      SELECT
        vi.id,
        vi.uuid,
        vi.user_id,
        vi.voucher_id,
        vi.qr_code_data,
        vi.status,
        vi.redeemed_at,
        vi.used_at,
        vi.expires_at,
        v.title,
        v.description,
        v.image_url,
        v.points_required,
        v.cash_value,
        v.voucher_type
      FROM voucher_instances vi
      JOIN vouchers v ON vi.voucher_id = v.id
      WHERE vi.user_id = $1
    `;

    const params: any[] = [id];

    // Filter by status if provided
    if (status) {
      if (status === 'expired') {
        sql += ` AND vi.status = 'active' AND vi.expires_at < NOW()`;
      } else {
        sql += ` AND vi.status = $${params.length + 1}`;
        params.push(status);
      }
    }

    sql += ' ORDER BY vi.redeemed_at DESC';

    const result = await query(sql, params);

    // Add computed status for expired vouchers
    const voucherInstances = result.rows.map((instance: any) => ({
      ...instance,
      computed_status: instance.status === 'active' && instance.expires_at && new Date(instance.expires_at) < new Date()
        ? 'expired'
        : instance.status
    }));

    res.json({
      voucher_instances: voucherInstances
    });
  } catch (error) {
    console.error('Get voucher instances error:', error);
    res.status(500).json({ error: 'Failed to fetch voucher instances' });
  }
});

// =============================================================================
// AUTH METHOD LINKING ENDPOINTS
// =============================================================================

// Add phone to user account (sends OTP)
router.post('/me/phone', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Normalize phone number
    const normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length < 9 || normalizedPhone.length > 15) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Check if phone is already used by another user
    const existing = await query(
      'SELECT id FROM users WHERE phone = $1 AND id != $2',
      [phone, userId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'This phone number is already linked to another account' });
    }

    // Generate and send OTP
    const otp = generateOTP();
    await saveOTP(phone, otp);
    await sendOTP(phone, otp);

    res.json({ message: 'OTP sent to phone number', phone });
  } catch (error) {
    console.error('Add phone error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify phone OTP and link to account
router.post('/me/phone/verify', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP are required' });
    }

    // Verify OTP
    const isValid = await verifyOTP(phone, otp);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Check if phone is still available
    const existing = await query(
      'SELECT id FROM users WHERE phone = $1 AND id != $2',
      [phone, userId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'This phone number is already linked to another account' });
    }

    // Update user with verified phone
    const result = await query(
      `UPDATE users
       SET phone = $1, phone_verified = true, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [phone, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Also add to user_auth_methods table if it exists
    await query(
      `INSERT INTO user_auth_methods (user_id, auth_type, auth_identifier, is_verified)
       VALUES ($1, 'phone', $2, true)
       ON CONFLICT (auth_type, auth_identifier) DO UPDATE SET is_verified = true, user_id = $1`,
      [userId, phone]
    ).catch(() => {
      // Table may not exist yet (Phase 3 migration)
    });

    res.json({
      message: 'Phone number verified and linked successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Verify phone error:', error);
    res.status(500).json({ error: 'Failed to verify phone' });
  }
});

// Add email to user account (sends verification email)
router.post('/me/email', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailLower = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailLower)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if email is already used by another user
    const existing = await query(
      'SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2',
      [emailLower, userId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'This email is already linked to another account' });
    }

    // Generate and send OTP via email
    const otp = generateOTP();
    await saveEmailOTP(emailLower, otp);
    await sendEmailOTP(emailLower, otp);

    res.json({ message: 'Verification code sent to email', email: emailLower });
  } catch (error) {
    console.error('Add email error:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

// Verify email OTP and link to account
router.post('/me/email/verify', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const emailLower = email.toLowerCase().trim();

    // Verify OTP
    const isValid = await verifyEmailOTP(emailLower, otp);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Check if email is still available
    const existing = await query(
      'SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2',
      [emailLower, userId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'This email is already linked to another account' });
    }

    // Update user with verified email
    const result = await query(
      `UPDATE users
       SET email = $1, email_verified = true, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [emailLower, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Also add to user_auth_methods table if it exists
    await query(
      `INSERT INTO user_auth_methods (user_id, auth_type, auth_identifier, is_verified)
       VALUES ($1, 'email', $2, true)
       ON CONFLICT (auth_type, auth_identifier) DO UPDATE SET is_verified = true, user_id = $1`,
      [userId, emailLower]
    ).catch(() => {
      // Table may not exist yet (Phase 3 migration)
    });

    res.json({
      message: 'Email verified and linked successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// Get user's auth methods
router.get('/me/auth-methods', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // Get user data
    const userResult = await query(
      `SELECT phone, email, line_id, line_display_name, line_picture_url,
              phone_verified, email_verified, primary_auth_method
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const methods = [];

    if (user.phone) {
      methods.push({
        type: 'phone',
        identifier: user.phone,
        is_verified: user.phone_verified || false,
        is_primary: user.primary_auth_method === 'phone'
      });
    }

    if (user.email) {
      methods.push({
        type: 'email',
        identifier: user.email,
        is_verified: user.email_verified || false,
        is_primary: user.primary_auth_method === 'email'
      });
    }

    if (user.line_id) {
      methods.push({
        type: 'line',
        identifier: user.line_display_name || 'LINE',
        picture_url: user.line_picture_url,
        is_verified: true, // LINE is always verified via OAuth
        is_primary: user.primary_auth_method === 'line'
      });
    }

    res.json({ auth_methods: methods });
  } catch (error) {
    console.error('Get auth methods error:', error);
    res.status(500).json({ error: 'Failed to fetch auth methods' });
  }
});

// Remove an auth method
router.delete('/me/auth-methods/:type', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { type } = req.params;

    if (!['phone', 'email', 'line'].includes(type)) {
      return res.status(400).json({ error: 'Invalid auth method type' });
    }

    // Get current user to check remaining auth methods
    const userResult = await query(
      'SELECT phone, email, line_id, primary_auth_method FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const hasPhone = user.phone && !user.phone.startsWith('LINE') && !user.phone.startsWith('E');
    const hasEmail = user.email;
    const hasLine = user.line_id;

    // Count remaining auth methods after removal
    let remaining = 0;
    if (type !== 'phone' && hasPhone) remaining++;
    if (type !== 'email' && hasEmail) remaining++;
    if (type !== 'line' && hasLine) remaining++;

    if (remaining === 0) {
      return res.status(400).json({
        error: 'Cannot remove last auth method. Add another login method first.'
      });
    }

    // Remove the specified auth method
    const updates: string[] = [];
    if (type === 'phone') {
      updates.push('phone = NULL', 'phone_verified = false');
    } else if (type === 'email') {
      updates.push('email = NULL', 'email_verified = false');
    } else if (type === 'line') {
      updates.push('line_id = NULL', 'line_display_name = NULL', 'line_picture_url = NULL');
    }

    // Update primary auth method if needed
    if (user.primary_auth_method === type) {
      const newPrimary = type !== 'phone' && hasPhone ? 'phone'
                       : type !== 'email' && hasEmail ? 'email'
                       : type !== 'line' && hasLine ? 'line' : 'phone';
      updates.push(`primary_auth_method = '${newPrimary}'`);
    }

    await query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $1`,
      [userId]
    );

    // Remove from user_auth_methods table if it exists
    await query(
      `DELETE FROM user_auth_methods WHERE user_id = $1 AND auth_type = $2`,
      [userId, type]
    ).catch(() => {
      // Table may not exist yet
    });

    res.json({ message: `${type} auth method removed successfully` });
  } catch (error) {
    console.error('Remove auth method error:', error);
    res.status(500).json({ error: 'Failed to remove auth method' });
  }
});

// Set primary auth method
router.put('/me/auth-methods/:type/primary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { type } = req.params;

    if (!['phone', 'email', 'line'].includes(type)) {
      return res.status(400).json({ error: 'Invalid auth method type' });
    }

    // Verify user has this auth method
    const userResult = await query(
      'SELECT phone, email, line_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const hasMethod = (type === 'phone' && user.phone && !user.phone.startsWith('LINE'))
                   || (type === 'email' && user.email)
                   || (type === 'line' && user.line_id);

    if (!hasMethod) {
      return res.status(400).json({ error: `You don't have ${type} linked to your account` });
    }

    await query(
      `UPDATE users SET primary_auth_method = $1, updated_at = NOW() WHERE id = $2`,
      [type, userId]
    );

    res.json({ message: `${type} set as primary auth method` });
  } catch (error) {
    console.error('Set primary auth method error:', error);
    res.status(500).json({ error: 'Failed to set primary auth method' });
  }
});

// =============================================================================
// ADMIN USER MANAGEMENT
// =============================================================================

// Create a new user (admin only)
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, surname, email, user_type = 'customer' } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email is required to create a user' });
    }

    const emailLower = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailLower)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if email already exists
    const existingEmail = await query(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [emailLower]
    );
    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    // Validate user_type
    const validUserTypes = ['customer', 'employee', 'staff', 'investor', 'media', 'partner'];
    if (!validUserTypes.includes(user_type)) {
      return res.status(400).json({ error: `Invalid user_type. Must be one of: ${validUserTypes.join(', ')}` });
    }

    // Create user
    const result = await query(
      `INSERT INTO users (name, surname, email, user_type, registration_completed)
       VALUES ($1, $2, $3, $4, false)
       RETURNING *`,
      [name, surname || null, emailLower, user_type]
    );

    const newUser = result.rows[0];

    // Log the action
    await logUserAction(
      req,
      'create',
      newUser.id,
      `${newUser.name || ''} ${newUser.surname || ''}`.trim(),
      { email: emailLower, user_type }
    );

    // Send invite email automatically
    try {
      const token = generateMagicToken();
      await saveMagicToken(emailLower, token);

      const frontendUrl = process.env.FRONTEND_URL || 'https://sarnies.tech';
      const magicLink = `${frontendUrl}/auth/verify?token=${token}`;

      await sendMagicLinkEmail(emailLower, magicLink);

      await logUserAction(
        req,
        'send_invite',
        newUser.id,
        `${newUser.name || ''} ${newUser.surname || ''}`.trim(),
        { email: emailLower }
      );

      res.status(201).json({ user: newUser, invite_sent: true });
    } catch (emailError) {
      console.error('Failed to send invite email:', emailError);
      // Still return success, just note that invite wasn't sent
      res.status(201).json({ user: newUser, invite_sent: false, invite_error: 'Failed to send invite email' });
    }
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Send login invite (magic link) to user (admin only)
router.post('/:id/send-invite', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get user
    const userResult = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (!user.email) {
      return res.status(400).json({ error: 'User must have an email to receive an invite' });
    }

    // Create magic link token
    const token = generateMagicToken();
    await saveMagicToken(user.email, token);

    // Build magic link URL
    const frontendUrl = process.env.FRONTEND_URL || 'https://sarnies.tech';
    const magicLink = `${frontendUrl}/auth/verify?token=${token}`;

    // Send email
    await sendMagicLinkEmail(user.email, magicLink);

    // Log the action
    await logUserAction(
      req,
      'send_invite',
      user.id,
      `${user.name || ''} ${user.surname || ''}`.trim(),
      { email: user.email }
    );

    res.json({ message: 'Login invite sent successfully', email: user.email });
  } catch (error) {
    console.error('Send invite error:', error);
    res.status(500).json({ error: 'Failed to send invite' });
  }
});

// =============================================================================
// COMPANY ASSIGNMENT (Admin)
// =============================================================================

// Update user's company assignment
router.patch('/:id/company', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { company_id } = req.body; // null to remove, number to assign

    // Verify user exists
    const userResult = await query('SELECT id, name, surname FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If company_id is provided, verify company exists
    if (company_id !== null && company_id !== undefined) {
      const companyResult = await query('SELECT id, name FROM companies WHERE id = $1', [company_id]);
      if (companyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }
    }

    // Update user's company_id
    const result = await query(
      'UPDATE users SET company_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [company_id, id]
    );

    const user = userResult.rows[0];
    await logUserAction(
      req,
      'update',
      parseInt(id),
      `${user.name || ''} ${user.surname || ''}`.trim(),
      { field: 'company_id', new_value: company_id }
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Update user company error:', error);
    res.status(500).json({ error: 'Failed to update user company assignment' });
  }
});

export default router;
