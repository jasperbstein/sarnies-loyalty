"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const auditLog_1 = require("../utils/auditLog");
const router = (0, express_1.Router)();
/**
 * GET /api/announcements
 * Returns active announcements ordered by display_order
 * Optional query param: user_type (filters announcements by target user type)
 */
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const userType = req.query.user_type || 'customer';
        const now = new Date();
        const result = await (0, database_1.query)(`SELECT * FROM announcements
       WHERE is_active = true
         AND (start_date IS NULL OR start_date <= $1)
         AND (end_date IS NULL OR end_date >= $1)
         AND ($3 = ANY(target_user_types) OR target_user_types IS NULL)
       ORDER BY display_order ASC, created_at DESC
       LIMIT $2`, [now, limit, userType]);
        res.json({ announcements: result.rows });
    }
    catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});
/**
 * GET /api/announcements/all
 * Returns all announcements for admin/staff management (Staff & Admin)
 */
router.get('/all', auth_1.authenticate, async (req, res) => {
    try {
        const result = await (0, database_1.query)(`SELECT * FROM announcements
       ORDER BY display_order ASC, created_at DESC`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching all announcements:', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});
/**
 * GET /api/announcements/:id
 * Returns a single announcement by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await (0, database_1.query)(`SELECT * FROM announcements WHERE id = $1`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        res.json({ announcement: result.rows[0] });
    }
    catch (error) {
        console.error('Error fetching announcement:', error);
        res.status(500).json({ error: 'Failed to fetch announcement' });
    }
});
/**
 * POST /api/announcements
 * Create a new announcement (Admin only)
 */
router.post('/', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { title, description, image_url, announcement_type, cta_text, cta_link, is_active, display_order, start_date, end_date, target_user_types } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
        // Validate announcement_type if provided
        const validTypes = ['news', 'promotion', 'announcement', 'new_product', 'seasonal'];
        if (announcement_type && !validTypes.includes(announcement_type)) {
            return res.status(400).json({ error: 'Invalid announcement_type. Must be one of: ' + validTypes.join(', ') });
        }
        const result = await (0, database_1.query)(`INSERT INTO announcements (
        title, description, image_url, announcement_type, cta_text, cta_link,
        is_active, display_order, start_date, end_date, target_user_types
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`, [
            title,
            description || null,
            image_url || null,
            announcement_type || 'news',
            cta_text || null,
            cta_link || null,
            is_active ?? true,
            display_order || 0,
            start_date || null,
            end_date || null,
            target_user_types || ['customer', 'employee', 'staff', 'investor', 'media']
        ]);
        const newAnnouncement = result.rows[0];
        // Audit log
        await (0, auditLog_1.logAnnouncementAction)(req, 'create', newAnnouncement.id, newAnnouncement.title, {
            after: newAnnouncement
        });
        res.status(201).json(newAnnouncement);
    }
    catch (error) {
        console.error('Create announcement error:', error);
        res.status(500).json({ error: 'Failed to create announcement' });
    }
});
/**
 * PATCH /api/announcements/:id
 * Update an announcement (Admin only)
 */
router.patch('/:id', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Get current announcement for audit trail
        const oldAnnouncementResult = await (0, database_1.query)('SELECT * FROM announcements WHERE id = $1', [id]);
        if (oldAnnouncementResult.rows.length === 0) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        const oldAnnouncement = oldAnnouncementResult.rows[0];
        const { title, description, image_url, announcement_type, cta_text, cta_link, is_active, display_order, start_date, end_date, target_user_types } = req.body;
        const updates = [];
        const values = [];
        let paramCount = 1;
        if (title !== undefined) {
            updates.push(`title = $${paramCount++}`);
            values.push(title);
        }
        if (description !== undefined) {
            updates.push(`description = $${paramCount++}`);
            values.push(description);
        }
        if (image_url !== undefined) {
            updates.push(`image_url = $${paramCount++}`);
            values.push(image_url || null);
        }
        if (announcement_type !== undefined) {
            updates.push(`announcement_type = $${paramCount++}`);
            values.push(announcement_type);
        }
        if (cta_text !== undefined) {
            updates.push(`cta_text = $${paramCount++}`);
            values.push(cta_text || null);
        }
        if (cta_link !== undefined) {
            updates.push(`cta_link = $${paramCount++}`);
            values.push(cta_link || null);
        }
        if (is_active !== undefined) {
            updates.push(`is_active = $${paramCount++}`);
            values.push(is_active);
        }
        if (display_order !== undefined) {
            updates.push(`display_order = $${paramCount++}`);
            values.push(display_order);
        }
        if (start_date !== undefined) {
            updates.push(`start_date = $${paramCount++}`);
            values.push(start_date || null);
        }
        if (end_date !== undefined) {
            updates.push(`end_date = $${paramCount++}`);
            values.push(end_date || null);
        }
        if (target_user_types !== undefined) {
            updates.push(`target_user_types = $${paramCount++}`);
            values.push(target_user_types);
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        values.push(id);
        const result = await (0, database_1.query)(`UPDATE announcements SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        const updatedAnnouncement = result.rows[0];
        // Audit log
        await (0, auditLog_1.logAnnouncementAction)(req, 'update', updatedAnnouncement.id, updatedAnnouncement.title, {
            before: oldAnnouncement,
            after: updatedAnnouncement
        });
        res.json(updatedAnnouncement);
    }
    catch (error) {
        console.error('Update announcement error:', error);
        res.status(500).json({ error: 'Failed to update announcement' });
    }
});
/**
 * DELETE /api/announcements/:id
 * Delete an announcement (Admin only)
 */
router.delete('/:id', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Get announcement details before deleting for audit trail
        const announcementResult = await (0, database_1.query)('SELECT * FROM announcements WHERE id = $1', [id]);
        if (announcementResult.rows.length === 0) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        const deletedAnnouncement = announcementResult.rows[0];
        const result = await (0, database_1.query)(`DELETE FROM announcements WHERE id = $1 RETURNING id`, [id]);
        // Audit log
        await (0, auditLog_1.logAnnouncementAction)(req, 'delete', deletedAnnouncement.id, deletedAnnouncement.title, {
            before: deletedAnnouncement
        });
        res.json({ message: 'Announcement deleted successfully', id: result.rows[0].id });
    }
    catch (error) {
        console.error('Delete announcement error:', error);
        res.status(500).json({ error: 'Failed to delete announcement' });
    }
});
exports.default = router;
//# sourceMappingURL=announcements.js.map