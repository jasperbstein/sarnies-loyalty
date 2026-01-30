import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { validatePasswordStrength } from '../utils/passwordValidator';
import { logStaffAction } from '../utils/auditLog';

const router = Router();

// Get all staff users (admin only)
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { search, is_active, is_verified } = req.query;

    let sql = `
      SELECT s.id, s.email, s.name, s.role, s.branch, s.active, s.is_verified, s.verified_at,
             s.company_id, s.created_at, c.name as company_name
      FROM staff_users s
      LEFT JOIN companies c ON s.company_id = c.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (search) {
      conditions.push(`(s.name ILIKE $${paramCount} OR s.email ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    if (is_active !== undefined) {
      conditions.push(`s.active = $${paramCount}`);
      params.push(is_active === 'true');
      paramCount++;
    }

    if (is_verified !== undefined) {
      conditions.push(`s.is_verified = $${paramCount}`);
      params.push(is_verified === 'true');
      paramCount++;
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY s.created_at DESC';

    const result = await query(sql, params);

    res.json({ staff: result.rows, total: result.rowCount });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Failed to fetch staff users' });
  }
});

// Create new staff user (admin only)
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, role, branch } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Email, password, name, and role are required' });
    }

    // Validate role
    if (!['admin', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be either "admin" or "staff"' });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Password does not meet security requirements',
        details: passwordValidation.errors
      });
    }

    // Check if email already exists (case-insensitive)
    const existingUser = await query('SELECT id FROM staff_users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create staff user (admin-created accounts are auto-verified and active)
    const result = await query(
      `INSERT INTO staff_users (email, password_hash, name, role, branch, active, is_verified, verified_at)
       VALUES ($1, $2, $3, $4, $5, true, true, NOW())
       RETURNING id, email, name, role, branch, active, is_verified, created_at`,
      [email, passwordHash, name, role, branch || null]
    );

    const newStaff = result.rows[0];

    // Log audit trail
    await logStaffAction(req, 'create', newStaff.id, newStaff.email, {
      after: newStaff
    });

    res.status(201).json({ staff: newStaff });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ error: 'Failed to create staff user' });
  }
});

// Update staff user (admin only)
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, role, branch, active } = req.body;

    // Get old staff data for audit trail
    const oldStaffResult = await query('SELECT id, email, name, role, branch, active FROM staff_users WHERE id = $1', [id]);
    if (oldStaffResult.rows.length === 0) {
      return res.status(404).json({ error: 'Staff user not found' });
    }
    const oldStaff = oldStaffResult.rows[0];

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (role !== undefined) {
      // Validate role to prevent privilege escalation
      const validRoles = ['admin', 'staff'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
      }
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }
    if (branch !== undefined) {
      updates.push(`branch = $${paramCount++}`);
      values.push(branch);
    }
    if (active !== undefined) {
      updates.push(`active = $${paramCount++}`);
      values.push(active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const result = await query(
      `UPDATE staff_users
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, email, name, role, branch, active, is_verified, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Staff user not found' });
    }

    const updatedStaff = result.rows[0];

    // Log audit trail
    await logStaffAction(req, 'update', updatedStaff.id, updatedStaff.email, {
      before: oldStaff,
      after: updatedStaff
    });

    res.json({ staff: updatedStaff });
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ error: 'Failed to update staff user' });
  }
});

// Change password
router.post('/:id/change-password', authenticate, async (req: AuthRequest, res: Response) => {
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
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Password does not meet security requirements',
        details: passwordValidation.errors
      });
    }

    // Get current staff user
    const staffResult = await query('SELECT * FROM staff_users WHERE id = $1', [id]);
    if (staffResult.rows.length === 0) {
      return res.status(404).json({ error: 'Staff user not found' });
    }

    const staff = staffResult.rows[0];

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, staff.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await query('UPDATE staff_users SET password_hash = $1 WHERE id = $2', [newPasswordHash, id]);

    // Log audit trail
    await logStaffAction(req, 'update', staff.id, staff.email, {
      before: { password_hash: staff.password_hash },
      after: { password_hash: newPasswordHash }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Reset password (admin only)
router.post('/:id/reset-password', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Password does not meet security requirements',
        details: passwordValidation.errors
      });
    }

    // Check if staff user exists
    const staffResult = await query('SELECT * FROM staff_users WHERE id = $1', [id]);
    if (staffResult.rows.length === 0) {
      return res.status(404).json({ error: 'Staff user not found' });
    }

    const staff = staffResult.rows[0];

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await query('UPDATE staff_users SET password_hash = $1 WHERE id = $2', [newPasswordHash, id]);

    // Log audit trail (admin reset)
    await logStaffAction(req, 'update', staff.id, staff.email, {
      before: { password_hash: staff.password_hash },
      after: { password_hash: newPasswordHash }
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Delete staff user (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get staff data before deletion for audit trail
    const staffResult = await query('SELECT id, email, name, role, active FROM staff_users WHERE id = $1', [id]);
    if (staffResult.rows.length === 0) {
      return res.status(404).json({ error: 'Staff user not found' });
    }
    const deletedStaff = staffResult.rows[0];

    // Soft delete by deactivating
    await query('UPDATE staff_users SET active = false WHERE id = $1', [id]);

    // Log audit trail
    await logStaffAction(req, 'delete', deletedStaff.id, deletedStaff.email, {
      before: deletedStaff
    });

    res.json({ message: 'Staff user deactivated successfully' });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ error: 'Failed to delete staff user' });
  }
});

export default router;
