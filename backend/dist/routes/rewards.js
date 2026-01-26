"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Check and claim birthday reward
router.post('/birthday/claim', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        // Get user's birthday
        const userResult = await (0, database_1.query)('SELECT birthday, birthday_reward_claimed_year FROM users WHERE id = $1', [userId]);
        if (!userResult.rows[0]?.birthday) {
            return res.status(400).json({ error: 'Birthday not set. Please update your profile.' });
        }
        const birthday = new Date(userResult.rows[0].birthday);
        const today = new Date();
        const currentYear = today.getFullYear();
        const claimedYear = userResult.rows[0].birthday_reward_claimed_year;
        // Check if birthday is today or within the birthday week
        const isBirthdayWeek = (birthday.getMonth() === today.getMonth() &&
            Math.abs(birthday.getDate() - today.getDate()) <= 3);
        if (!isBirthdayWeek) {
            return res.status(400).json({ error: 'Birthday reward can only be claimed during your birthday week' });
        }
        // Check if already claimed this year
        if (claimedYear === currentYear) {
            return res.status(400).json({ error: 'You have already claimed your birthday reward this year' });
        }
        // Get birthday reward points from settings
        const settingsResult = await (0, database_1.query)("SELECT setting_value FROM app_settings WHERE setting_key = 'birthday_reward_points'");
        const rewardPoints = parseInt(settingsResult.rows[0]?.setting_value || '100', 10);
        // Award points
        await (0, database_1.query)('BEGIN');
        await (0, database_1.query)('UPDATE users SET points_balance = points_balance + $1, birthday_reward_claimed_year = $2 WHERE id = $3', [rewardPoints, currentYear, userId]);
        // Record transaction
        await (0, database_1.query)(`
      INSERT INTO transactions (user_id, type, points_delta, description)
      VALUES ($1, 'birthday', $2, 'Birthday reward')
    `, [userId, rewardPoints]);
        await (0, database_1.query)('COMMIT');
        // Get updated balance
        const balanceResult = await (0, database_1.query)('SELECT points_balance FROM users WHERE id = $1', [userId]);
        res.json({
            success: true,
            points_awarded: rewardPoints,
            new_balance: balanceResult.rows[0].points_balance,
            message: 'Happy Birthday! Enjoy your reward!'
        });
    }
    catch (error) {
        await (0, database_1.query)('ROLLBACK');
        console.error('Birthday reward claim error:', error);
        res.status(500).json({ error: 'Failed to claim birthday reward' });
    }
});
// Check birthday reward status
router.get('/birthday/status', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const userResult = await (0, database_1.query)('SELECT birthday, birthday_reward_claimed_year FROM users WHERE id = $1', [userId]);
        if (!userResult.rows[0]?.birthday) {
            return res.json({ eligible: false, reason: 'birthday_not_set' });
        }
        const birthday = new Date(userResult.rows[0].birthday);
        const today = new Date();
        const currentYear = today.getFullYear();
        const claimedYear = userResult.rows[0].birthday_reward_claimed_year;
        const isBirthdayWeek = (birthday.getMonth() === today.getMonth() &&
            Math.abs(birthday.getDate() - today.getDate()) <= 3);
        const alreadyClaimed = claimedYear === currentYear;
        // Get reward amount
        const settingsResult = await (0, database_1.query)("SELECT setting_value FROM app_settings WHERE setting_key = 'birthday_reward_points'");
        const rewardPoints = parseInt(settingsResult.rows[0]?.setting_value || '100', 10);
        res.json({
            eligible: isBirthdayWeek && !alreadyClaimed,
            is_birthday_week: isBirthdayWeek,
            already_claimed: alreadyClaimed,
            reward_points: rewardPoints,
            birthday_date: birthday.toISOString().split('T')[0]
        });
    }
    catch (error) {
        console.error('Birthday status error:', error);
        res.status(500).json({ error: 'Failed to check birthday status' });
    }
});
// Get streak info
router.get('/streak', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        // Get user's transaction dates for the last 30 days
        const result = await (0, database_1.query)(`
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
                    const diff = Math.floor((visitDates[i - 1].getTime() - visitDates[i].getTime()) / (1000 * 60 * 60 * 24));
                    if (diff === 1) {
                        currentStreak++;
                        tempStreak++;
                    }
                    else {
                        break;
                    }
                }
            }
        }
        // Calculate max streak from all visit dates
        if (visitDates.length > 0) {
            tempStreak = 1;
            for (let i = 1; i < visitDates.length; i++) {
                const diff = Math.floor((visitDates[i - 1].getTime() - visitDates[i].getTime()) / (1000 * 60 * 60 * 24));
                if (diff === 1) {
                    tempStreak++;
                    maxStreak = Math.max(maxStreak, tempStreak);
                }
                else {
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
    }
    catch (error) {
        console.error('Get streak error:', error);
        res.status(500).json({ error: 'Failed to get streak info' });
    }
});
// Claim streak reward
router.post('/streak/claim', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { milestone_days } = req.body;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        // Verify streak milestone
        const streakRewards = { 3: 10, 7: 25, 14: 50, 30: 100 };
        const rewardPoints = streakRewards[milestone_days];
        if (!rewardPoints) {
            return res.status(400).json({ error: 'Invalid milestone' });
        }
        // Check if already claimed this milestone
        const claimedResult = await (0, database_1.query)(`
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
        await (0, database_1.query)('BEGIN');
        await (0, database_1.query)('UPDATE users SET points_balance = points_balance + $1 WHERE id = $2', [rewardPoints, userId]);
        await (0, database_1.query)(`
      INSERT INTO transactions (user_id, type, points_delta, description)
      VALUES ($1, 'streak', $2, $3)
    `, [userId, rewardPoints, `${milestone_days} day streak reward`]);
        await (0, database_1.query)('COMMIT');
        const balanceResult = await (0, database_1.query)('SELECT points_balance FROM users WHERE id = $1', [userId]);
        res.json({
            success: true,
            points_awarded: rewardPoints,
            new_balance: balanceResult.rows[0].points_balance,
            message: `Amazing! You've earned ${rewardPoints} points for your ${milestone_days} day streak!`
        });
    }
    catch (error) {
        await (0, database_1.query)('ROLLBACK');
        console.error('Claim streak error:', error);
        res.status(500).json({ error: 'Failed to claim streak reward' });
    }
});
exports.default = router;
//# sourceMappingURL=rewards.js.map