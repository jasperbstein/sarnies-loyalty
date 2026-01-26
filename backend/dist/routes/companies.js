"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const auditLog_1 = require("../utils/auditLog");
const router = (0, express_1.Router)();
// ============================================================================
// COMPANY ROUTES
// ============================================================================
// Get all companies
router.get('/', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { search, is_active } = req.query;
        let sql = 'SELECT * FROM companies';
        const conditions = [];
        const params = [];
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
        const result = await (0, database_1.query)(sql, params);
        res.json({
            companies: result.rows,
            total: result.rowCount
        });
    }
    catch (error) {
        console.error('Get companies error:', error);
        res.status(500).json({ error: 'Failed to fetch companies' });
    }
});
// Get single company
router.get('/:id', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await (0, database_1.query)('SELECT * FROM companies WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Get company error:', error);
        res.status(500).json({ error: 'Failed to fetch company' });
    }
});
// Create company
router.post('/', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { name, slug, logo_url, description, discount_percentage, contact_email, contact_phone, allow_employee_self_registration, email_domain, is_active } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        // Auto-generate slug from name if not provided
        const companySlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        // Validate discount percentage
        if (discount_percentage !== undefined && (discount_percentage < 0 || discount_percentage > 100)) {
            return res.status(400).json({ error: 'Discount percentage must be between 0 and 100' });
        }
        const result = await (0, database_1.query)(`INSERT INTO companies (
        name, slug, logo_url, description, discount_percentage,
        contact_email, contact_phone, allow_employee_self_registration,
        email_domain, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`, [
            name,
            companySlug,
            logo_url,
            description,
            discount_percentage || 0,
            contact_email,
            contact_phone,
            allow_employee_self_registration || false,
            email_domain,
            is_active !== undefined ? is_active : true
        ]);
        const newCompany = result.rows[0];
        // Log audit trail
        await (0, auditLog_1.logCompanyAction)(req, 'create', newCompany.id, newCompany.name, {
            after: newCompany
        });
        res.status(201).json(newCompany);
    }
    catch (error) {
        console.error('Create company error:', error);
        if (error.code === '23505') { // Unique violation
            res.status(400).json({ error: 'Company name or slug already exists' });
        }
        else {
            res.status(500).json({ error: 'Failed to create company' });
        }
    }
});
// Update company
router.patch('/:id', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, logo_url, description, discount_percentage, contact_email, contact_phone, allow_employee_self_registration, email_domain, is_active } = req.body;
        // Get old company data for audit trail
        const oldCompanyResult = await (0, database_1.query)('SELECT * FROM companies WHERE id = $1', [id]);
        if (oldCompanyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }
        const oldCompany = oldCompanyResult.rows[0];
        const updates = [];
        const values = [];
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
        if (is_active !== undefined) {
            updates.push(`is_active = $${paramCount++}`);
            values.push(is_active);
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        values.push(id);
        const result = await (0, database_1.query)(`UPDATE companies SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }
        const updatedCompany = result.rows[0];
        // Log audit trail
        await (0, auditLog_1.logCompanyAction)(req, 'update', updatedCompany.id, updatedCompany.name, {
            before: oldCompany,
            after: updatedCompany
        });
        res.json(updatedCompany);
    }
    catch (error) {
        console.error('Update company error:', error);
        if (error.code === '23505') {
            res.status(400).json({ error: 'Company name or slug already exists' });
        }
        else {
            res.status(500).json({ error: 'Failed to update company' });
        }
    }
});
// Delete company (soft delete by setting is_active = false)
router.delete('/:id', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Get company data before deletion for audit trail
        const companyResult = await (0, database_1.query)('SELECT * FROM companies WHERE id = $1', [id]);
        if (companyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }
        const deletedCompany = companyResult.rows[0];
        await (0, database_1.query)('UPDATE companies SET is_active = false WHERE id = $1', [id]);
        // Log audit trail
        await (0, auditLog_1.logCompanyAction)(req, 'delete', deletedCompany.id, deletedCompany.name, {
            before: deletedCompany
        });
        res.json({ message: 'Company deactivated successfully' });
    }
    catch (error) {
        console.error('Delete company error:', error);
        res.status(500).json({ error: 'Failed to delete company' });
    }
});
// ============================================================================
// COMPANY EMPLOYEES ROUTES
// ============================================================================
// Get employees for a company
router.get('/:id/employees', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { is_verified, is_active, search } = req.query;
        let sql = `
      SELECT ce.*, u.name as user_name, u.phone as user_phone, u.points_balance
      FROM company_employees ce
      LEFT JOIN users u ON ce.user_id = u.id
      WHERE ce.company_id = $1
    `;
        const params = [id];
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
        const result = await (0, database_1.query)(sql, params);
        res.json({
            employees: result.rows,
            total: result.rowCount
        });
    }
    catch (error) {
        console.error('Get company employees error:', error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});
// Add employee to company
router.post('/:id/employees', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
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
        const result = await (0, database_1.query)(`INSERT INTO company_employees (
        company_id, employee_email, employee_id, full_name, department, is_active
      ) VALUES ($1, $2, $3, $4, $5, true)
      RETURNING *`, [id, employee_email.toLowerCase(), employee_id, full_name, department]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Add employee error:', error);
        if (error.code === '23505') { // Unique violation
            res.status(400).json({ error: 'Employee already exists in this company' });
        }
        else {
            res.status(500).json({ error: 'Failed to add employee' });
        }
    }
});
// Bulk import employees via CSV
router.post('/:id/employees/bulk', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { employees } = req.body; // Array of {email, employee_id, full_name, department}
        if (!Array.isArray(employees) || employees.length === 0) {
            return res.status(400).json({ error: 'Employees array is required' });
        }
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };
        for (const emp of employees) {
            try {
                await (0, database_1.query)(`INSERT INTO company_employees (
            company_id, employee_email, employee_id, full_name, department, is_active
          ) VALUES ($1, $2, $3, $4, $5, true)
          ON CONFLICT (company_id, employee_email) DO NOTHING`, [id, emp.email.toLowerCase(), emp.employee_id, emp.full_name, emp.department]);
                results.success++;
            }
            catch (error) {
                results.failed++;
                results.errors.push({ email: emp.email, error: 'Failed to insert' });
            }
        }
        res.json(results);
    }
    catch (error) {
        console.error('Bulk import error:', error);
        res.status(500).json({ error: 'Failed to import employees' });
    }
});
// Update employee
router.patch('/:company_id/employees/:employee_id', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { company_id, employee_id } = req.params;
        const { employee_email, full_name, department, is_active } = req.body;
        const updates = [];
        const values = [];
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
        const result = await (0, database_1.query)(`UPDATE company_employees SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Update employee error:', error);
        res.status(500).json({ error: 'Failed to update employee' });
    }
});
// Remove employee from company
router.delete('/:company_id/employees/:employee_id', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { employee_id } = req.params;
        const result = await (0, database_1.query)('DELETE FROM company_employees WHERE id = $1 RETURNING *', [employee_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json({ message: 'Employee removed successfully' });
    }
    catch (error) {
        console.error('Remove employee error:', error);
        res.status(500).json({ error: 'Failed to remove employee' });
    }
});
// ============================================================================
// PUBLIC ROUTES (for registration)
// ============================================================================
// Verify if email is eligible for company program
router.post('/verify-email', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        const emailLower = email.toLowerCase();
        const emailDomain = emailLower.split('@')[1];
        // Check if email is in any company's employee list
        const employeeResult = await (0, database_1.query)(`SELECT ce.*, c.name as company_name, c.discount_percentage, c.logo_url
       FROM company_employees ce
       JOIN companies c ON ce.company_id = c.id
       WHERE ce.employee_email = $1 AND ce.is_active = true AND c.is_active = true`, [emailLower]);
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
        const domainResult = await (0, database_1.query)(`SELECT * FROM companies
       WHERE email_domain = $1
       AND allow_employee_self_registration = true
       AND is_active = true`, [emailDomain]);
        if (domainResult.rows.length > 0) {
            return res.json({
                eligible: true,
                company: domainResult.rows[0],
                auto_approved: true
            });
        }
        res.json({ eligible: false });
    }
    catch (error) {
        console.error('Verify email error:', error);
        res.status(500).json({ error: 'Failed to verify email' });
    }
});
exports.default = router;
//# sourceMappingURL=companies.js.map