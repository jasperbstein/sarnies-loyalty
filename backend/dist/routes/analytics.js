"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Track events (batch endpoint)
router.post('/events', async (req, res) => {
    try {
        const { events } = req.body;
        if (!events || !Array.isArray(events)) {
            return res.status(400).json({ error: 'Invalid events array' });
        }
        // Insert events into database
        for (const event of events.slice(0, 100)) { // Limit to 100 events per request
            await (0, database_1.query)(`
        INSERT INTO analytics_events (event_name, properties, user_id, session_id, created_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [
                event.event,
                JSON.stringify(event.properties),
                event.properties?.user_id || null,
                event.properties?.session_id || null,
                new Date(event.timestamp || Date.now())
            ]);
        }
        res.json({ success: true, processed: events.length });
    }
    catch (error) {
        console.error('Track events error:', error);
        res.status(500).json({ error: 'Failed to track events' });
    }
});
// Get analytics summary (admin only)
router.get('/summary', auth_1.authenticate, async (req, res) => {
    try {
        // Check if admin
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const { days = 7 } = req.query;
        const daysNum = Math.min(parseInt(days, 10) || 7, 90);
        // Get event counts - using parameterized interval
        const eventsResult = await (0, database_1.query)(`
      SELECT
        event_name,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT session_id) as sessions
      FROM analytics_events
      WHERE created_at > NOW() - ($1 || ' days')::interval
      GROUP BY event_name
      ORDER BY count DESC
    `, [daysNum]);
        // Get daily active users
        const dauResult = await (0, database_1.query)(`
      SELECT
        DATE(created_at) as date,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT session_id) as sessions,
        COUNT(*) as events
      FROM analytics_events
      WHERE created_at > NOW() - ($1 || ' days')::interval
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [daysNum]);
        // Get top pages
        const pagesResult = await (0, database_1.query)(`
      SELECT
        properties->>'page_name' as page,
        COUNT(*) as views,
        COUNT(DISTINCT user_id) as unique_users
      FROM analytics_events
      WHERE event_name = 'page_view'
        AND created_at > NOW() - ($1 || ' days')::interval
      GROUP BY properties->>'page_name'
      ORDER BY views DESC
      LIMIT 20
    `, [daysNum]);
        res.json({
            period_days: daysNum,
            events_by_type: eventsResult.rows,
            daily_stats: dauResult.rows,
            top_pages: pagesResult.rows
        });
    }
    catch (error) {
        console.error('Get analytics summary error:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});
// Get user activity (admin only)
router.get('/user/:userId', auth_1.authenticate, async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const { userId } = req.params;
        const { limit = 50 } = req.query;
        const result = await (0, database_1.query)(`
      SELECT
        event_name,
        properties,
        session_id,
        created_at
      FROM analytics_events
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, Math.min(parseInt(limit, 10) || 50, 200)]);
        res.json({
            user_id: userId,
            events: result.rows,
            total: result.rowCount
        });
    }
    catch (error) {
        console.error('Get user analytics error:', error);
        res.status(500).json({ error: 'Failed to get user analytics' });
    }
});
exports.default = router;
//# sourceMappingURL=analytics.js.map