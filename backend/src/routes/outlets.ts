import { Router, Response } from 'express';
import { query } from '../db/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Haversine formula to calculate distance between two coordinates
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// GET /api/outlets - Get all active outlets
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM outlets WHERE is_active = true ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching outlets:', error);
    res.status(500).json({ error: 'Failed to fetch outlets' });
  }
});

// GET /api/outlets/nearby - Get outlets near user location
router.get('/nearby', async (req: AuthRequest, res: Response) => {
  try {
    const { latitude, longitude, radius = 5000 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    const userLat = parseFloat(latitude as string);
    const userLon = parseFloat(longitude as string);
    const searchRadius = parseInt(radius as string);

    // Get all active outlets
    const result = await query(
      'SELECT * FROM outlets WHERE is_active = true'
    );

    // Calculate distance and filter by radius
    const outletsWithDistance = result.rows
      .map((outlet: any) => ({
        ...outlet,
        distance: calculateDistance(
          userLat,
          userLon,
          parseFloat(outlet.latitude),
          parseFloat(outlet.longitude)
        ),
      }))
      .filter((outlet: any) => outlet.distance <= searchRadius)
      .sort((a: any, b: any) => a.distance - b.distance);

    res.json(outletsWithDistance);
  } catch (error) {
    console.error('Error fetching nearby outlets:', error);
    res.status(500).json({ error: 'Failed to fetch nearby outlets' });
  }
});

// GET /api/outlets/:id - Get single outlet
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT * FROM outlets WHERE id = $1 AND is_active = true',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Outlet not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching outlet:', error);
    res.status(500).json({ error: 'Failed to fetch outlet' });
  }
});

// ========== ADMIN ROUTES ==========

// GET /api/outlets/admin/all - Get all outlets (including inactive) for admin
router.get('/admin/all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await query(
      'SELECT * FROM outlets ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all outlets:', error);
    res.status(500).json({ error: 'Failed to fetch outlets' });
  }
});

// POST /api/outlets - Create new outlet (admin only)
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, address, latitude, longitude, phone, opening_hours, notification_radius_meters } = req.body;

    if (!name || !address || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Name, address, latitude, and longitude are required' });
    }

    const result = await query(
      `INSERT INTO outlets (name, address, latitude, longitude, phone, opening_hours, notification_radius_meters, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING *`,
      [name, address, latitude, longitude, phone || null, opening_hours || null, notification_radius_meters || 500]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating outlet:', error);
    res.status(500).json({ error: 'Failed to create outlet' });
  }
});

// PUT /api/outlets/:id - Update outlet (admin only)
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if it's the user location update route
    if (id === 'location' || req.params.id?.includes('location')) {
      return res.status(400).json({ error: 'Invalid outlet ID' });
    }

    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, address, latitude, longitude, phone, opening_hours, notification_radius_meters, is_active } = req.body;

    const result = await query(
      `UPDATE outlets
       SET name = COALESCE($1, name),
           address = COALESCE($2, address),
           latitude = COALESCE($3, latitude),
           longitude = COALESCE($4, longitude),
           phone = COALESCE($5, phone),
           opening_hours = COALESCE($6, opening_hours),
           notification_radius_meters = COALESCE($7, notification_radius_meters),
           is_active = COALESCE($8, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [name, address, latitude, longitude, phone, opening_hours, notification_radius_meters, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Outlet not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating outlet:', error);
    res.status(500).json({ error: 'Failed to update outlet' });
  }
});

// DELETE /api/outlets/:id - Delete outlet (admin only)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await query(
      'DELETE FROM outlets WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Outlet not found' });
    }

    res.json({ message: 'Outlet deleted successfully' });
  } catch (error) {
    console.error('Error deleting outlet:', error);
    res.status(500).json({ error: 'Failed to delete outlet' });
  }
});

// PUT /api/outlets/:userId/location - Update user location preferences
// Users can only update their own location (authorization check)
router.put('/:userId/location', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { latitude, longitude, location_enabled, notification_enabled } = req.body;

    // Authorization check: users can only update their own location
    // Admins can update any user's location
    if (req.user?.id !== parseInt(userId) && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'You can only update your own location' });
    }

    // Validate coordinates if provided
    if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
      return res.status(400).json({ error: 'Invalid latitude. Must be between -90 and 90' });
    }
    if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
      return res.status(400).json({ error: 'Invalid longitude. Must be between -180 and 180' });
    }

    const result = await query(
      `UPDATE users
       SET last_known_latitude = $1,
           last_known_longitude = $2,
           location_enabled = COALESCE($3, location_enabled),
           notification_enabled = COALESCE($4, notification_enabled),
           last_location_update = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, location_enabled, notification_enabled`,
      [latitude, longitude, location_enabled, notification_enabled, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

export default router;
