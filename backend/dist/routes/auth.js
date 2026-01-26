"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = require("../db/database");
const jwt_1 = require("../utils/jwt");
const otp_1 = require("../utils/otp");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
// Normalize phone number (remove spaces, ensure it starts with +)
const normalizePhone = (phone) => {
    let normalized = phone.replace(/\s+/g, '').trim();
    if (!normalized.startsWith('+')) {
        normalized = '+' + normalized;
    }
    return normalized;
};
// Staff login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const result = await (0, database_1.query)('SELECT * FROM staff_users WHERE email = $1 AND active = true', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const staff = result.rows[0];
        const validPassword = await bcrypt_1.default.compare(password, staff.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = (0, jwt_1.generateToken)({
            id: staff.id,
            email: staff.email,
            role: staff.role,
            type: 'staff'
        });
        res.json({
            token,
            user: {
                id: staff.id,
                email: staff.email,
                name: staff.name,
                role: staff.role,
                branch: staff.branch,
                type: 'staff'
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Send OTP to customer
router.post('/otp/send', rateLimiter_1.otpLimiter, async (req, res) => {
    try {
        let { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required' });
        }
        // Normalize phone number
        phone = normalizePhone(phone);
        const otp = (0, otp_1.generateOTP)();
        await (0, otp_1.saveOTP)(phone, otp);
        await (0, otp_1.sendOTP)(phone, otp);
        // In development/demo, return OTP for testing convenience
        const response = {
            message: 'OTP sent successfully',
            expiresIn: '5 minutes'
        };
        // Always return OTP for demo/testing (remove this check for true production)
        if (process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true') {
            response.otp = otp; // Include OTP for auto-fill
        }
        res.json(response);
    }
    catch (error) {
        console.error('OTP send error:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});
// Verify OTP and login customer
router.post('/otp/verify', rateLimiter_1.otpLimiter, async (req, res) => {
    try {
        let { phone, otp } = req.body;
        if (!phone || !otp) {
            return res.status(400).json({ error: 'Phone and OTP are required' });
        }
        // Normalize phone number
        phone = normalizePhone(phone);
        const valid = await (0, otp_1.verifyOTP)(phone, otp);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid or expired OTP' });
        }
        // Check if user exists - reject if not found
        let userResult = await (0, database_1.query)('SELECT * FROM users WHERE phone = $1', [phone]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Phone number not registered. Please contact Sarnies to register.'
            });
        }
        const user = userResult.rows[0];
        const token = (0, jwt_1.generateToken)({
            id: user.id,
            phone: user.phone,
            type: user.user_type || 'customer'
        });
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                surname: user.surname,
                phone: user.phone,
                email: user.email,
                birthday: user.birthday,
                gender: user.gender,
                company: user.company,
                points_balance: user.points_balance,
                user_type: user.user_type,
                customer_id: user.customer_id,
                company_id: user.company_id,
                is_company_verified: user.is_company_verified,
                created_at: user.created_at,
                registration_completed: user.registration_completed || false,
                type: user.user_type || 'customer'
            },
            needs_registration: !user.registration_completed
        });
    }
    catch (error) {
        console.error('OTP verify error:', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
});
// Complete user registration
router.post('/register', async (req, res) => {
    try {
        const { phone, name, surname, email, birthday, gender, company, email_consent, sms_consent, preferred_outlet } = req.body;
        if (!phone || !name) {
            return res.status(400).json({ error: 'Phone and name are required' });
        }
        const normalizedPhone = normalizePhone(phone);
        // Check if user exists
        const userResult = await (0, database_1.query)('SELECT * FROM users WHERE phone = $1', [normalizedPhone]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found. Please verify OTP first.' });
        }
        const user = userResult.rows[0];
        // Check if email is associated with a company
        let company_id = null;
        let is_company_verified = false;
        if (email) {
            const emailLower = email.toLowerCase();
            // Check if email is in company_employees table
            const employeeResult = await (0, database_1.query)(`SELECT ce.*, c.name as company_name
         FROM company_employees ce
         JOIN companies c ON ce.company_id = c.id
         WHERE ce.employee_email = $1 AND ce.is_active = true AND c.is_active = true`, [emailLower]);
            if (employeeResult.rows.length > 0) {
                company_id = employeeResult.rows[0].company_id;
                is_company_verified = true;
                // Link employee to user account
                await (0, database_1.query)(`UPDATE company_employees
           SET user_id = $1, is_verified = true, verified_at = NOW()
           WHERE id = $2`, [user.id, employeeResult.rows[0].id]);
            }
            else {
                // Check if email domain allows self-registration
                const emailDomain = emailLower.split('@')[1];
                const domainResult = await (0, database_1.query)(`SELECT id FROM companies
           WHERE email_domain = $1
           AND allow_employee_self_registration = true
           AND is_active = true`, [emailDomain]);
                if (domainResult.rows.length > 0) {
                    company_id = domainResult.rows[0].id;
                    is_company_verified = true;
                    // Create employee record
                    await (0, database_1.query)(`INSERT INTO company_employees (company_id, employee_email, full_name, is_verified, verified_at, user_id, is_active)
             VALUES ($1, $2, $3, true, NOW(), $4, true)
             ON CONFLICT (company_id, employee_email) DO UPDATE
             SET user_id = $4, is_verified = true, verified_at = NOW()`, [company_id, emailLower, `${name} ${surname || ''}`.trim(), user.id]);
                }
            }
        }
        // Update user with registration data
        const updateResult = await (0, database_1.query)(`UPDATE users
       SET name = $1,
           surname = $2,
           email = $3,
           birthday = $4,
           gender = $5,
           company = $6,
           email_consent = $7,
           sms_consent = $8,
           preferred_outlet = $9,
           company_id = $10,
           is_company_verified = $11,
           registration_completed = true
       WHERE phone = $12
       RETURNING *`, [
            name,
            surname,
            email?.toLowerCase(),
            birthday,
            gender,
            company,
            email_consent || false,
            sms_consent || false,
            preferred_outlet,
            company_id,
            is_company_verified,
            normalizedPhone
        ]);
        const updatedUser = updateResult.rows[0];
        // Generate new token with updated user data
        const token = (0, jwt_1.generateToken)({
            id: updatedUser.id,
            phone: updatedUser.phone,
            type: 'customer'
        });
        res.json({
            token,
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                surname: updatedUser.surname,
                phone: updatedUser.phone,
                email: updatedUser.email,
                birthday: updatedUser.birthday,
                gender: updatedUser.gender,
                company: updatedUser.company,
                points_balance: updatedUser.points_balance,
                company_id: updatedUser.company_id,
                is_company_verified: updatedUser.is_company_verified,
                registration_completed: true
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to complete registration' });
    }
});
// Get current user (customer)
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const token = authHeader.substring(7);
        const { verifyToken } = require('../utils/jwt');
        const payload = verifyToken(token);
        const result = await (0, database_1.query)(`SELECT u.*,
              COALESCE(SUM(t.amount), 0) as total_spend,
              COUNT(DISTINCT t.id) FILTER (WHERE t.transaction_type = 'purchase') as total_purchases_count
       FROM users u
       LEFT JOIN transactions t ON u.id = t.user_id
       WHERE u.id = $1
       GROUP BY u.id`, [payload.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = result.rows[0];
        res.json({
            user: {
                id: user.id,
                name: user.name,
                surname: user.surname,
                phone: user.phone,
                email: user.email,
                birthday: user.birthday,
                gender: user.gender,
                company: user.company,
                points_balance: user.points_balance,
                user_type: user.user_type,
                customer_id: user.customer_id,
                company_id: user.company_id,
                is_company_verified: user.is_company_verified,
                total_spend: parseFloat(user.total_spend) || 0,
                total_purchases_count: parseInt(user.total_purchases_count) || 0,
                created_at: user.created_at,
                type: user.user_type || 'customer'
            }
        });
    }
    catch (error) {
        console.error('Get current user error:', error);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map