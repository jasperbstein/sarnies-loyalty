import { Router, Response } from 'express';
import { query } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const router = Router();

// Get all POS API keys (admin only)
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT
        pak.id,
        pak.name,
        pak.api_key_prefix,
        pak.is_active,
        pak.last_used_at,
        pak.total_transactions,
        pak.created_at,
        pak.revoked_at,
        o.name as outlet_name,
        su.name as created_by_name
      FROM pos_api_keys pak
      LEFT JOIN outlets o ON pak.outlet_id = o.id
      LEFT JOIN staff_users su ON pak.created_by_staff_id = su.id
      ORDER BY pak.created_at DESC
    `);

    res.json({ apiKeys: result.rows });
  } catch (error) {
    console.error('Error fetching POS API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// Create new POS API key (admin only)
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { name, outlet_id } = req.body;
  const staffId = req.user?.id;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    // Generate API key
    const apiKey = 'sk_live_' + crypto.randomBytes(32).toString('hex');
    const apiKeyPrefix = apiKey.substring(0, 12);
    const apiKeyHash = await bcrypt.hash(apiKey, 10);

    const result = await query(`
      INSERT INTO pos_api_keys (name, outlet_id, api_key_hash, api_key_prefix, created_by_staff_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, api_key_prefix, is_active, created_at
    `, [name, outlet_id || null, apiKeyHash, apiKeyPrefix, staffId]);

    // Return the full API key only on creation (won't be retrievable again)
    res.status(201).json({
      apiKey: {
        ...result.rows[0],
        api_key: apiKey // Only returned on creation!
      },
      message: 'API key created. Save this key securely - it cannot be retrieved again.'
    });
  } catch (error) {
    console.error('Error creating POS API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// Revoke POS API key (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const result = await query(`
      UPDATE pos_api_keys
      SET is_active = false, revoked_at = NOW()
      WHERE id = $1
      RETURNING id, name, revoked_at
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({ message: 'API key revoked', apiKey: result.rows[0] });
  } catch (error) {
    console.error('Error revoking POS API key:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

// Reactivate POS API key (admin only)
router.post('/:id/reactivate', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const result = await query(`
      UPDATE pos_api_keys
      SET is_active = true, revoked_at = NULL
      WHERE id = $1
      RETURNING id, name, is_active
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({ message: 'API key reactivated', apiKey: result.rows[0] });
  } catch (error) {
    console.error('Error reactivating POS API key:', error);
    res.status(500).json({ error: 'Failed to reactivate API key' });
  }
});

export default router;
