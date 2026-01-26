"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const pushNotifications_1 = require("../services/pushNotifications");
const router = (0, express_1.Router)();
/**
 * GET /api/notifications/vapid-public-key
 * Get the VAPID public key for client-side push subscription
 */
router.get('/vapid-public-key', (req, res) => {
    const key = (0, pushNotifications_1.getVapidPublicKey)();
    if (!key) {
        return res.status(503).json({ error: 'Push notifications not configured' });
    }
    res.json({ vapidPublicKey: key });
});
/**
 * POST /api/notifications/subscribe
 * Subscribe to push notifications
 */
router.post('/subscribe', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { subscription } = req.body;
        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return res.status(400).json({ error: 'Invalid subscription object' });
        }
        const userAgent = req.headers['user-agent'];
        await (0, pushNotifications_1.subscribeToPush)(userId, subscription, userAgent);
        res.json({ success: true, message: 'Subscribed to push notifications' });
    }
    catch (error) {
        console.error('Push subscribe error:', error);
        res.status(500).json({ error: 'Failed to subscribe to push notifications' });
    }
});
/**
 * POST /api/notifications/unsubscribe
 * Unsubscribe from push notifications
 */
router.post('/unsubscribe', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { endpoint } = req.body;
        await (0, pushNotifications_1.unsubscribeFromPush)(userId, endpoint);
        res.json({ success: true, message: 'Unsubscribed from push notifications' });
    }
    catch (error) {
        console.error('Push unsubscribe error:', error);
        res.status(500).json({ error: 'Failed to unsubscribe from push notifications' });
    }
});
/**
 * GET /api/notifications/status
 * Check if user has active push subscriptions
 */
router.get('/status', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const result = await (0, database_1.query)('SELECT COUNT(*) as count FROM push_subscriptions WHERE user_id = $1 AND is_active = true', [userId]);
        const hasSubscription = parseInt(result.rows[0].count) > 0;
        res.json({
            subscribed: hasSubscription,
            vapidConfigured: !!(0, pushNotifications_1.getVapidPublicKey)()
        });
    }
    catch (error) {
        console.error('Get notification status error:', error);
        res.status(500).json({ error: 'Failed to get notification status' });
    }
});
/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 */
router.get('/preferences', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const result = await (0, database_1.query)('SELECT notification_prefs FROM users WHERE id = $1', [userId]);
        const prefs = result.rows[0]?.notification_prefs || {
            points_rewards: true,
            promotions: true,
            birthday: true,
            referrals: true
        };
        res.json({ preferences: prefs });
    }
    catch (error) {
        console.error('Get notification preferences error:', error);
        res.status(500).json({ error: 'Failed to get notification preferences' });
    }
});
/**
 * PATCH /api/notifications/preferences
 * Update user's notification preferences
 */
router.patch('/preferences', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { preferences } = req.body;
        // Validate preferences object
        const validCategories = ['points_rewards', 'promotions', 'birthday', 'referrals'];
        const sanitizedPrefs = {};
        for (const [key, value] of Object.entries(preferences || {})) {
            if (validCategories.includes(key) && typeof value === 'boolean') {
                sanitizedPrefs[key] = value;
            }
        }
        // Get current prefs and merge
        const currentResult = await (0, database_1.query)('SELECT notification_prefs FROM users WHERE id = $1', [userId]);
        const currentPrefs = currentResult.rows[0]?.notification_prefs || {};
        const mergedPrefs = { ...currentPrefs, ...sanitizedPrefs };
        await (0, database_1.query)('UPDATE users SET notification_prefs = $1 WHERE id = $2', [JSON.stringify(mergedPrefs), userId]);
        res.json({
            success: true,
            preferences: mergedPrefs
        });
    }
    catch (error) {
        console.error('Update notification preferences error:', error);
        res.status(500).json({ error: 'Failed to update notification preferences' });
    }
});
/**
 * POST /api/notifications/test
 * Send a test notification to the current user
 */
router.post('/test', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const result = await (0, pushNotifications_1.sendPushToUser)(userId, {
            title: 'Test Notification',
            body: 'Push notifications are working!',
            data: { type: 'test' }
        });
        res.json({
            success: result.success > 0,
            sent: result.success,
            failed: result.failed
        });
    }
    catch (error) {
        console.error('Test notification error:', error);
        res.status(500).json({ error: 'Failed to send test notification' });
    }
});
/**
 * GET /api/notifications/history
 * Get user's notification history
 */
router.get('/history', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { limit = 20, offset = 0 } = req.query;
        const result = await (0, database_1.query)(`SELECT id, notification_type, title, body, data, category, status, sent_at, created_at
       FROM notification_queue
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`, [userId, limit, offset]);
        res.json({ notifications: result.rows });
    }
    catch (error) {
        console.error('Get notification history error:', error);
        res.status(500).json({ error: 'Failed to get notification history' });
    }
});
// ============ ADMIN ENDPOINTS ============
/**
 * POST /api/notifications/admin/send
 * Send a notification to specific user(s) (admin only)
 */
router.post('/admin/send', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { user_ids, title, body, category = 'promotions', data } = req.body;
        if (!title || !body) {
            return res.status(400).json({ error: 'Title and body are required' });
        }
        if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
            return res.status(400).json({ error: 'user_ids array is required' });
        }
        let totalSuccess = 0;
        let totalFailed = 0;
        for (const userId of user_ids) {
            await (0, pushNotifications_1.queueNotification)(userId, 'admin_message', title, body, category, data);
            const result = await (0, pushNotifications_1.sendPushToUser)(userId, {
                title,
                body,
                data: { type: 'admin_message', ...data }
            });
            totalSuccess += result.success;
            totalFailed += result.failed;
        }
        res.json({
            success: true,
            sent_to: user_ids.length,
            delivered: totalSuccess,
            failed: totalFailed
        });
    }
    catch (error) {
        console.error('Admin send notification error:', error);
        res.status(500).json({ error: 'Failed to send notifications' });
    }
});
/**
 * POST /api/notifications/admin/broadcast
 * Send a notification to all users with active subscriptions (admin only)
 */
router.post('/admin/broadcast', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { title, body, category = 'promotions', data } = req.body;
        if (!title || !body) {
            return res.status(400).json({ error: 'Title and body are required' });
        }
        // Get all users with active push subscriptions
        const usersResult = await (0, database_1.query)(`
      SELECT DISTINCT user_id
      FROM push_subscriptions
      WHERE is_active = true
    `);
        const userIds = usersResult.rows.map(r => r.user_id);
        // Queue notifications for all users
        for (const userId of userIds) {
            await (0, pushNotifications_1.queueNotification)(userId, 'broadcast', title, body, category, data);
        }
        // Process the queue
        await (0, pushNotifications_1.processNotificationQueue)();
        res.json({
            success: true,
            queued_for: userIds.length,
            message: 'Broadcast queued for processing'
        });
    }
    catch (error) {
        console.error('Broadcast notification error:', error);
        res.status(500).json({ error: 'Failed to broadcast notifications' });
    }
});
/**
 * GET /api/notifications/admin/stats
 * Get notification statistics (admin only)
 */
router.get('/admin/stats', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const stats = await (0, database_1.query)(`
      SELECT
        (SELECT COUNT(DISTINCT user_id) FROM push_subscriptions WHERE is_active = true) as subscribed_users,
        (SELECT COUNT(*) FROM push_subscriptions WHERE is_active = true) as total_subscriptions,
        (SELECT COUNT(*) FROM notification_queue WHERE status = 'pending') as pending_notifications,
        (SELECT COUNT(*) FROM notification_queue WHERE status = 'sent' AND sent_at > NOW() - INTERVAL '24 hours') as sent_last_24h,
        (SELECT COUNT(*) FROM notification_queue WHERE status = 'failed' AND sent_at > NOW() - INTERVAL '24 hours') as failed_last_24h
    `);
        res.json(stats.rows[0]);
    }
    catch (error) {
        console.error('Get notification stats error:', error);
        res.status(500).json({ error: 'Failed to get notification statistics' });
    }
});
/**
 * POST /api/notifications/admin/process-queue
 * Manually trigger queue processing (admin only)
 */
router.post('/admin/process-queue', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        await (0, pushNotifications_1.processNotificationQueue)();
        res.json({ success: true, message: 'Queue processed' });
    }
    catch (error) {
        console.error('Process queue error:', error);
        res.status(500).json({ error: 'Failed to process notification queue' });
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map