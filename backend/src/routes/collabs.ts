import { Router, Response } from 'express';
import { query, transaction } from '../db/database';
import { authenticate, requireAdmin, requireRole, AuthRequest } from '../middleware/auth';
import { generateQRToken, QR_TOKEN_EXPIRY_SECONDS } from '../utils/jwt';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

const router = Router();

// ============================================
// PARTNERSHIP MANAGEMENT (Admin only)
// ============================================

// Get all partner companies for current admin's company
router.get('/partners', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const adminCompanyId = req.user?.company_id;

    if (!adminCompanyId) {
      return res.status(400).json({ error: 'Admin must be associated with a company' });
    }

    const result = await query(`
      SELECT
        cp.id as partnership_id,
        cp.is_active,
        cp.created_at,
        CASE
          WHEN cp.company_a_id = $1 THEN c_b.id
          ELSE c_a.id
        END as partner_id,
        CASE
          WHEN cp.company_a_id = $1 THEN c_b.name
          ELSE c_a.name
        END as partner_name,
        CASE
          WHEN cp.company_a_id = $1 THEN c_b.logo_url
          ELSE c_a.logo_url
        END as partner_logo
      FROM company_partnerships cp
      JOIN companies c_a ON cp.company_a_id = c_a.id
      JOIN companies c_b ON cp.company_b_id = c_b.id
      WHERE (cp.company_a_id = $1 OR cp.company_b_id = $1)
      ORDER BY cp.created_at DESC
    `, [adminCompanyId]);

    res.json({ partners: result.rows });
  } catch (error) {
    console.error('Get partners error:', error);
    res.status(500).json({ error: 'Failed to fetch partners' });
  }
});

// Get available companies to partner with (not already partnered)
router.get('/partners/available', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const adminCompanyId = req.user?.company_id;

    if (!adminCompanyId) {
      return res.status(400).json({ error: 'Admin must be associated with a company' });
    }

    const result = await query(`
      SELECT c.id, c.name, c.logo_url
      FROM companies c
      WHERE c.id != $1
      AND c.id NOT IN (
        SELECT CASE
          WHEN cp.company_a_id = $1 THEN cp.company_b_id
          ELSE cp.company_a_id
        END
        FROM company_partnerships cp
        WHERE cp.company_a_id = $1 OR cp.company_b_id = $1
      )
      ORDER BY c.name ASC
    `, [adminCompanyId]);

    res.json({ companies: result.rows });
  } catch (error) {
    console.error('Get available partners error:', error);
    res.status(500).json({ error: 'Failed to fetch available companies' });
  }
});

// Add a partner company
router.post('/partners', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const adminCompanyId = req.user?.company_id;
    const staffId = req.user?.staff_id;
    const { partner_company_id } = req.body;

    if (!adminCompanyId) {
      return res.status(400).json({ error: 'Admin must be associated with a company' });
    }

    if (!partner_company_id) {
      return res.status(400).json({ error: 'Partner company ID is required' });
    }

    if (partner_company_id === adminCompanyId) {
      return res.status(400).json({ error: 'Cannot partner with your own company' });
    }

    // Check if partner company exists
    const companyCheck = await query('SELECT id, name FROM companies WHERE id = $1', [partner_company_id]);
    if (companyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Partner company not found' });
    }

    // Check if partnership already exists
    const existingCheck = await query(`
      SELECT id FROM company_partnerships
      WHERE (company_a_id = $1 AND company_b_id = $2)
         OR (company_a_id = $2 AND company_b_id = $1)
    `, [adminCompanyId, partner_company_id]);

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Partnership already exists' });
    }

    // Create partnership (always store with smaller ID first for consistency)
    const [smallerId, largerId] = adminCompanyId < partner_company_id
      ? [adminCompanyId, partner_company_id]
      : [partner_company_id, adminCompanyId];

    const result = await query(`
      INSERT INTO company_partnerships (company_a_id, company_b_id, created_by)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [smallerId, largerId, staffId]);

    res.status(201).json({
      partnership: result.rows[0],
      partner: companyCheck.rows[0]
    });
  } catch (error) {
    console.error('Add partner error:', error);
    res.status(500).json({ error: 'Failed to add partner' });
  }
});

// Remove/deactivate a partnership
router.delete('/partners/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminCompanyId = req.user?.company_id;

    if (!adminCompanyId) {
      return res.status(400).json({ error: 'Admin must be associated with a company' });
    }

    // Verify partnership belongs to admin's company
    const partnershipCheck = await query(`
      SELECT id FROM company_partnerships
      WHERE id = $1 AND (company_a_id = $2 OR company_b_id = $2)
    `, [id, adminCompanyId]);

    if (partnershipCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Partnership not found' });
    }

    // Soft delete by setting is_active to false
    await query(`
      UPDATE company_partnerships SET is_active = false WHERE id = $1
    `, [id]);

    // Also pause any active collab offers between these companies
    await query(`
      UPDATE collab_offers
      SET status = 'paused'
      WHERE status = 'active'
      AND id IN (
        SELECT co.id FROM collab_offers co
        JOIN company_partnerships cp ON cp.id = $1
        WHERE (co.offering_company_id = cp.company_a_id AND co.target_company_id = cp.company_b_id)
           OR (co.offering_company_id = cp.company_b_id AND co.target_company_id = cp.company_a_id)
      )
    `, [id]);

    res.json({ message: 'Partnership removed successfully' });
  } catch (error) {
    console.error('Remove partner error:', error);
    res.status(500).json({ error: 'Failed to remove partner' });
  }
});

// ============================================
// COLLAB OFFERS - Admin Management
// ============================================

// Get offers created by my company (outgoing)
router.get('/offers', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const adminCompanyId = req.user?.company_id;

    if (!adminCompanyId) {
      return res.status(400).json({ error: 'Admin must be associated with a company' });
    }

    const result = await query(`
      SELECT
        co.*,
        tc.name as target_company_name,
        tc.logo_url as target_company_logo,
        COALESCE(cr.redemption_count, 0) as redemptions_count
      FROM collab_offers co
      JOIN companies tc ON co.target_company_id = tc.id
      LEFT JOIN (
        SELECT collab_offer_id, COUNT(*) as redemption_count
        FROM collab_redemptions
        GROUP BY collab_offer_id
      ) cr ON co.id = cr.collab_offer_id
      WHERE co.offering_company_id = $1
      ORDER BY co.created_at DESC
    `, [adminCompanyId]);

    res.json({ offers: result.rows });
  } catch (error) {
    console.error('Get offers error:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// Get offers from partners (incoming - pending approval)
router.get('/incoming', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const adminCompanyId = req.user?.company_id;
    const { status } = req.query;

    if (!adminCompanyId) {
      return res.status(400).json({ error: 'Admin must be associated with a company' });
    }

    let sql = `
      SELECT
        co.*,
        oc.name as offering_company_name,
        oc.logo_url as offering_company_logo,
        COALESCE(cr.redemption_count, 0) as redemptions_count
      FROM collab_offers co
      JOIN companies oc ON co.offering_company_id = oc.id
      LEFT JOIN (
        SELECT collab_offer_id, COUNT(*) as redemption_count
        FROM collab_redemptions
        GROUP BY collab_offer_id
      ) cr ON co.id = cr.collab_offer_id
      WHERE co.target_company_id = $1
    `;
    const params: any[] = [adminCompanyId];

    if (status) {
      sql += ` AND co.status = $2`;
      params.push(status);
    }

    sql += ` ORDER BY co.created_at DESC`;

    const result = await query(sql, params);

    res.json({ offers: result.rows });
  } catch (error) {
    console.error('Get incoming offers error:', error);
    res.status(500).json({ error: 'Failed to fetch incoming offers' });
  }
});

// Get single collab offer
router.get('/offers/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT
        co.*,
        oc.name as offering_company_name,
        oc.logo_url as offering_company_logo,
        tc.name as target_company_name,
        tc.logo_url as target_company_logo
      FROM collab_offers co
      JOIN companies oc ON co.offering_company_id = oc.id
      JOIN companies tc ON co.target_company_id = tc.id
      WHERE co.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Collab offer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get collab offer error:', error);
    res.status(500).json({ error: 'Failed to fetch collab offer' });
  }
});

// Create a collab offer
router.post('/offers', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const adminCompanyId = req.user?.company_id;
    const staffId = req.user?.staff_id;

    if (!adminCompanyId) {
      return res.status(400).json({ error: 'Admin must be associated with a company' });
    }

    const {
      target_company_id,
      title,
      description,
      discount_type,
      discount_value,
      image_url,
      terms,
      valid_from,
      valid_until,
      max_redemptions,
      max_per_user
    } = req.body;

    // Validation
    if (!target_company_id || !title || !discount_type || !discount_value || !valid_from || !valid_until) {
      return res.status(400).json({
        error: 'Required fields: target_company_id, title, discount_type, discount_value, valid_from, valid_until'
      });
    }

    if (!['percentage', 'fixed', 'free_item'].includes(discount_type)) {
      return res.status(400).json({ error: 'Invalid discount_type. Must be percentage, fixed, or free_item' });
    }

    if (discount_value <= 0) {
      return res.status(400).json({ error: 'Discount value must be positive' });
    }

    if (discount_type === 'percentage' && discount_value > 100) {
      return res.status(400).json({ error: 'Percentage discount cannot exceed 100' });
    }

    // Check partnership exists
    const partnershipCheck = await query(`
      SELECT id FROM company_partnerships
      WHERE is_active = true
      AND ((company_a_id = $1 AND company_b_id = $2) OR (company_a_id = $2 AND company_b_id = $1))
    `, [adminCompanyId, target_company_id]);

    if (partnershipCheck.rows.length === 0) {
      return res.status(400).json({ error: 'No active partnership with this company' });
    }

    // Validate dates
    const fromDate = new Date(valid_from);
    const untilDate = new Date(valid_until);
    if (fromDate >= untilDate) {
      return res.status(400).json({ error: 'Valid from date must be before valid until date' });
    }

    const result = await query(`
      INSERT INTO collab_offers (
        offering_company_id, target_company_id, title, description,
        discount_type, discount_value, image_url, terms,
        valid_from, valid_until, max_redemptions, max_per_user, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      adminCompanyId, target_company_id, title, description,
      discount_type, discount_value, image_url || null, terms || null,
      valid_from, valid_until, max_redemptions || null, max_per_user || 1, staffId
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create collab offer error:', error);
    res.status(500).json({ error: 'Failed to create collab offer' });
  }
});

// Update a collab offer (only if pending or paused)
router.patch('/offers/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminCompanyId = req.user?.company_id;

    if (!adminCompanyId) {
      return res.status(400).json({ error: 'Admin must be associated with a company' });
    }

    // Check offer exists and belongs to admin's company
    const offerCheck = await query(`
      SELECT * FROM collab_offers WHERE id = $1 AND offering_company_id = $2
    `, [id, adminCompanyId]);

    if (offerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Collab offer not found' });
    }

    const currentOffer = offerCheck.rows[0];
    if (!['pending', 'paused'].includes(currentOffer.status)) {
      return res.status(400).json({ error: 'Can only update pending or paused offers' });
    }

    const {
      title,
      description,
      discount_type,
      discount_value,
      image_url,
      terms,
      valid_from,
      valid_until,
      max_redemptions,
      max_per_user
    } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (discount_type !== undefined) {
      if (!['percentage', 'fixed', 'free_item'].includes(discount_type)) {
        return res.status(400).json({ error: 'Invalid discount_type' });
      }
      updates.push(`discount_type = $${paramCount++}`);
      values.push(discount_type);
    }
    if (discount_value !== undefined) {
      if (discount_value <= 0) {
        return res.status(400).json({ error: 'Discount value must be positive' });
      }
      updates.push(`discount_value = $${paramCount++}`);
      values.push(discount_value);
    }
    if (image_url !== undefined) {
      updates.push(`image_url = $${paramCount++}`);
      values.push(image_url || null);
    }
    if (terms !== undefined) {
      updates.push(`terms = $${paramCount++}`);
      values.push(terms || null);
    }
    if (valid_from !== undefined) {
      updates.push(`valid_from = $${paramCount++}`);
      values.push(valid_from);
    }
    if (valid_until !== undefined) {
      updates.push(`valid_until = $${paramCount++}`);
      values.push(valid_until);
    }
    if (max_redemptions !== undefined) {
      updates.push(`max_redemptions = $${paramCount++}`);
      values.push(max_redemptions || null);
    }
    if (max_per_user !== undefined) {
      updates.push(`max_per_user = $${paramCount++}`);
      values.push(max_per_user || 1);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // If offer was rejected and is being updated, reset to pending
    if (currentOffer.status === 'paused') {
      updates.push(`status = $${paramCount++}`);
      values.push('pending');
    }

    values.push(id);

    const result = await query(
      `UPDATE collab_offers SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update collab offer error:', error);
    res.status(500).json({ error: 'Failed to update collab offer' });
  }
});

// Delete a collab offer
router.delete('/offers/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminCompanyId = req.user?.company_id;

    if (!adminCompanyId) {
      return res.status(400).json({ error: 'Admin must be associated with a company' });
    }

    // Check offer exists and belongs to admin's company
    const offerCheck = await query(`
      SELECT id FROM collab_offers WHERE id = $1 AND offering_company_id = $2
    `, [id, adminCompanyId]);

    if (offerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Collab offer not found' });
    }

    await query('DELETE FROM collab_offers WHERE id = $1', [id]);

    res.json({ message: 'Collab offer deleted successfully' });
  } catch (error) {
    console.error('Delete collab offer error:', error);
    res.status(500).json({ error: 'Failed to delete collab offer' });
  }
});

// ============================================
// COLLAB OFFERS - Approval Workflow
// ============================================

// Approve an incoming offer
router.post('/offers/:id/approve', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminCompanyId = req.user?.company_id;
    const staffId = req.user?.staff_id;

    if (!adminCompanyId) {
      return res.status(400).json({ error: 'Admin must be associated with a company' });
    }

    // Check offer exists and targets admin's company
    const offerCheck = await query(`
      SELECT * FROM collab_offers WHERE id = $1 AND target_company_id = $2
    `, [id, adminCompanyId]);

    if (offerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Collab offer not found' });
    }

    const offer = offerCheck.rows[0];
    if (offer.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending offers can be approved' });
    }

    const result = await query(`
      UPDATE collab_offers
      SET status = 'active', approved_at = NOW(), approved_by = $1
      WHERE id = $2
      RETURNING *
    `, [staffId, id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Approve offer error:', error);
    res.status(500).json({ error: 'Failed to approve offer' });
  }
});

// Reject an incoming offer
router.post('/offers/:id/reject', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminCompanyId = req.user?.company_id;

    if (!adminCompanyId) {
      return res.status(400).json({ error: 'Admin must be associated with a company' });
    }

    // Check offer exists and targets admin's company
    const offerCheck = await query(`
      SELECT * FROM collab_offers WHERE id = $1 AND target_company_id = $2
    `, [id, adminCompanyId]);

    if (offerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Collab offer not found' });
    }

    const offer = offerCheck.rows[0];
    if (offer.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending offers can be rejected' });
    }

    const result = await query(`
      UPDATE collab_offers
      SET status = 'rejected', rejection_reason = $1
      WHERE id = $2
      RETURNING *
    `, [reason || null, id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Reject offer error:', error);
    res.status(500).json({ error: 'Failed to reject offer' });
  }
});

// Pause an active offer (by offering company)
router.post('/offers/:id/pause', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminCompanyId = req.user?.company_id;

    if (!adminCompanyId) {
      return res.status(400).json({ error: 'Admin must be associated with a company' });
    }

    // Check offer exists and belongs to admin's company
    const offerCheck = await query(`
      SELECT * FROM collab_offers WHERE id = $1 AND offering_company_id = $2
    `, [id, adminCompanyId]);

    if (offerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Collab offer not found' });
    }

    const offer = offerCheck.rows[0];
    if (offer.status !== 'active') {
      return res.status(400).json({ error: 'Only active offers can be paused' });
    }

    const result = await query(`
      UPDATE collab_offers SET status = 'paused' WHERE id = $1 RETURNING *
    `, [id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Pause offer error:', error);
    res.status(500).json({ error: 'Failed to pause offer' });
  }
});

// Resume a paused offer
router.post('/offers/:id/resume', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminCompanyId = req.user?.company_id;

    if (!adminCompanyId) {
      return res.status(400).json({ error: 'Admin must be associated with a company' });
    }

    // Check offer exists and belongs to admin's company
    const offerCheck = await query(`
      SELECT * FROM collab_offers WHERE id = $1 AND offering_company_id = $2
    `, [id, adminCompanyId]);

    if (offerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Collab offer not found' });
    }

    const offer = offerCheck.rows[0];
    if (offer.status !== 'paused') {
      return res.status(400).json({ error: 'Only paused offers can be resumed' });
    }

    const result = await query(`
      UPDATE collab_offers SET status = 'active' WHERE id = $1 RETURNING *
    `, [id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Resume offer error:', error);
    res.status(500).json({ error: 'Failed to resume offer' });
  }
});

// ============================================
// CUSTOMER ENDPOINTS
// ============================================

// Get active collab offers available to the customer
router.get('/available', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userCompanyId = req.user?.company_id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's company if not in token
    let companyId = userCompanyId;
    if (!companyId) {
      const userResult = await query('SELECT company_id FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length > 0) {
        companyId = userResult.rows[0].company_id;
      }
    }

    if (!companyId) {
      return res.json({ offers: [] }); // User not associated with any company
    }

    const result = await query(`
      SELECT
        co.*,
        oc.name as offering_company_name,
        oc.logo_url as offering_company_logo,
        COALESCE(user_redemptions.count, 0) as user_redemption_count
      FROM collab_offers co
      JOIN companies oc ON co.offering_company_id = oc.id
      LEFT JOIN (
        SELECT collab_offer_id, COUNT(*) as count
        FROM collab_redemptions
        WHERE user_id = $2
        GROUP BY collab_offer_id
      ) user_redemptions ON co.id = user_redemptions.collab_offer_id
      WHERE co.target_company_id = $1
      AND co.status = 'active'
      AND co.valid_from <= CURRENT_DATE
      AND co.valid_until >= CURRENT_DATE
      AND (co.max_redemptions IS NULL OR co.redemptions_count < co.max_redemptions)
      AND (co.max_per_user IS NULL OR COALESCE(user_redemptions.count, 0) < co.max_per_user)
      ORDER BY co.created_at DESC
    `, [companyId, userId]);

    res.json({ offers: result.rows });
  } catch (error) {
    console.error('Get available offers error:', error);
    res.status(500).json({ error: 'Failed to fetch available offers' });
  }
});

// Generate redemption QR for a collab offer
router.post('/offers/:id/redeem', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's company
    const userResult = await query('SELECT id, company_id, name FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userResult.rows[0];

    if (!user.company_id) {
      return res.status(400).json({ error: 'User not associated with any company' });
    }

    // Get offer
    const offerResult = await query(`
      SELECT co.*, oc.name as offering_company_name
      FROM collab_offers co
      JOIN companies oc ON co.offering_company_id = oc.id
      WHERE co.id = $1
    `, [id]);

    if (offerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Collab offer not found' });
    }

    const offer = offerResult.rows[0];

    // Verify user belongs to target company
    if (offer.target_company_id !== user.company_id) {
      return res.status(403).json({ error: 'This offer is not available for your company' });
    }

    // Check offer is active and valid
    if (offer.status !== 'active') {
      return res.status(400).json({ error: 'This offer is not active' });
    }

    const now = new Date();
    if (new Date(offer.valid_from) > now) {
      return res.status(400).json({ error: 'This offer is not yet valid' });
    }
    if (new Date(offer.valid_until) < now) {
      return res.status(400).json({ error: 'This offer has expired' });
    }

    // Check total redemption limit
    if (offer.max_redemptions && offer.redemptions_count >= offer.max_redemptions) {
      return res.status(400).json({ error: 'This offer has reached its redemption limit' });
    }

    // Check user redemption limit
    if (offer.max_per_user) {
      const userRedemptionResult = await query(`
        SELECT COUNT(*) as count FROM collab_redemptions
        WHERE collab_offer_id = $1 AND user_id = $2
      `, [id, userId]);

      if (parseInt(userRedemptionResult.rows[0].count) >= offer.max_per_user) {
        return res.status(400).json({ error: 'You have reached the maximum redemptions for this offer' });
      }
    }

    // Generate QR token
    const redemptionUuid = uuidv4();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const qrData = {
      type: 'collab_redemption',
      redemption_id: redemptionUuid,
      collab_offer_id: id,
      user_id: userId.toString(),
      target_company_id: offer.target_company_id.toString(),
      offering_company_id: offer.offering_company_id.toString(),
      expires_at: expiresAt.toISOString()
    };

    const qrToken = generateQRToken(qrData, `${QR_TOKEN_EXPIRY_SECONDS}s`);

    // Generate QR code image
    const qrDataUrl = await QRCode.toDataURL(qrToken, {
      width: 512,
      margin: 4,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'H'
    });

    res.json({
      qr_code: qrDataUrl,
      qr_token: qrToken,
      redemption_id: redemptionUuid,
      expires_at: expiresAt.toISOString(),
      offer: {
        id: offer.id,
        title: offer.title,
        description: offer.description,
        discount_type: offer.discount_type,
        discount_value: offer.discount_value,
        offering_company_name: offer.offering_company_name
      }
    });
  } catch (error) {
    console.error('Generate collab QR error:', error);
    res.status(500).json({ error: 'Failed to generate redemption QR' });
  }
});

// ============================================
// STAFF VERIFICATION
// ============================================

// Verify and complete collab redemption
router.post('/verify', authenticate, requireRole(['staff', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const staffId = req.user?.staff_id;
    const staffCompanyId = req.user?.company_id;
    const { qr_data, outlet } = req.body;

    if (!staffCompanyId) {
      return res.status(400).json({ error: 'Staff must be associated with a company' });
    }

    if (!qr_data) {
      return res.status(400).json({ error: 'QR data is required' });
    }

    // Parse QR data
    let parsedData: any;
    try {
      parsedData = typeof qr_data === 'string' ? JSON.parse(qr_data) : qr_data;
    } catch {
      return res.status(400).json({ error: 'Invalid QR data format' });
    }

    // Verify it's a collab redemption
    if (parsedData.type !== 'collab_redemption') {
      return res.status(400).json({ error: 'Invalid QR type. Expected collab_redemption' });
    }

    // Verify staff belongs to the offering company
    if (parseInt(parsedData.offering_company_id) !== staffCompanyId) {
      return res.status(403).json({ error: 'This offer can only be redeemed at the offering company' });
    }

    // Check expiry
    if (new Date(parsedData.expires_at) < new Date()) {
      return res.status(400).json({ error: 'QR code has expired. Please generate a new one.' });
    }

    const offerId = parsedData.collab_offer_id;
    const customerId = parsedData.user_id;
    const redemptionId = parsedData.redemption_id;

    // Check if already redeemed with this redemption ID
    const existingCheck = await query(`
      SELECT id FROM collab_redemptions
      WHERE collab_offer_id = $1 AND user_id = $2
      AND redeemed_at > NOW() - INTERVAL '10 minutes'
    `, [offerId, customerId]);

    // Get offer details
    const offerResult = await query(`
      SELECT co.*, tc.name as target_company_name
      FROM collab_offers co
      JOIN companies tc ON co.target_company_id = tc.id
      WHERE co.id = $1
    `, [offerId]);

    if (offerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Collab offer not found' });
    }

    const offer = offerResult.rows[0];

    // Get customer details
    const customerResult = await query('SELECT id, name, email FROM users WHERE id = $1', [customerId]);
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const customer = customerResult.rows[0];

    // Record redemption
    await transaction(async (client) => {
      // Insert redemption record
      await client.query(`
        INSERT INTO collab_redemptions (collab_offer_id, user_id, redeemed_at_outlet, staff_id)
        VALUES ($1, $2, $3, $4)
      `, [offerId, customerId, outlet || null, staffId]);

      // Increment redemption count
      await client.query(`
        UPDATE collab_offers SET redemptions_count = redemptions_count + 1 WHERE id = $1
      `, [offerId]);
    });

    res.json({
      success: true,
      message: 'Collab offer redeemed successfully',
      offer: {
        id: offer.id,
        title: offer.title,
        discount_type: offer.discount_type,
        discount_value: offer.discount_value,
        partner_company: offer.target_company_name
      },
      customer: {
        id: customer.id,
        name: customer.name
      }
    });
  } catch (error) {
    console.error('Verify collab redemption error:', error);
    res.status(500).json({ error: 'Failed to verify collab redemption' });
  }
});

// Get redemption history for an offer (admin)
router.get('/offers/:id/redemptions', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminCompanyId = req.user?.company_id;

    if (!adminCompanyId) {
      return res.status(400).json({ error: 'Admin must be associated with a company' });
    }

    // Verify offer belongs to admin's company (either as offering or target)
    const offerCheck = await query(`
      SELECT id FROM collab_offers
      WHERE id = $1 AND (offering_company_id = $2 OR target_company_id = $2)
    `, [id, adminCompanyId]);

    if (offerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Collab offer not found' });
    }

    const result = await query(`
      SELECT
        cr.*,
        u.name as customer_name,
        u.email as customer_email,
        su.name as staff_name
      FROM collab_redemptions cr
      JOIN users u ON cr.user_id = u.id
      LEFT JOIN staff_users su ON cr.staff_id = su.id
      WHERE cr.collab_offer_id = $1
      ORDER BY cr.redeemed_at DESC
    `, [id]);

    res.json({ redemptions: result.rows });
  } catch (error) {
    console.error('Get redemption history error:', error);
    res.status(500).json({ error: 'Failed to fetch redemption history' });
  }
});

export default router;
