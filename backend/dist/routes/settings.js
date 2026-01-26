"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const auditLog_1 = require("../utils/auditLog");
const router = express_1.default.Router();
// GET /api/settings - Get all settings (requires authentication)
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const result = await (0, database_1.query)(`SELECT setting_key, setting_value, setting_type, description, is_editable
       FROM app_settings
       ORDER BY setting_key`);
        // Convert array to object for easier access
        const settings = {};
        result.rows.forEach((row) => {
            let value = row.setting_value;
            // Type conversion
            if (row.setting_type === 'number' && value !== null) {
                value = parseFloat(value);
            }
            else if (row.setting_type === 'boolean' && value !== null) {
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
    }
    catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});
// GET /api/settings/:key - Get single setting
router.get('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const result = await (0, database_1.query)(`SELECT setting_key, setting_value, setting_type, description, is_editable
       FROM app_settings
       WHERE setting_key = $1`, [key]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Setting not found' });
        }
        const row = result.rows[0];
        let value = row.setting_value;
        // Type conversion
        if (row.setting_type === 'number' && value !== null) {
            value = parseFloat(value);
        }
        else if (row.setting_type === 'boolean' && value !== null) {
            value = value.toLowerCase() === 'true';
        }
        res.json({
            key: row.setting_key,
            value,
            type: row.setting_type,
            description: row.description,
            editable: row.is_editable,
        });
    }
    catch (error) {
        console.error('Error fetching setting:', error);
        res.status(500).json({ error: 'Failed to fetch setting' });
    }
});
// PUT /api/settings/:key - Update single setting (admin only)
router.put('/:key', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        // Validate that value is provided
        if (value === undefined) {
            return res.status(400).json({ error: 'Value is required' });
        }
        // Check if setting exists and is editable, and get old value
        const checkResult = await (0, database_1.query)(`SELECT setting_type, is_editable, setting_value FROM app_settings WHERE setting_key = $1`, [key]);
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
        }
        else if (settingType === 'boolean' && value !== null) {
            if (typeof value !== 'boolean') {
                return res.status(400).json({ error: 'Value must be a boolean' });
            }
            stringValue = value ? 'true' : 'false';
        }
        else if (settingType === 'color' && value !== null) {
            // Basic hex color validation
            if (!/^#[0-9A-F]{6}$/i.test(value)) {
                return res.status(400).json({ error: 'Value must be a valid hex color (e.g., #FF0000)' });
            }
        }
        // Update setting
        await (0, database_1.query)(`UPDATE app_settings SET setting_value = $1 WHERE setting_key = $2`, [stringValue, key]);
        // Log audit trail
        await (0, auditLog_1.logSettingChange)(req, key, oldValue, stringValue);
        res.json({ success: true, key, value });
    }
    catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({ error: 'Failed to update setting' });
    }
});
// PUT /api/settings/bulk - Bulk update settings (admin only)
router.put('/', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { settings } = req.body; // { key: value, key2: value2, ... }
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ error: 'Invalid settings object' });
        }
        const updated = [];
        const failed = [];
        for (const [key, value] of Object.entries(settings)) {
            try {
                // Check if setting exists and is editable
                const checkResult = await (0, database_1.query)(`SELECT setting_type, is_editable FROM app_settings WHERE setting_key = $1`, [key]);
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
                }
                else if (settingType === 'boolean' && value !== null) {
                    if (typeof value !== 'boolean') {
                        failed.push(key);
                        continue;
                    }
                    stringValue = value ? 'true' : 'false';
                }
                else if (settingType === 'color' && value !== null) {
                    if (!/^#[0-9A-F]{6}$/i.test(String(value))) {
                        failed.push(key);
                        continue;
                    }
                }
                // Update setting
                await (0, database_1.query)(`UPDATE app_settings SET setting_value = $1 WHERE setting_key = $2`, [stringValue, key]);
                updated.push(key);
            }
            catch (error) {
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
    }
    catch (error) {
        console.error('Error bulk updating settings:', error);
        res.status(500).json({ error: 'Failed to bulk update settings' });
    }
});
// POST /api/settings - Create new setting (admin only)
router.post('/', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { key, value, type, description, editable } = req.body;
        if (!key || !type) {
            return res.status(400).json({ error: 'key and type are required' });
        }
        const stringValue = value === null ? null : String(value);
        await (0, database_1.query)(`INSERT INTO app_settings (setting_key, setting_value, setting_type, description, is_editable)
       VALUES ($1, $2, $3, $4, $5)`, [key, stringValue, type, description || null, editable !== false]);
        res.status(201).json({ success: true, key });
    }
    catch (error) {
        if (error.code === '23505') {
            // Unique constraint violation
            return res.status(409).json({ error: 'Setting key already exists' });
        }
        console.error('Error creating setting:', error);
        res.status(500).json({ error: 'Failed to create setting' });
    }
});
exports.default = router;
//# sourceMappingURL=settings.js.map