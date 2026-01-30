import { Router, Response } from 'express';
import { query } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

// Configuration (could be moved to settings table)
const REFERRAL_POINTS_REWARD = 50;
const REFERRAL_MONTHLY_CAP = 10;

/**
 * Generate a unique referral code
 */
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars: I, O, 0, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * GET /api/referrals/my-code
 * Get current user's referral code (generate if doesn't exist)
 */
router.get('/my-code', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user already has a referral code
    let codeResult = await query(
      'SELECT * FROM referral_codes WHERE user_id = $1',
      [userId]
    );

    if (codeResult.rows.length === 0) {
      // Generate a new unique code
      let code: string;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        code = generateReferralCode();
        const existing = await query(
          'SELECT id FROM referral_codes WHERE code = $1',
          [code]
        );
        if (existing.rows.length === 0) break;
        attempts++;
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        return res.status(500).json({ error: 'Failed to generate unique referral code' });
      }

      // Create the referral code
      codeResult = await query(
        `INSERT INTO referral_codes (user_id, code)
         VALUES ($1, $2)
         RETURNING *`,
        [userId, code]
      );
    }

    const referralCode = codeResult.rows[0];

    // Get referral stats
    const statsResult = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed') as successful_referrals,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_referrals,
        COALESCE(SUM(referrer_points_awarded) FILTER (WHERE status = 'completed'), 0) as total_points_earned
      FROM referrals
      WHERE referrer_id = $1
    `, [userId]);

    const stats = statsResult.rows[0];

    // Get this month's referral count (for cap checking)
    const monthlyResult = await query(`
      SELECT COUNT(*) as count
      FROM referrals
      WHERE referrer_id = $1
      AND status = 'completed'
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    `, [userId]);

    const monthlyCount = parseInt(monthlyResult.rows[0].count);

    res.json({
      referral_code: referralCode.code,
      is_active: referralCode.is_active,
      total_uses: referralCode.uses_count,
      stats: {
        successful_referrals: parseInt(stats.successful_referrals),
        pending_referrals: parseInt(stats.pending_referrals),
        total_points_earned: parseInt(stats.total_points_earned),
        monthly_referrals: monthlyCount,
        monthly_cap: REFERRAL_MONTHLY_CAP,
        remaining_this_month: Math.max(0, REFERRAL_MONTHLY_CAP - monthlyCount)
      },
      share_url: `https://loyalty.sarnies.tech/register?ref=${referralCode.code}`,
      share_message: `Join Sarnies Rewards and get a welcome bonus! Use my code: ${referralCode.code}`
    });
  } catch (error) {
    console.error('Get referral code error:', error);
    res.status(500).json({ error: 'Failed to get referral code' });
  }
});

/**
 * GET /api/referrals/my-referrals
 * Get list of people the user has referred
 */
router.get('/my-referrals', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await query(`
      SELECT
        r.id,
        r.status,
        r.referrer_points_awarded,
        r.created_at,
        r.referee_first_purchase_at,
        r.referrer_rewarded_at,
        u.name as referee_name,
        SUBSTRING(u.phone FROM 1 FOR 7) || '****' as referee_phone_masked
      FROM referrals r
      JOIN users u ON r.referee_id = u.id
      WHERE r.referrer_id = $1
      ORDER BY r.created_at DESC
    `, [userId]);

    res.json({ referrals: result.rows });
  } catch (error) {
    console.error('Get my referrals error:', error);
    res.status(500).json({ error: 'Failed to get referrals' });
  }
});

/**
 * POST /api/referrals/apply
 * Apply a referral code during registration
 * Called internally when a new user registers with a referral code
 */
router.post('/apply', async (req: AuthRequest, res: Response) => {
  try {
    const { referee_user_id, referral_code } = req.body;

    if (!referee_user_id || !referral_code) {
      return res.status(400).json({ error: 'referee_user_id and referral_code are required' });
    }

    // Find the referral code
    const codeResult = await query(
      'SELECT * FROM referral_codes WHERE code = $1 AND is_active = true',
      [referral_code.toUpperCase()]
    );

    if (codeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or inactive referral code' });
    }

    const referralCode = codeResult.rows[0];

    // Check user isn't referring themselves
    if (referralCode.user_id === referee_user_id) {
      return res.status(400).json({ error: 'You cannot use your own referral code' });
    }

    // Check if referee has already been referred
    const existingReferral = await query(
      'SELECT id FROM referrals WHERE referee_id = $1',
      [referee_user_id]
    );

    if (existingReferral.rows.length > 0) {
      return res.status(400).json({ error: 'User has already been referred' });
    }

    // Check referrer's monthly cap
    const monthlyResult = await query(`
      SELECT COUNT(*) as count
      FROM referrals
      WHERE referrer_id = $1
      AND status = 'completed'
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    `, [referralCode.user_id]);

    if (parseInt(monthlyResult.rows[0].count) >= REFERRAL_MONTHLY_CAP) {
      return res.status(400).json({ error: 'Referrer has reached their monthly referral limit' });
    }

    // Create the referral record
    const referralResult = await query(
      `INSERT INTO referrals (referrer_id, referee_id, referral_code_id, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [referralCode.user_id, referee_user_id, referralCode.id]
    );

    // Increment uses_count on referral code
    await query(
      'UPDATE referral_codes SET uses_count = uses_count + 1 WHERE id = $1',
      [referralCode.id]
    );

    // Store referral_code in user record for tracking
    await query(
      'UPDATE users SET referral_code = $1 WHERE id = $2',
      [referral_code.toUpperCase(), referee_user_id]
    );

    res.json({
      success: true,
      message: 'Referral code applied successfully',
      referral_id: referralResult.rows[0].id
    });
  } catch (error) {
    console.error('Apply referral code error:', error);
    res.status(500).json({ error: 'Failed to apply referral code' });
  }
});

/**
 * POST /api/referrals/complete/:refereeId
 * Complete a referral after referee makes first purchase
 * Called internally after a transaction is recorded
 */
router.post('/complete/:refereeId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { refereeId } = req.params;

    // Find pending referral for this referee
    const referralResult = await query(
      `SELECT r.*, rc.user_id as referrer_id
       FROM referrals r
       JOIN referral_codes rc ON r.referral_code_id = rc.id
       WHERE r.referee_id = $1 AND r.status = 'pending'`,
      [refereeId]
    );

    if (referralResult.rows.length === 0) {
      return res.json({ success: false, message: 'No pending referral found' });
    }

    const referral = referralResult.rows[0];

    // Check monthly cap again before rewarding
    const monthlyResult = await query(`
      SELECT COUNT(*) as count
      FROM referrals
      WHERE referrer_id = $1
      AND status = 'completed'
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    `, [referral.referrer_id]);

    if (parseInt(monthlyResult.rows[0].count) >= REFERRAL_MONTHLY_CAP) {
      // Mark as expired instead of completed
      await query(
        `UPDATE referrals
         SET status = 'expired', updated_at = NOW()
         WHERE id = $1`,
        [referral.id]
      );
      return res.json({ success: false, message: 'Referrer monthly cap reached' });
    }

    // Award points to referrer
    await query(
      'UPDATE users SET points_balance = points_balance + $1 WHERE id = $2',
      [REFERRAL_POINTS_REWARD, referral.referrer_id]
    );

    // Create transaction record for referrer
    await query(
      `INSERT INTO transactions (user_id, type, points_delta, outlet)
       VALUES ($1, 'earn', $2, 'Referral Reward')`,
      [referral.referrer_id, REFERRAL_POINTS_REWARD]
    );

    // Update referral status
    await query(
      `UPDATE referrals
       SET status = 'completed',
           referee_first_purchase_at = NOW(),
           referrer_rewarded_at = NOW(),
           referrer_points_awarded = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [REFERRAL_POINTS_REWARD, referral.id]
    );

    // Queue notification for referrer
    await query(
      `INSERT INTO notification_queue
       (user_id, notification_type, title, body, data, category, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
      [
        referral.referrer_id,
        'referral_reward',
        'Referral Reward!',
        `Your friend made their first purchase! You earned ${REFERRAL_POINTS_REWARD} bonus points.`,
        JSON.stringify({ points_earned: REFERRAL_POINTS_REWARD, referee_id: refereeId }),
        'referrals'
      ]
    );

    res.json({
      success: true,
      message: 'Referral completed successfully',
      points_awarded: REFERRAL_POINTS_REWARD
    });
  } catch (error) {
    console.error('Complete referral error:', error);
    res.status(500).json({ error: 'Failed to complete referral' });
  }
});

/**
 * GET /api/referrals/validate/:code
 * Validate a referral code (public endpoint for registration)
 */
router.get('/validate/:code', async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;

    const result = await query(
      `SELECT rc.code, rc.is_active, u.name as referrer_name
       FROM referral_codes rc
       JOIN users u ON rc.user_id = u.id
       WHERE rc.code = $1`,
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.json({ valid: false, message: 'Referral code not found' });
    }

    const referralCode = result.rows[0];

    if (!referralCode.is_active) {
      return res.json({ valid: false, message: 'Referral code is no longer active' });
    }

    res.json({
      valid: true,
      referrer_name: referralCode.referrer_name,
      bonus_message: `You'll get a welcome bonus when you make your first purchase!`
    });
  } catch (error) {
    console.error('Validate referral code error:', error);
    res.status(500).json({ error: 'Failed to validate referral code' });
  }
});

/**
 * GET /api/referrals/admin/stats
 * Get overall referral program statistics (admin only)
 */
router.get('/admin/stats', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM referral_codes WHERE is_active = true) as active_codes,
        (SELECT COUNT(*) FROM referrals WHERE status = 'completed') as total_completed,
        (SELECT COUNT(*) FROM referrals WHERE status = 'pending') as total_pending,
        (SELECT COALESCE(SUM(referrer_points_awarded), 0) FROM referrals WHERE status = 'completed') as total_points_awarded,
        (SELECT COUNT(*) FROM referrals WHERE status = 'completed' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)) as completed_this_month,
        (SELECT COUNT(DISTINCT referrer_id) FROM referrals WHERE status = 'completed') as users_with_successful_referrals
    `);

    // Top referrers
    const topReferrers = await query(`
      SELECT
        u.id,
        u.name,
        u.phone,
        COUNT(r.id) as referral_count,
        COALESCE(SUM(r.referrer_points_awarded), 0) as points_earned
      FROM users u
      JOIN referrals r ON u.id = r.referrer_id
      WHERE r.status = 'completed'
      GROUP BY u.id, u.name, u.phone
      ORDER BY referral_count DESC
      LIMIT 10
    `);

    res.json({
      stats: stats.rows[0],
      top_referrers: topReferrers.rows
    });
  } catch (error) {
    console.error('Get referral admin stats error:', error);
    res.status(500).json({ error: 'Failed to get referral statistics' });
  }
});

export default router;
