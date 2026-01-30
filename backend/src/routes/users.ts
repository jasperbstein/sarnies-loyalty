import { Router, Response } from 'express';
import { query } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { generateQRToken } from '../utils/jwt';
import { logUserAction, logPointsAdjustment } from '../utils/auditLog';
import QRCode from 'qrcode';

const router = Router();

// Get all users (admin only)
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;

    let sql = 'SELECT * FROM users';
    let params: any[] = [];

    if (search) {
      sql += ' WHERE name ILIKE $1 OR surname ILIKE $1 OR phone ILIKE $1';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
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
    const { name, surname, birthday, company, gender } = req.body;

    // Customers can only update their own profile, admins can update any
    if (req.user?.type === 'customer' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get old user data for audit trail
    const oldUserResult = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (oldUserResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const oldUser = oldUserResult.rows[0];

    // Validate birthday format if provided (DD-MM)
    if (birthday && !/^\d{2}-\d{2}$/.test(birthday)) {
      return res.status(400).json({ error: 'Birthday must be in DD-MM format' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

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

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
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

export default router;
