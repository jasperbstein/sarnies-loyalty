"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
}
// GET /api/outlets - Get all active outlets
router.get('/', async (req, res) => {
    try {
        const result = await (0, database_1.query)('SELECT * FROM outlets WHERE is_active = true ORDER BY name ASC');
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching outlets:', error);
        res.status(500).json({ error: 'Failed to fetch outlets' });
    }
});
// GET /api/outlets/nearby - Get outlets near user location
router.get('/nearby', async (req, res) => {
    try {
        const { latitude, longitude, radius = 5000 } = req.query;
        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Latitude and longitude required' });
        }
        const userLat = parseFloat(latitude);
        const userLon = parseFloat(longitude);
        const searchRadius = parseInt(radius);
        // Get all active outlets
        const result = await (0, database_1.query)('SELECT * FROM outlets WHERE is_active = true');
        // Calculate distance and filter by radius
        const outletsWithDistance = result.rows
            .map((outlet) => ({
            ...outlet,
            distance: calculateDistance(userLat, userLon, parseFloat(outlet.latitude), parseFloat(outlet.longitude)),
        }))
            .filter((outlet) => outlet.distance <= searchRadius)
            .sort((a, b) => a.distance - b.distance);
        res.json(outletsWithDistance);
    }
    catch (error) {
        console.error('Error fetching nearby outlets:', error);
        res.status(500).json({ error: 'Failed to fetch nearby outlets' });
    }
});
// GET /api/outlets/:id - Get single outlet
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await (0, database_1.query)('SELECT * FROM outlets WHERE id = $1 AND is_active = true', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Outlet not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error fetching outlet:', error);
        res.status(500).json({ error: 'Failed to fetch outlet' });
    }
});
// PUT /api/outlets/:userId/location - Update user location preferences
router.put('/:userId/location', auth_1.authenticate, async (req, res) => {
    try {
        const { userId } = req.params;
        const { latitude, longitude, location_enabled, notification_enabled } = req.body;
        const result = await (0, database_1.query)(`UPDATE users
       SET last_known_latitude = $1,
           last_known_longitude = $2,
           location_enabled = COALESCE($3, location_enabled),
           notification_enabled = COALESCE($4, notification_enabled),
           last_location_update = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, location_enabled, notification_enabled`, [latitude, longitude, location_enabled, notification_enabled, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error updating user location:', error);
        res.status(500).json({ error: 'Failed to update location' });
    }
});
exports.default = router;
//# sourceMappingURL=outlets.js.map