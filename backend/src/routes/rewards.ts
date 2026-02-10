import { Router, Response } from 'express';
import { query } from '../db/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Check and claim birthday reward
router.post('/birthday/claim', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's birthday
    const userResult = await query(
      'SELECT birthday, birthday_reward_claimed_year FROM users WHERE id = $1',
      [userId]
    );

    if (!userResult.rows[0]?.birthday) {
      return res.status(400).json({ error: 'Birthday not set. Please update your profile.' });
    }

    const birthday = new Date(userResult.rows[0].birthday);
    const today = new Date();
    const currentYear = today.getFullYear();
    const claimedYear = userResult.rows[0].birthday_reward_claimed_year;

    // Check if birthday is today or within the birthday week (±3 days)
    // Handle month/year boundaries correctly
    const birthdayThisYear = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
    const daysDiff = Math.floor((today.getTime() - birthdayThisYear.getTime()) / (1000 * 60 * 60 * 24));
    const isBirthdayWeek = Math.abs(daysDiff) <= 3;

    if (!isBirthdayWeek) {
      return res.status(400).json({ error: 'Birthday reward can only be claimed during your birthday week' });
    }

    // Check if already claimed this year
    if (claimedYear === currentYear) {
      return res.status(400).json({ error: 'You have already claimed your birthday reward this year' });
    }

    // Get birthday reward points from settings
    const settingsResult = await query(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'birthday_reward_points'"
    );
    const rewardPoints = parseInt(settingsResult.rows[0]?.setting_value || '100', 10);

    // Award points
    await query('BEGIN');

    await query(
      'UPDATE users SET points_balance = points_balance + $1, birthday_reward_claimed_year = $2 WHERE id = $3',
      [rewardPoints, currentYear, userId]
    );

    // Record transaction
    await query(`
      INSERT INTO transactions (user_id, type, points_delta, description)
      VALUES ($1, 'birthday', $2, 'Birthday reward')
    `, [userId, rewardPoints]);

    await query('COMMIT');

    // Get updated balance
    const balanceResult = await query('SELECT points_balance FROM users WHERE id = $1', [userId]);

    res.json({
      success: true,
      points_awarded: rewardPoints,
      new_balance: balanceResult.rows[0].points_balance,
      message: 'Happy Birthday! Enjoy your reward!'
    });
  } catch (error) {
    await query('ROLLBACK');
    console.error('Birthday reward claim error:', error);
    res.status(500).json({ error: 'Failed to claim birthday reward' });
  }
});

// Check birthday reward status
router.get('/birthday/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userResult = await query(
      'SELECT birthday, birthday_reward_claimed_year FROM users WHERE id = $1',
      [userId]
    );

    if (!userResult.rows[0]?.birthday) {
      return res.json({ eligible: false, reason: 'birthday_not_set' });
    }

    const birthday = new Date(userResult.rows[0].birthday);
    const today = new Date();
    const currentYear = today.getFullYear();
    const claimedYear = userResult.rows[0].birthday_reward_claimed_year;

    // Check if birthday is today or within the birthday week (±3 days)
    // Handle month/year boundaries correctly
    const birthdayThisYear = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
    const daysDiff = Math.floor((today.getTime() - birthdayThisYear.getTime()) / (1000 * 60 * 60 * 24));
    const isBirthdayWeek = Math.abs(daysDiff) <= 3;

    const alreadyClaimed = claimedYear === currentYear;

    // Get reward amount
    const settingsResult = await query(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'birthday_reward_points'"
    );
    const rewardPoints = parseInt(settingsResult.rows[0]?.setting_value || '100', 10);

    res.json({
      eligible: isBirthdayWeek && !alreadyClaimed,
      is_birthday_week: isBirthdayWeek,
      already_claimed: alreadyClaimed,
      reward_points: rewardPoints,
      birthday_date: birthday.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Birthday status error:', error);
    res.status(500).json({ error: 'Failed to check birthday status' });
  }
});

// Get streak info
router.get('/streak', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's transaction dates for the last 30 days
    const result = await query(`
      SELECT DISTINCT DATE(created_at) as visit_date
      FROM transactions
      WHERE user_id = $1
        AND type = 'earn'
        AND created_at > NOW() - INTERVAL '30 days'
      ORDER BY visit_date DESC
    `, [userId]);

    const visitDates = result.rows.map(r => new Date(r.visit_date));

    // Calculate current streak
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if visited today or yesterday to start counting
    const lastVisit = visitDates[0];
    if (lastVisit) {
      const daysSinceLastVisit = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceLastVisit <= 1) {
        currentStreak = 1;
        tempStreak = 1;

        // Count consecutive days backwards
        for (let i = 1; i < visitDates.length; i++) {
          const diff = Math.floor((visitDates[i-1].getTime() - visitDates[i].getTime()) / (1000 * 60 * 60 * 24));
          if (diff === 1) {
            currentStreak++;
            tempStreak++;
          } else {
            break;
          }
        }
      }
    }

    // Calculate max streak from all visit dates
    if (visitDates.length > 0) {
      tempStreak = 1;
      for (let i = 1; i < visitDates.length; i++) {
        const diff = Math.floor((visitDates[i-1].getTime() - visitDates[i].getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          tempStreak++;
          maxStreak = Math.max(maxStreak, tempStreak);
        } else {
          tempStreak = 1;
        }
      }
      maxStreak = Math.max(maxStreak, currentStreak);
    }

    // Get streak rewards config
    const streakRewards = [
      { days: 3, points: 10, label: '3 days' },
      { days: 7, points: 25, label: '1 week' },
      { days: 14, points: 50, label: '2 weeks' },
      { days: 30, points: 100, label: '1 month' },
    ];

    const nextMilestone = streakRewards.find(r => r.days > currentStreak);
    const daysToNextMilestone = nextMilestone ? nextMilestone.days - currentStreak : 0;

    res.json({
      current_streak: currentStreak,
      max_streak: maxStreak,
      total_visits_30d: visitDates.length,
      last_visit: visitDates[0]?.toISOString().split('T')[0] || null,
      next_milestone: nextMilestone || null,
      days_to_next: daysToNextMilestone,
      streak_rewards: streakRewards
    });
  } catch (error) {
    console.error('Get streak error:', error);
    res.status(500).json({ error: 'Failed to get streak info' });
  }
});

// Claim streak reward
router.post('/streak/claim', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { milestone_days } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify streak milestone
    const streakRewards: Record<number, number> = { 3: 10, 7: 25, 14: 50, 30: 100 };
    const rewardPoints = streakRewards[milestone_days];

    if (!rewardPoints) {
      return res.status(400).json({ error: 'Invalid milestone' });
    }

    // Check if already claimed this milestone
    const claimedResult = await query(`
      SELECT id FROM transactions
      WHERE user_id = $1
        AND type = 'streak'
        AND description LIKE $2
        AND created_at > NOW() - INTERVAL '30 days'
    `, [userId, `%${milestone_days} day%`]);

    if (claimedResult.rows.length > 0) {
      return res.status(400).json({ error: 'Milestone already claimed' });
    }

    // Award points
    await query('BEGIN');

    await query(
      'UPDATE users SET points_balance = points_balance + $1 WHERE id = $2',
      [rewardPoints, userId]
    );

    await query(`
      INSERT INTO transactions (user_id, type, points_delta, description)
      VALUES ($1, 'streak', $2, $3)
    `, [userId, rewardPoints, `${milestone_days} day streak reward`]);

    await query('COMMIT');

    const balanceResult = await query('SELECT points_balance FROM users WHERE id = $1', [userId]);

    res.json({
      success: true,
      points_awarded: rewardPoints,
      new_balance: balanceResult.rows[0].points_balance,
      message: `Amazing! You've earned ${rewardPoints} points for your ${milestone_days} day streak!`
    });
  } catch (error) {
    await query('ROLLBACK');
    console.error('Claim streak error:', error);
    res.status(500).json({ error: 'Failed to claim streak reward' });
  }
});

export default router;
