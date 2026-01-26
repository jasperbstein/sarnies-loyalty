"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const passwordValidator_1 = require("../utils/passwordValidator");
const auditLog_1 = require("../utils/auditLog");
const router = (0, express_1.Router)();
// Get all staff users (admin only)
router.get('/', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const result = await (0, database_1.query)('SELECT id, email, name, role, active, created_at FROM staff_users ORDER BY created_at DESC');
        res.json({ staff: result.rows });
    }
    catch (error) {
        console.error('Get staff error:', error);
        res.status(500).json({ error: 'Failed to fetch staff users' });
    }
});
// Create new staff user (admin only)
router.post('/', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { email, password, name, role } = req.body;
        if (!email || !password || !name || !role) {
            return res.status(400).json({ error: 'Email, password, name, and role are required' });
        }
        // Validate role
        if (!['admin', 'staff'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be either "admin" or "staff"' });
        }
        // Validate password strength
        const passwordValidation = (0, passwordValidator_1.validatePasswordStrength)(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                error: 'Password does not meet security requirements',
                details: passwordValidation.errors
            });
        }
        // Check if email already exists
        const existingUser = await (0, database_1.query)('SELECT id FROM staff_users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }
        // Hash password
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        // Create staff user
        const result = await (0, database_1.query)(`INSERT INTO staff_users (email, password_hash, name, role, active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, email, name, role, active, created_at`, [email, passwordHash, name, role]);
        const newStaff = result.rows[0];
        // Log audit trail
        await (0, auditLog_1.logStaffAction)(req, 'create', newStaff.id, newStaff.email, {
            after: newStaff
        });
        res.status(201).json({ staff: newStaff });
    }
    catch (error) {
        console.error('Create staff error:', error);
        res.status(500).json({ error: 'Failed to create staff user' });
    }
});
// Update staff user (admin only)
router.put('/:id', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role, active } = req.body;
        // Get old staff data for audit trail
        const oldStaffResult = await (0, database_1.query)('SELECT id, email, name, role, active FROM staff_users WHERE id = $1', [id]);
        if (oldStaffResult.rows.length === 0) {
            return res.status(404).json({ error: 'Staff user not found' });
        }
        const oldStaff = oldStaffResult.rows[0];
        const updates = [];
        const values = [];
        let paramCount = 1;
        if (name !== undefined) {
            updates.push(`name = $${paramCount++}`);
            values.push(name);
        }
        if (role !== undefined) {
            updates.push(`role = $${paramCount++}`);
            values.push(role);
        }
        if (active !== undefined) {
            updates.push(`active = $${paramCount++}`);
            values.push(active);
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        values.push(id);
        const result = await (0, database_1.query)(`UPDATE staff_users
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, email, name, role, active, created_at`, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Staff user not found' });
        }
        const updatedStaff = result.rows[0];
        // Log audit trail
        await (0, auditLog_1.logStaffAction)(req, 'update', updatedStaff.id, updatedStaff.email, {
            before: oldStaff,
            after: updatedStaff
        });
        res.json({ staff: updatedStaff });
    }
    catch (error) {
        console.error('Update staff error:', error);
        res.status(500).json({ error: 'Failed to update staff user' });
    }
});
// Change password
router.post('/:id/change-password', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;
        // Staff can only change their own password unless they're admin
        if (req.user?.type !== 'staff' || (req.user.id !== parseInt(id) && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        // Validate new password strength
        const passwordValidation = (0, passwordValidator_1.validatePasswordStrength)(newPassword);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                error: 'Password does not meet security requirements',
                details: passwordValidation.errors
            });
        }
        // Get current staff user
        const staffResult = await (0, database_1.query)('SELECT * FROM staff_users WHERE id = $1', [id]);
        if (staffResult.rows.length === 0) {
            return res.status(404).json({ error: 'Staff user not found' });
        }
        const staff = staffResult.rows[0];
        // Verify current password
        const validPassword = await bcrypt_1.default.compare(currentPassword, staff.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        // Hash new password
        const newPasswordHash = await bcrypt_1.default.hash(newPassword, 10);
        // Update password
        await (0, database_1.query)('UPDATE staff_users SET password_hash = $1 WHERE id = $2', [newPasswordHash, id]);
        // Log audit trail
        await (0, auditLog_1.logStaffAction)(req, 'update', staff.id, staff.email, {
            before: { password_hash: staff.password_hash },
            after: { password_hash: newPasswordHash }
        });
        res.json({ message: 'Password changed successfully' });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});
// Reset password (admin only)
router.post('/:id/reset-password', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        if (!newPassword) {
            return res.status(400).json({ error: 'New password is required' });
        }
        // Validate new password strength
        const passwordValidation = (0, passwordValidator_1.validatePasswordStrength)(newPassword);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                error: 'Password does not meet security requirements',
                details: passwordValidation.errors
            });
        }
        // Check if staff user exists
        const staffResult = await (0, database_1.query)('SELECT * FROM staff_users WHERE id = $1', [id]);
        if (staffResult.rows.length === 0) {
            return res.status(404).json({ error: 'Staff user not found' });
        }
        const staff = staffResult.rows[0];
        // Hash new password
        const newPasswordHash = await bcrypt_1.default.hash(newPassword, 10);
        // Update password
        await (0, database_1.query)('UPDATE staff_users SET password_hash = $1 WHERE id = $2', [newPasswordHash, id]);
        // Log audit trail (admin reset)
        await (0, auditLog_1.logStaffAction)(req, 'update', staff.id, staff.email, {
            before: { password_hash: staff.password_hash },
            after: { password_hash: newPasswordHash }
        });
        res.json({ message: 'Password reset successfully' });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});
// Delete staff user (admin only)
router.delete('/:id', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Get staff data before deletion for audit trail
        const staffResult = await (0, database_1.query)('SELECT id, email, name, role, active FROM staff_users WHERE id = $1', [id]);
        if (staffResult.rows.length === 0) {
            return res.status(404).json({ error: 'Staff user not found' });
        }
        const deletedStaff = staffResult.rows[0];
        // Soft delete by deactivating
        await (0, database_1.query)('UPDATE staff_users SET active = false WHERE id = $1', [id]);
        // Log audit trail
        await (0, auditLog_1.logStaffAction)(req, 'delete', deletedStaff.id, deletedStaff.email, {
            before: deletedStaff
        });
        res.json({ message: 'Staff user deactivated successfully' });
    }
    catch (error) {
        console.error('Delete staff error:', error);
        res.status(500).json({ error: 'Failed to delete staff user' });
    }
});
exports.default = router;
//# sourceMappingURL=staff.js.map