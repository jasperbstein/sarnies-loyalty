import { Router, Response } from 'express';
import { query } from '../db/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { Company, CompanyEmployee } from '../types';
import { logCompanyAction } from '../utils/auditLog';
import { generateMagicToken, generateSessionId, saveMagicToken } from '../utils/magicLink';
import { sendMagicLinkEmail } from '../utils/email';

const router = Router();

// ============================================================================
// COMPANY ROUTES
// ============================================================================

// Get all companies
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { search, is_active } = req.query;

    let sql = 'SELECT * FROM companies';
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (search) {
      conditions.push(`(name ILIKE $${paramCount} OR slug ILIKE $${paramCount} OR email_domain ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    if (is_active !== undefined) {
      conditions.push(`is_active = $${paramCount}`);
      params.push(is_active === 'true');
      paramCount++;
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY name ASC';

    const result = await query(sql, params);

    res.json({
      companies: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Get single company
router.get('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query('SELECT * FROM companies WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

// Helper function to create or update company discount voucher
async function syncCompanyDiscountVoucher(companyId: number, companyName: string, discountPercentage: number, adminUserId?: number) {
  if (discountPercentage <= 0) {
    // If discount is 0 or negative, deactivate any existing company voucher
    await query(
      `UPDATE vouchers SET is_active = false WHERE company_id = $1 AND voucher_type = 'percentage_discount'`,
      [companyId]
    );
    return;
  }

  // Check if company discount voucher already exists
  const existing = await query(
    `SELECT id FROM vouchers WHERE company_id = $1 AND voucher_type = 'percentage_discount'`,
    [companyId]
  );

  const voucherTitle = `${companyName} Employee Discount`;
  const voucherDescription = `${discountPercentage}% off for ${companyName} employees`;

  if (existing.rows.length === 0) {
    // Create new discount voucher
    await query(
      `INSERT INTO vouchers (
        title, description, voucher_type, benefit_type, discount_percentage,
        points_required, is_active, is_free, is_reusable, requires_scan,
        company_id, target_user_types, is_company_exclusive,
        allowed_company_ids, redemption_window
      ) VALUES ($1, $2, 'percentage_discount', 'percentage_discount', $3,
        0, true, true, true, true,
        $4, ARRAY['employee']::text[], true,
        ARRAY[$4]::integer[], 'unlimited')`,
      [voucherTitle, voucherDescription, discountPercentage, companyId]
    );
    console.log(`Created discount voucher for company ${companyId}: ${discountPercentage}%`);
  } else {
    // Update existing voucher
    await query(
      `UPDATE vouchers
       SET title = $1, description = $2, discount_percentage = $3, is_active = true
       WHERE company_id = $4 AND voucher_type = 'percentage_discount'`,
      [voucherTitle, voucherDescription, discountPercentage, companyId]
    );
    console.log(`Updated discount voucher for company ${companyId}: ${discountPercentage}%`);
  }
}

// Create company
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      slug,
      logo_url,
      description,
      discount_percentage,
      contact_email,
      contact_phone,
      allow_employee_self_registration,
      email_domain,
      allow_staff_self_registration,
      staff_email_domain,
      staff_default_branch,
      is_active,
      users_collect_points
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Auto-generate slug from name if not provided
    const companySlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Validate discount percentage
    const discountPct = discount_percentage || 0;
    if (discountPct < 0 || discountPct > 100) {
      return res.status(400).json({ error: 'Discount percentage must be between 0 and 100' });
    }

    const result = await query(
      `INSERT INTO companies (
        name, slug, logo_url, description, discount_percentage,
        contact_email, contact_phone, allow_employee_self_registration,
        email_domain, allow_staff_self_registration, staff_email_domain,
        staff_default_branch, is_active, users_collect_points
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        name,
        companySlug,
        logo_url,
        description,
        discountPct,
        contact_email,
        contact_phone,
        allow_employee_self_registration || false,
        email_domain,
        allow_staff_self_registration || false,
        staff_email_domain,
        staff_default_branch,
        is_active !== undefined ? is_active : true,
        users_collect_points !== undefined ? users_collect_points : false // Default false for company employees
      ]
    );

    const newCompany = result.rows[0];

    // Auto-create discount voucher if discount > 0
    if (discountPct > 0) {
      await syncCompanyDiscountVoucher(newCompany.id, newCompany.name, discountPct, req.user?.id);
    }

    // Log audit trail
    await logCompanyAction(req, 'create', newCompany.id, newCompany.name, {
      after: newCompany
    });

    res.status(201).json(newCompany);
  } catch (error: any) {
    console.error('Create company error:', error);
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Company name or slug already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create company' });
    }
  }
});

// Update company (supporting both PUT and PATCH)
const updateCompanyHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      slug,
      logo_url,
      description,
      discount_percentage,
      contact_email,
      contact_phone,
      allow_employee_self_registration,
      email_domain,
      allow_staff_self_registration,
      staff_email_domain,
      staff_default_branch,
      is_active,
      users_collect_points
    } = req.body;

    // Get old company data for audit trail
    const oldCompanyResult = await query('SELECT * FROM companies WHERE id = $1', [id]);
    if (oldCompanyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const oldCompany = oldCompanyResult.rows[0];

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (slug !== undefined) {
      updates.push(`slug = $${paramCount++}`);
      values.push(slug);
    }
    if (logo_url !== undefined) {
      updates.push(`logo_url = $${paramCount++}`);
      values.push(logo_url);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (discount_percentage !== undefined) {
      if (discount_percentage < 0 || discount_percentage > 100) {
        return res.status(400).json({ error: 'Discount percentage must be between 0 and 100' });
      }
      updates.push(`discount_percentage = $${paramCount++}`);
      values.push(discount_percentage);
    }
    if (contact_email !== undefined) {
      updates.push(`contact_email = $${paramCount++}`);
      values.push(contact_email);
    }
    if (contact_phone !== undefined) {
      updates.push(`contact_phone = $${paramCount++}`);
      values.push(contact_phone);
    }
    if (allow_employee_self_registration !== undefined) {
      updates.push(`allow_employee_self_registration = $${paramCount++}`);
      values.push(allow_employee_self_registration);
    }
    if (email_domain !== undefined) {
      updates.push(`email_domain = $${paramCount++}`);
      values.push(email_domain);
    }
    if (allow_staff_self_registration !== undefined) {
      updates.push(`allow_staff_self_registration = $${paramCount++}`);
      values.push(allow_staff_self_registration);
    }
    if (staff_email_domain !== undefined) {
      updates.push(`staff_email_domain = $${paramCount++}`);
      values.push(staff_email_domain);
    }
    if (staff_default_branch !== undefined) {
      updates.push(`staff_default_branch = $${paramCount++}`);
      values.push(staff_default_branch);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }
    if (users_collect_points !== undefined) {
      updates.push(`users_collect_points = $${paramCount++}`);
      values.push(users_collect_points);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const result = await query(
      `UPDATE companies SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const updatedCompany = result.rows[0];

    // Sync discount voucher if discount or name changed
    if (discount_percentage !== undefined || name !== undefined) {
      await syncCompanyDiscountVoucher(
        updatedCompany.id,
        updatedCompany.name,
        updatedCompany.discount_percentage
      );
    }

    // Log audit trail
    await logCompanyAction(req, 'update', updatedCompany.id, updatedCompany.name, {
      before: oldCompany,
      after: updatedCompany
    });

    res.json(updatedCompany);
  } catch (error: any) {
    console.error('Update company error:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Company name or slug already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update company' });
    }
  }
};

router.patch('/:id', authenticate, requireAdmin, updateCompanyHandler);
router.put('/:id', authenticate, requireAdmin, updateCompanyHandler);

// Delete company (soft delete by setting is_active = false)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get company data before deletion for audit trail
    const companyResult = await query('SELECT * FROM companies WHERE id = $1', [id]);
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const deletedCompany = companyResult.rows[0];

    await query('UPDATE companies SET is_active = false WHERE id = $1', [id]);

    // Log audit trail
    await logCompanyAction(req, 'delete', deletedCompany.id, deletedCompany.name, {
      before: deletedCompany
    });

    res.json({ message: 'Company deactivated successfully' });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

// ============================================================================
// COMPANY EMPLOYEES ROUTES
// ============================================================================

// Get employees for a company
router.get('/:id/employees', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { is_verified, is_active, search } = req.query;

    let sql = `
      SELECT ce.*, u.name as user_name, u.phone as user_phone, u.points_balance
      FROM company_employees ce
      LEFT JOIN users u ON ce.user_id = u.id
      WHERE ce.company_id = $1
    `;
    const params: any[] = [id];
    let paramCount = 2;

    if (is_verified !== undefined) {
      sql += ` AND ce.is_verified = $${paramCount++}`;
      params.push(is_verified === 'true');
    }

    if (is_active !== undefined) {
      sql += ` AND ce.is_active = $${paramCount++}`;
      params.push(is_active === 'true');
    }

    if (search) {
      sql += ` AND (ce.employee_email ILIKE $${paramCount} OR ce.full_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    sql += ' ORDER BY ce.created_at DESC';

    const result = await query(sql, params);

    res.json({
      employees: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Get company employees error:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Add employee to company
router.post('/:id/employees', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { employee_email, employee_id, full_name, department } = req.body;

    if (!employee_email) {
      return res.status(400).json({ error: 'Employee email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(employee_email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const result = await query(
      `INSERT INTO company_employees (
        company_id, employee_email, employee_id, full_name, department, is_active
      ) VALUES ($1, $2, $3, $4, $5, true)
      RETURNING *`,
      [id, employee_email.toLowerCase(), employee_id, full_name, department]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Add employee error:', error);
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Employee already exists in this company' });
    } else {
      res.status(500).json({ error: 'Failed to add employee' });
    }
  }
});

// Bulk import employees via CSV
router.post('/:id/employees/bulk', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { employees } = req.body; // Array of {email, employee_id, full_name, department}

    if (!Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ error: 'Employees array is required' });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    for (const emp of employees) {
      try {
        await query(
          `INSERT INTO company_employees (
            company_id, employee_email, employee_id, full_name, department, is_active
          ) VALUES ($1, $2, $3, $4, $5, true)
          ON CONFLICT (company_id, employee_email) DO NOTHING`,
          [id, emp.email.toLowerCase(), emp.employee_id, emp.full_name, emp.department]
        );
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ email: emp.email, error: 'Failed to insert' });
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Failed to import employees' });
  }
});

// Update employee
router.patch('/:company_id/employees/:employee_id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { company_id, employee_id } = req.params;
    const { employee_email, full_name, department, is_active } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (employee_email !== undefined) {
      updates.push(`employee_email = $${paramCount++}`);
      values.push(employee_email.toLowerCase());
    }
    if (full_name !== undefined) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(full_name);
    }
    if (department !== undefined) {
      updates.push(`department = $${paramCount++}`);
      values.push(department);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(employee_id);

    const result = await query(
      `UPDATE company_employees SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// Remove employee from company
router.delete('/:company_id/employees/:employee_id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { employee_id } = req.params;

    const result = await query(
      'DELETE FROM company_employees WHERE id = $1 RETURNING *',
      [employee_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({ message: 'Employee removed successfully' });
  } catch (error) {
    console.error('Remove employee error:', error);
    res.status(500).json({ error: 'Failed to remove employee' });
  }
});

// ============================================================================
// INVITE CODE MANAGEMENT (Admin)
// ============================================================================

// Generate/regenerate invite code for a company
router.post('/:id/invite-code', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Generate new 8-char code (uppercase, no confusable chars)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const result = await query(
      `UPDATE companies
       SET invite_code = $1, invite_code_uses = 0, invite_code_created_at = NOW()
       WHERE id = $2
       RETURNING id, name, invite_code, invite_code_uses, invite_code_created_at`,
      [code, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Generate invite code error:', error);
    if (error.code === '23505') {
      // Unique constraint - extremely rare, retry
      return res.status(500).json({ error: 'Code generation failed, please try again' });
    }
    res.status(500).json({ error: 'Failed to generate invite code' });
  }
});

// Revoke invite code
router.delete('/:id/invite-code', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE companies SET invite_code = NULL WHERE id = $1 RETURNING id, name`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json({ message: 'Invite code revoked', company: result.rows[0] });
  } catch (error) {
    console.error('Revoke invite code error:', error);
    res.status(500).json({ error: 'Failed to revoke invite code' });
  }
});

// ============================================================================
// PUBLIC ROUTES (for registration)
// ============================================================================

// Look up company by invite code (public - for registration flow)
router.get('/invite/:code', async (req, res: Response) => {
  try {
    const { code } = req.params;

    const result = await query(
      `SELECT id, name, slug, logo_url, discount_percentage, description
       FROM companies
       WHERE invite_code = $1 AND is_active = true`,
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Lookup invite code error:', error);
    res.status(500).json({ error: 'Failed to lookup invite code' });
  }
});

// Verify if email is eligible for company program
router.post('/verify-email', async (req, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailLower = email.toLowerCase();
    const emailDomain = emailLower.split('@')[1];

    // Check if email is in any company's employee list
    const employeeResult = await query(
      `SELECT ce.*, c.name as company_name, c.discount_percentage, c.logo_url
       FROM company_employees ce
       JOIN companies c ON ce.company_id = c.id
       WHERE ce.employee_email = $1 AND ce.is_active = true AND c.is_active = true`,
      [emailLower]
    );

    if (employeeResult.rows.length > 0) {
      return res.json({
        eligible: true,
        company: {
          id: employeeResult.rows[0].company_id,
          name: employeeResult.rows[0].company_name,
          discount_percentage: employeeResult.rows[0].discount_percentage,
          logo_url: employeeResult.rows[0].logo_url
        },
        employee: employeeResult.rows[0]
      });
    }

    // Check if email domain allows self-registration
    const domainResult = await query(
      `SELECT * FROM companies
       WHERE email_domain = $1
       AND allow_employee_self_registration = true
       AND is_active = true`,
      [emailDomain]
    );

    if (domainResult.rows.length > 0) {
      return res.json({
        eligible: true,
        company: domainResult.rows[0],
        auto_approved: true
      });
    }

    res.json({ eligible: false });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// ============================================================================
// DUAL INVITE SYSTEM
// ============================================================================

// Look up any invite code (personal or company)
router.get('/join/:code', async (req, res: Response) => {
  try {
    const { code } = req.params;
    const upperCode = code.toUpperCase();

    // First check if it's a personal invite code (12 chars)
    if (upperCode.length === 12) {
      const personalResult = await query(
        `SELECT pic.*, c.id as company_id, c.name as company_name, c.slug,
                c.logo_url, c.discount_percentage, c.description
         FROM personal_invite_codes pic
         JOIN companies c ON pic.company_id = c.id
         WHERE pic.code = $1 AND c.is_active = true`,
        [upperCode]
      );

      if (personalResult.rows.length > 0) {
        const invite = personalResult.rows[0];

        // Check if already used
        if (invite.is_used) {
          return res.status(410).json({
            error: 'This invite link has already been used',
            type: 'personal_used'
          });
        }

        // Check if expired
        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
          return res.status(410).json({
            error: 'This invite link has expired',
            type: 'personal_expired'
          });
        }

        // Personal invites have their own invite_type (defaults to 'employee')
        const inviteType = invite.invite_type || 'employee';

        return res.json({
          type: 'personal',
          invite_type: inviteType, // 'employee' or 'customer'
          direct_access: true,
          invite_id: invite.id,
          email: invite.email, // May be null
          company: {
            id: invite.company_id,
            name: invite.company_name,
            slug: invite.slug,
            logo_url: invite.logo_url,
            // Only show discount for employee invites
            discount_percentage: inviteType === 'employee' ? invite.discount_percentage : undefined,
            description: invite.description
          }
        });
      }
    }

    // Check if it's an EMPLOYEE invite code (8 chars) - for company benefits
    const employeeInviteResult = await query(
      `SELECT id, name, slug, logo_url, discount_percentage, description,
              email_domain, allow_employee_self_registration
       FROM companies
       WHERE invite_code = $1 AND is_active = true`,
      [upperCode]
    );

    if (employeeInviteResult.rows.length > 0) {
      const company = employeeInviteResult.rows[0];
      return res.json({
        type: 'company',
        invite_type: 'employee', // Employee invite - gets company benefits
        direct_access: false,
        requires_verification: true,
        verification_options: {
          email_domain: company.allow_employee_self_registration ? company.email_domain : null,
          access_code: true
        },
        company: {
          id: company.id,
          name: company.name,
          slug: company.slug,
          logo_url: company.logo_url,
          discount_percentage: company.discount_percentage,
          description: company.description
        }
      });
    }

    // Check if it's a CUSTOMER invite code (8 chars) - regular membership
    const customerInviteResult = await query(
      `SELECT id, name, slug, logo_url, discount_percentage, description
       FROM companies
       WHERE customer_invite_code = $1 AND is_active = true`,
      [upperCode]
    );

    if (customerInviteResult.rows.length > 0) {
      const company = customerInviteResult.rows[0];
      return res.json({
        type: 'company',
        invite_type: 'customer', // Customer invite - regular membership
        direct_access: true, // Customers don't need verification
        requires_verification: false,
        company: {
          id: company.id,
          name: company.name,
          slug: company.slug,
          logo_url: company.logo_url,
          // No discount for customers - they earn points instead
          description: company.description
        }
      });
    }

    return res.status(404).json({ error: 'Invalid invite code' });
  } catch (error) {
    console.error('Lookup join code error:', error);
    res.status(500).json({ error: 'Failed to lookup invite code' });
  }
});

// Verify access code for company join
router.post('/join/:code/verify-access-code', async (req, res: Response) => {
  try {
    const { code } = req.params;
    const { access_code } = req.body;

    if (!access_code) {
      return res.status(400).json({ error: 'Access code is required' });
    }

    const result = await query(
      `SELECT id, name, slug, logo_url, discount_percentage
       FROM companies
       WHERE invite_code = $1 AND access_code = $2 AND is_active = true`,
      [code.toUpperCase(), access_code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid access code' });
    }

    res.json({
      verified: true,
      company: result.rows[0]
    });
  } catch (error) {
    console.error('Verify access code error:', error);
    res.status(500).json({ error: 'Failed to verify access code' });
  }
});

// Verify email domain for company join (sends magic link)
router.post('/join/:code/verify-email', async (req, res: Response) => {
  try {
    const { code } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailLower = email.toLowerCase();
    const emailDomain = emailLower.split('@')[1];

    // Get company and check domain
    const companyResult = await query(
      `SELECT id, name, email_domain, allow_employee_self_registration
       FROM companies
       WHERE invite_code = $1 AND is_active = true`,
      [code.toUpperCase()]
    );

    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    const company = companyResult.rows[0];

    // Check if email domain matches
    if (!company.allow_employee_self_registration || company.email_domain !== emailDomain) {
      return res.status(403).json({
        error: `Email must be from @${company.email_domain || 'company domain'}`,
        expected_domain: company.email_domain
      });
    }

    // Generate session ID for WebSocket-based login notification
    const sessionId = generateSessionId();

    // Generate and save magic token with session ID
    const token = generateMagicToken();
    await saveMagicToken(emailLower, token, sessionId);

    // Build magic link URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const magicLink = `${baseUrl}/auth/verify?token=${token}`;

    // Send magic link email
    console.log(`📧 Sending magic link to ${emailLower} for company ${company.name}`);
    await sendMagicLinkEmail(emailLower, magicLink);

    res.json({
      verified: false, // Not yet verified, magic link sent
      message: 'Verification email sent',
      email: emailLower,
      company_id: company.id,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Verify email for join error:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

// Mark personal invite as used
router.post('/join/:code/use', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await query(
      `UPDATE personal_invite_codes
       SET is_used = true, used_at = NOW(), used_by_user_id = $1
       WHERE code = $2 AND is_used = false
       RETURNING id, company_id`,
      [userId, code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or already used invite code' });
    }

    // Link user to company
    const { company_id } = result.rows[0];
    await query(
      `UPDATE users SET company_id = $1, is_company_verified = true, user_type = 'employee'
       WHERE id = $2`,
      [company_id, userId]
    );

    res.json({ success: true, company_id });
  } catch (error) {
    console.error('Use personal invite error:', error);
    res.status(500).json({ error: 'Failed to use invite code' });
  }
});

// ============================================================================
// ADMIN: PERSONAL INVITE MANAGEMENT
// ============================================================================

// Generate personal invite code for an employee
router.post('/:id/personal-invites', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { email, notes, expires_in_days } = req.body;

    // Generate 12-char personal code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const expiresAt = expires_in_days
      ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000)
      : null;

    const result = await query(
      `INSERT INTO personal_invite_codes (company_id, code, email, expires_at, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, code, email?.toLowerCase() || null, expiresAt, notes || null, req.user?.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Generate personal invite error:', error);
    if (error.code === '23505') {
      return res.status(500).json({ error: 'Code generation failed, please try again' });
    }
    res.status(500).json({ error: 'Failed to generate personal invite' });
  }
});

// Get all personal invites for a company
router.get('/:id/personal-invites', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.query; // 'pending', 'used', 'expired', 'all'

    let sql = `
      SELECT pic.*, u.name as used_by_name, u.email as used_by_email
      FROM personal_invite_codes pic
      LEFT JOIN users u ON pic.used_by_user_id = u.id
      WHERE pic.company_id = $1
    `;

    if (status === 'pending') {
      sql += ` AND pic.is_used = false AND (pic.expires_at IS NULL OR pic.expires_at > NOW())`;
    } else if (status === 'used') {
      sql += ` AND pic.is_used = true`;
    } else if (status === 'expired') {
      sql += ` AND pic.is_used = false AND pic.expires_at IS NOT NULL AND pic.expires_at <= NOW()`;
    }

    sql += ` ORDER BY pic.created_at DESC`;

    const result = await query(sql, [id]);

    res.json({ invites: result.rows });
  } catch (error) {
    console.error('Get personal invites error:', error);
    res.status(500).json({ error: 'Failed to fetch personal invites' });
  }
});

// Delete/revoke a personal invite
router.delete('/:company_id/personal-invites/:invite_id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { invite_id } = req.params;

    const result = await query(
      `DELETE FROM personal_invite_codes WHERE id = $1 AND is_used = false RETURNING id`,
      [invite_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invite not found or already used' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete personal invite error:', error);
    res.status(500).json({ error: 'Failed to delete invite' });
  }
});

// ============================================================================
// ADMIN: ACCESS CODE MANAGEMENT
// ============================================================================

// Regenerate access code for a company
router.post('/:id/access-code', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Generate new 6-char access code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const result = await query(
      `UPDATE companies
       SET access_code = $1, access_code_created_at = NOW()
       WHERE id = $2
       RETURNING id, name, access_code, access_code_created_at`,
      [code, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Regenerate access code error:', error);
    res.status(500).json({ error: 'Failed to regenerate access code' });
  }
});

export default router;
