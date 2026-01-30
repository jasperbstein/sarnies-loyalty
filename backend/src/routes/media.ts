import { Router, Request, Response } from 'express';
import pool from '../db/database';
import { authenticate as authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// ============================================================================
// MEDIA BUDGET - User Endpoints
// ============================================================================

/**
 * GET /api/media/budget
 * Get media budget status for logged-in user
 */
router.get('/budget', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const result = await pool.query(
      `SELECT
        user_type,
        media_annual_budget_thb,
        media_spent_this_year_thb,
        media_budget_allocated_at,
        media_budget_expires_at
      FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (user.user_type !== 'media') {
      return res.status(403).json({ error: 'User is not a media user' });
    }

    const totalBudget = parseFloat(user.media_annual_budget_thb) || 0;
    const spent = parseFloat(user.media_spent_this_year_thb) || 0;
    const remaining = totalBudget - spent;

    res.json({
      user_type: user.user_type,
      total_budget_thb: totalBudget,
      spent_thb: spent,
      remaining_thb: remaining,
      allocated_at: user.media_budget_allocated_at,
      expires_at: user.media_budget_expires_at,
    });
  } catch (error) {
    console.error('Error fetching media budget:', error);
    res.status(500).json({ error: 'Failed to fetch budget' });
  }
});

/**
 * GET /api/media/transactions
 * Get media budget transaction history
 */
router.get('/transactions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT
        ct.*,
        o.name as outlet_name,
        v.title as voucher_title
      FROM credit_transactions ct
      LEFT JOIN outlets o ON o.id = ct.outlet_id
      LEFT JOIN vouchers v ON v.id = ct.voucher_id
      WHERE ct.user_id = $1
      AND ct.credit_type = 'media'
      ORDER BY ct.created_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json({
      transactions: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Error fetching media transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// ============================================================================
// ADMIN ENDPOINTS - Media Budget Management
// ============================================================================

/**
 * POST /api/admin/:userId/budget
 * Set annual media budget
 */
router.post('/admin/:userId/budget', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const { userId } = req.params;
    const {
      annualBudgetThb,
      spentThb = 0,
      expiresAt
    } = req.body;
    const staffId = (req as any).user.id;

    if (annualBudgetThb === undefined) {
      return res.status(400).json({ error: 'annualBudgetThb is required' });
    }

    await client.query('BEGIN');

    // Verify user exists
    const userCheck = await client.query(
      'SELECT user_type FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    // Set user type to media if not already
    if (userCheck.rows[0].user_type !== 'media') {
      await client.query(
        'UPDATE users SET user_type = $1 WHERE id = $2',
        ['media', userId]
      );
    }

    const expiryDate = expiresAt || new Date(new Date().getFullYear(), 11, 31, 23, 59, 59); // Dec 31

    // Update budget
    const result = await client.query(
      `UPDATE users
      SET
        media_annual_budget_thb = $1,
        media_spent_this_year_thb = $2,
        media_budget_allocated_at = NOW(),
        media_budget_expires_at = $3,
        updated_at = NOW()
      WHERE id = $4
      RETURNING
        media_annual_budget_thb,
        media_spent_this_year_thb,
        media_budget_allocated_at,
        media_budget_expires_at`,
      [annualBudgetThb, spentThb, expiryDate, userId]
    );

    // Log transaction
    await client.query(
      `INSERT INTO credit_transactions (
        user_id, credit_type, transaction_type,
        amount_thb, notes, staff_id
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        'media',
        'allocation',
        annualBudgetThb,
        `Admin allocated ฿${annualBudgetThb} annual media budget`,
        staffId
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      budget: result.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error allocating media budget:', error);
    res.status(500).json({ error: 'Failed to allocate budget' });
  } finally {
    client.release();
  }
});

/**
 * PATCH /api/admin/:userId/budget/adjust
 * Manually adjust media budget (spent amount)
 */
router.patch('/admin/:userId/budget/adjust', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const { userId } = req.params;
    const { amountThb, notes } = req.body;
    const staffId = (req as any).user.id;

    if (amountThb === undefined) {
      return res.status(400).json({ error: 'amountThb is required' });
    }

    await client.query('BEGIN');

    // Adjust spent amount
    const result = await client.query(
      `UPDATE users
      SET media_spent_this_year_thb = media_spent_this_year_thb + $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING
        media_annual_budget_thb,
        media_spent_this_year_thb`,
      [amountThb, userId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const { media_annual_budget_thb, media_spent_this_year_thb } = result.rows[0];

    // Log transaction
    await client.query(
      `INSERT INTO credit_transactions (
        user_id, credit_type, transaction_type,
        amount_thb, notes, staff_id
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        'media',
        'adjustment',
        amountThb,
        notes || 'Manual adjustment by admin',
        staffId
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      total_budget_thb: parseFloat(media_annual_budget_thb),
      spent_thb: parseFloat(media_spent_this_year_thb),
      remaining_thb: parseFloat(media_annual_budget_thb) - parseFloat(media_spent_this_year_thb),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adjusting media budget:', error);
    res.status(500).json({ error: 'Failed to adjust budget' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/admin/budgets/expiring
 * Get media budgets expiring soon
 */
router.get('/admin/budgets/expiring', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;

    const result = await pool.query(
      `SELECT
        id, name, surname, phone,
        media_annual_budget_thb,
        media_spent_this_year_thb,
        media_budget_allocated_at,
        media_budget_expires_at,
        (media_annual_budget_thb - media_spent_this_year_thb) as remaining_thb
      FROM users
      WHERE user_type = 'media'
      AND media_budget_expires_at IS NOT NULL
      AND media_budget_expires_at <= NOW() + ($1 || ' days')::INTERVAL
      AND media_annual_budget_thb > 0
      ORDER BY media_budget_expires_at ASC`,
      [days]
    );

    res.json({
      media_budgets_expiring: result.rows,
    });
  } catch (error) {
    console.error('Error fetching expiring media budgets:', error);
    res.status(500).json({ error: 'Failed to fetch expiring budgets' });
  }
});

/**
 * GET /api/admin/usage-report
 * Get media budget usage summary
 */
router.get('/admin/usage-report', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
        u.id,
        u.name,
        u.surname,
        u.phone,
        u.media_annual_budget_thb as total_budget,
        u.media_spent_this_year_thb as spent,
        (u.media_annual_budget_thb - u.media_spent_this_year_thb) as remaining,
        ROUND((u.media_spent_this_year_thb / NULLIF(u.media_annual_budget_thb, 0) * 100), 2) as usage_percentage,
        u.media_budget_expires_at as expires_at,
        COUNT(ct.id) as total_transactions,
        COALESCE(SUM(ct.amount_thb) FILTER (WHERE ct.transaction_type = 'redemption'), 0) as total_redeemed
      FROM users u
      LEFT JOIN credit_transactions ct ON ct.user_id = u.id AND ct.credit_type = 'media'
      WHERE u.user_type = 'media'
      AND u.media_annual_budget_thb > 0
      GROUP BY u.id
      ORDER BY usage_percentage DESC`
    );

    res.json({
      media_users: result.rows,
    });
  } catch (error) {
    console.error('Error generating media usage report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;
