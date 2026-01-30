import { Router, Response } from 'express';
import { query, transaction } from '../db/database';
import { authenticate, requireStaff, requireAdmin, AuthRequest } from '../middleware/auth';
import { calculatePoints, validateRedemption } from '../utils/points';
import { getSocket } from '../socket';

const router = Router();

// Earn points (staff only)
router.post('/earn', authenticate, requireStaff, async (req: AuthRequest, res: Response) => {
  try {
    const { user_id, amount, outlet } = req.body;

    if (!user_id || !amount) {
      return res.status(400).json({ error: 'user_id and amount are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    // Check if user is an employee
    const userCheckResult = await query('SELECT user_type FROM users WHERE id = $1', [user_id]);
    if (userCheckResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userType = userCheckResult.rows[0].user_type;
    if (userType === 'employee') {
      return res.status(403).json({
        error: 'Employees cannot earn points',
        message: 'This user is an employee and is not eligible to earn loyalty points'
      });
    }

    const points = calculatePoints(amount);

    if (points === 0) {
      return res.status(400).json({ error: 'Amount too small to earn points (minimum 100 THB)' });
    }

    const result = await transaction(async (client) => {
      // Update user points and stats
      await client.query(
        `UPDATE users
         SET points_balance = points_balance + $1,
             total_spend = total_spend + $2,
             total_purchases_count = total_purchases_count + 1
         WHERE id = $3`,
        [points, amount, user_id]
      );

      // Create transaction record
      const txResult = await client.query(
        `INSERT INTO transactions (user_id, type, points_delta, amount_value, outlet, staff_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [user_id, 'earn', points, amount, outlet, req.user?.id]
      );

      // Get updated user
      const userResult = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [user_id]
      );

      return {
        transaction: txResult.rows[0],
        user: userResult.rows[0]
      };
    });

    // Emit WebSocket event to user
    const io = getSocket();
    io.to(`user:${user_id}`).emit('points_earned', {
      points_earned: points,
      new_balance: result.user.points_balance,
      transaction: result.transaction,
      amount: amount
    });
    console.log(`📡 Emitted points_earned event to user:${user_id}`);

    res.json({
      message: 'Points earned successfully',
      points_earned: points,
      new_balance: result.user.points_balance,
      transaction: result.transaction
    });
  } catch (error) {
    console.error('Earn points error:', error);
    res.status(500).json({ error: 'Failed to process transaction' });
  }
});

// Redeem voucher (staff only)
router.post('/redeem', authenticate, requireStaff, async (req: AuthRequest, res: Response) => {
  try {
    const { user_id, voucher_id, outlet } = req.body;

    if (!user_id || !voucher_id) {
      return res.status(400).json({ error: 'user_id and voucher_id are required' });
    }

    const result = await transaction(async (client) => {
      // Get user
      const userResult = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [user_id]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Get voucher
      const voucherResult = await client.query(
        'SELECT * FROM vouchers WHERE id = $1',
        [voucher_id]
      );

      if (voucherResult.rows.length === 0) {
        throw new Error('Voucher not found');
      }

      const voucher = voucherResult.rows[0];

      // Validate voucher
      if (!voucher.is_active) {
        throw new Error('Voucher is not active');
      }

      if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
        throw new Error('Voucher has expired');
      }

      // Validate user has enough points
      if (!validateRedemption(user.points_balance, voucher.points_required)) {
        throw new Error('Insufficient points');
      }

      // Deduct points
      await client.query(
        'UPDATE users SET points_balance = points_balance - $1 WHERE id = $2',
        [voucher.points_required, user_id]
      );

      // Create transaction record
      const txResult = await client.query(
        `INSERT INTO transactions (user_id, type, points_delta, amount_value, voucher_id, outlet, staff_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [user_id, 'redeem', -voucher.points_required, voucher.value_amount, voucher_id, outlet, req.user?.id]
      );

      // Get updated user
      const updatedUserResult = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [user_id]
      );

      return {
        transaction: txResult.rows[0],
        user: updatedUserResult.rows[0],
        voucher
      };
    });

    res.json({
      message: 'Voucher redeemed successfully',
      points_spent: result.voucher.points_required,
      new_balance: result.user.points_balance,
      voucher: result.voucher,
      transaction: result.transaction
    });
  } catch (error: any) {
    console.error('Redeem voucher error:', error);
    res.status(400).json({ error: error.message || 'Failed to redeem voucher' });
  }
});

// Get transactions (admin: all, customer: own only)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { user_id, type, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT t.*, u.name as user_name, u.phone as user_phone,
             v.title as voucher_name
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN vouchers v ON t.voucher_id = v.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    // If customer, only show their transactions
    if (req.user?.type === 'customer') {
      conditions.push(`t.user_id = $${paramCount++}`);
      params.push(req.user.id);
    } else if (user_id) {
      conditions.push(`t.user_id = $${paramCount++}`);
      params.push(user_id);
    }

    if (type) {
      conditions.push(`t.type = $${paramCount++}`);
      params.push(type);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ` ORDER BY t.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Group transactions by type for frontend convenience
    const grouped = {
      earned: result.rows.filter(t => t.type === 'earn'),
      redeemed: result.rows.filter(t => t.type === 'redeem'),
      used: result.rows.filter(t => t.type === 'use')
    };

    res.json({
      transactions: result.rows,
      grouped,
      total_count: result.rowCount
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

export default router;
