import express, { Request, Response } from 'express';
import { query } from '../db/database';
import { authenticate, requireAdmin } from '../middleware/auth';
import { logSettingChange } from '../utils/auditLog';

const router = express.Router();

// GET /api/settings/tiers - Get tier configuration (public endpoint for frontend)
router.get('/tiers', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT setting_key, setting_value, setting_type
       FROM app_settings
       WHERE setting_key IN (
         'tier_bronze_threshold',
         'tier_silver_threshold',
         'tier_gold_threshold',
         'tier_platinum_threshold'
       )`
    );

    // Build tier thresholds object with defaults
    const thresholds: { [key: string]: number } = {
      bronze: 0,
      silver: 1000,
      gold: 2000,
      platinum: 3000,
    };

    result.rows.forEach((row) => {
      const value = parseFloat(row.setting_value) || 0;
      switch (row.setting_key) {
        case 'tier_bronze_threshold':
          thresholds.bronze = value;
          break;
        case 'tier_silver_threshold':
          thresholds.silver = value;
          break;
        case 'tier_gold_threshold':
          thresholds.gold = value;
          break;
        case 'tier_platinum_threshold':
          thresholds.platinum = value;
          break;
      }
    });

    res.json(thresholds);
  } catch (error) {
    console.error('Error fetching tier settings:', error);
    res.status(500).json({ error: 'Failed to fetch tier settings' });
  }
});

// GET /api/settings/admin - Get admin system configuration (admin only)
router.get('/admin', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT setting_key, setting_value, setting_type
       FROM app_settings
       WHERE setting_key IN (
         'points_per_100_thb',
         'qr_token_expiry_seconds',
         'otp_expiry_minutes'
       )`
    );

    // Build config object with defaults
    const config: { [key: string]: { label: string; value: string } } = {
      points: {
        label: 'Points per 100 THB',
        value: '1 point',
      },
      qrExpiry: {
        label: 'QR token expiry',
        value: '120 seconds',
      },
      otpExpiry: {
        label: 'OTP expiry',
        value: '5 minutes',
      },
    };

    result.rows.forEach((row) => {
      switch (row.setting_key) {
        case 'points_per_100_thb':
          const points = parseFloat(row.setting_value) || 1;
          config.points.value = `${points} point${points !== 1 ? 's' : ''}`;
          break;
        case 'qr_token_expiry_seconds':
          const qrSeconds = parseInt(row.setting_value) || 120;
          config.qrExpiry.value = `${qrSeconds} seconds`;
          break;
        case 'otp_expiry_minutes':
          const otpMinutes = parseInt(row.setting_value) || 5;
          config.otpExpiry.value = `${otpMinutes} minute${otpMinutes !== 1 ? 's' : ''}`;
          break;
      }
    });

    // Return as array format expected by SystemConfigPanel
    const rows = [
      { id: 'points', label: config.points.label, value: config.points.value },
      { id: 'qrExpiry', label: config.qrExpiry.label, value: config.qrExpiry.value },
      { id: 'otpExpiry', label: config.otpExpiry.label, value: config.otpExpiry.value },
    ];

    res.json(rows);
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    res.status(500).json({ error: 'Failed to fetch admin settings' });
  }
});

// GET /api/settings - Get all settings (requires authentication)
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT setting_key, setting_value, setting_type, description, is_editable
       FROM app_settings
       ORDER BY setting_key`
    );

    // Convert array to object for easier access
    const settings: { [key: string]: any } = {};
    result.rows.forEach((row) => {
      let value = row.setting_value;

      // Type conversion
      if (row.setting_type === 'number' && value !== null) {
        value = parseFloat(value);
      } else if (row.setting_type === 'boolean' && value !== null) {
        value = value.toLowerCase() === 'true';
      }

      settings[row.setting_key] = {
        value,
        type: row.setting_type,
        description: row.description,
        editable: row.is_editable,
      };
    });

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// GET /api/settings/:key - Get single setting
router.get('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    const result = await query(
      `SELECT setting_key, setting_value, setting_type, description, is_editable
       FROM app_settings
       WHERE setting_key = $1`,
      [key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    const row = result.rows[0];
    let value = row.setting_value;

    // Type conversion
    if (row.setting_type === 'number' && value !== null) {
      value = parseFloat(value);
    } else if (row.setting_type === 'boolean' && value !== null) {
      value = value.toLowerCase() === 'true';
    }

    res.json({
      key: row.setting_key,
      value,
      type: row.setting_type,
      description: row.description,
      editable: row.is_editable,
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// PUT /api/settings/:key - Update single setting (admin only)
router.put('/:key', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    // Validate that value is provided
    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    // Check if setting exists and is editable, and get old value
    const checkResult = await query(
      `SELECT setting_type, is_editable, setting_value FROM app_settings WHERE setting_key = $1`,
      [key]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    if (!checkResult.rows[0].is_editable) {
      return res.status(403).json({ error: 'This setting is not editable' });
    }

    const settingType = checkResult.rows[0].setting_type;
    const oldValue = checkResult.rows[0].setting_value;

    // Type validation
    let stringValue = value === null ? null : String(value);

    if (settingType === 'number' && value !== null) {
      if (isNaN(parseFloat(value))) {
        return res.status(400).json({ error: 'Value must be a number' });
      }
    } else if (settingType === 'boolean' && value !== null) {
      if (typeof value !== 'boolean') {
        return res.status(400).json({ error: 'Value must be a boolean' });
      }
      stringValue = value ? 'true' : 'false';
    } else if (settingType === 'color' && value !== null) {
      // Basic hex color validation
      if (!/^#[0-9A-F]{6}$/i.test(value)) {
        return res.status(400).json({ error: 'Value must be a valid hex color (e.g., #FF0000)' });
      }
    }

    // Update setting
    await query(
      `UPDATE app_settings SET setting_value = $1 WHERE setting_key = $2`,
      [stringValue, key]
    );

    // Log audit trail
    await logSettingChange(req, key, oldValue, stringValue);

    res.json({ success: true, key, value });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// PUT /api/settings/bulk - Bulk update settings (admin only)
router.put('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { settings } = req.body; // { key: value, key2: value2, ... }

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Invalid settings object' });
    }

    const updated: string[] = [];
    const failed: string[] = [];

    for (const [key, value] of Object.entries(settings)) {
      try {
        // Check if setting exists and is editable
        const checkResult = await query(
          `SELECT setting_type, is_editable FROM app_settings WHERE setting_key = $1`,
          [key]
        );

        if (checkResult.rows.length === 0) {
          failed.push(key);
          continue;
        }

        if (!checkResult.rows[0].is_editable) {
          failed.push(key);
          continue;
        }

        const settingType = checkResult.rows[0].setting_type;
        let stringValue = value === null ? null : String(value);

        // Type validation and conversion
        if (settingType === 'number' && value !== null) {
          if (isNaN(parseFloat(String(value)))) {
            failed.push(key);
            continue;
          }
        } else if (settingType === 'boolean' && value !== null) {
          if (typeof value !== 'boolean') {
            failed.push(key);
            continue;
          }
          stringValue = value ? 'true' : 'false';
        } else if (settingType === 'color' && value !== null) {
          if (!/^#[0-9A-F]{6}$/i.test(String(value))) {
            failed.push(key);
            continue;
          }
        }

        // Update setting
        await query(
          `UPDATE app_settings SET setting_value = $1 WHERE setting_key = $2`,
          [stringValue, key]
        );

        updated.push(key);
      } catch (error) {
        console.error(`Error updating setting ${key}:`, error);
        failed.push(key);
      }
    }

    res.json({
      success: true,
      updated: updated.length,
      failed: failed.length,
      updated_keys: updated,
      failed_keys: failed,
    });
  } catch (error) {
    console.error('Error bulk updating settings:', error);
    res.status(500).json({ error: 'Failed to bulk update settings' });
  }
});

// POST /api/settings - Create new setting (admin only)
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { key, value, type, description, editable } = req.body;

    if (!key || !type) {
      return res.status(400).json({ error: 'key and type are required' });
    }

    const stringValue = value === null ? null : String(value);

    await query(
      `INSERT INTO app_settings (setting_key, setting_value, setting_type, description, is_editable)
       VALUES ($1, $2, $3, $4, $5)`,
      [key, stringValue, type, description || null, editable !== false]
    );

    res.status(201).json({ success: true, key });
  } catch (error: any) {
    if (error.code === '23505') {
      // Unique constraint violation
      return res.status(409).json({ error: 'Setting key already exists' });
    }
    console.error('Error creating setting:', error);
    res.status(500).json({ error: 'Failed to create setting' });
  }
});

export default router;
