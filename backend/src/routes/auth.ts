import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { query } from '../db/database';
import { generateToken } from '../utils/jwt';
import { generateOTP, saveOTP, sendOTP, verifyOTP } from '../utils/otp';
import { generateMagicToken, saveMagicToken, verifyMagicToken, checkMagicLinkRateLimit } from '../utils/magicLink';
import { otpLimiter, authLimiter } from '../middleware/rateLimiter';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validatePasswordStrength } from '../utils/passwordValidator';
import { blacklistToken } from '../utils/tokenBlacklist';
import { decodeToken } from '../utils/jwt';
import { logFailedAttempt, isAccountLocked } from '../utils/loginAttempts';
import { getUserFriendlyMessage, handleAndLogError, createErrorResponse } from '../utils/errorMessages';
import { sendMagicLinkEmail } from '../utils/email';

const router = Router();

// Generate verification token for staff registration
const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Normalize phone number (remove spaces, ensure it starts with +)
const normalizePhone = (phone: string): string => {
  let normalized = phone.replace(/\s+/g, '').trim();
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  return normalized;
};

// Staff login (rate limited to prevent brute force)
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!email || !password) {
      return res.status(400).json({
        error: 'missing_credentials',
        message: 'Please enter both your email and password.'
      });
    }

    // Check if account is temporarily locked due to too many failed attempts
    const locked = await isAccountLocked(email, 5, 15);
    if (locked) {
      return res.status(429).json({
        error: 'account_locked',
        message: getUserFriendlyMessage('account_locked')
      });
    }

    const result = await query(
      'SELECT * FROM staff_users WHERE email = $1 AND active = true',
      [email]
    );

    if (result.rows.length === 0) {
      // Log failed attempt (user not found)
      await logFailedAttempt(email, ipAddress, userAgent, 'staff');
      return res.status(401).json({
        error: 'invalid_credentials',
        message: getUserFriendlyMessage('invalid_credentials')
      });
    }

    const staff = result.rows[0];
    const validPassword = await bcrypt.compare(password, staff.password_hash);

    if (!validPassword) {
      // Log failed attempt (wrong password)
      await logFailedAttempt(email, ipAddress, userAgent, 'staff');
      return res.status(401).json({
        error: 'invalid_credentials',
        message: getUserFriendlyMessage('invalid_credentials')
      });
    }

    const token = generateToken({
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
  } catch (error) {
    const message = handleAndLogError('Login', error);
    res.status(500).json({
      error: 'server_error',
      message: message
    });
  }
});

// Send OTP to customer
router.post('/otp/send', otpLimiter, async (req: Request, res: Response) => {
  try {
    let { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        error: 'missing_phone',
        message: 'Please enter your phone number to receive a verification code.'
      });
    }

    // Normalize phone number
    phone = normalizePhone(phone);

    const otp = generateOTP();
    await saveOTP(phone, otp);
    await sendOTP(phone, otp);

    // In development/demo, return OTP for testing convenience
    const response: any = {
      message: 'OTP sent successfully',
      expiresIn: '5 minutes'
    };

    // Always return OTP for demo/testing (remove this check for true production)
    if (process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true') {
      response.otp = otp; // Include OTP for auto-fill
    }

    res.json(response);
  } catch (error) {
    const message = handleAndLogError('OTP send', error, 'Unable to send verification code. Please try again.');
    res.status(500).json({
      error: 'otp_send_failed',
      message: message
    });
  }
});

// Verify OTP and login customer
router.post('/otp/verify', otpLimiter, async (req: Request, res: Response) => {
  try {
    let { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        error: 'missing_fields',
        message: 'Please enter your phone number and verification code.'
      });
    }

    // Normalize phone number
    phone = normalizePhone(phone);

    const valid = await verifyOTP(phone, otp);

    if (!valid) {
      return res.status(401).json({
        error: 'invalid_otp',
        message: getUserFriendlyMessage('invalid_otp')
      });
    }

    // Check if user exists - reject if not found
    let userResult = await query('SELECT * FROM users WHERE phone = $1', [phone]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'phone_not_registered',
        message: getUserFriendlyMessage('phone_not_registered')
      });
    }

    const user = userResult.rows[0];

    const token = generateToken({
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
  } catch (error) {
    const message = handleAndLogError('OTP verify', error, 'Unable to verify code. Please try again.');
    res.status(500).json({
      error: 'verification_failed',
      message: message
    });
  }
});

// Complete user registration
router.post('/register', async (req: Request, res: Response) => {
  try {
    const {
      phone,
      name,
      surname,
      email,
      birthday,
      gender,
      company,
      email_consent,
      sms_consent,
      preferred_outlet
    } = req.body;

    if (!phone || !name) {
      return res.status(400).json({
        error: 'missing_fields',
        message: 'Please provide your phone number and name to complete registration.'
      });
    }

    const normalizedPhone = normalizePhone(phone);

    // Check if user exists
    const userResult = await query('SELECT * FROM users WHERE phone = $1', [normalizedPhone]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'Please verify your phone number first before completing registration.'
      });
    }

    const user = userResult.rows[0];

    // Check if email is associated with a company
    let company_id = null;
    let is_company_verified = false;

    if (email) {
      const emailLower = email.toLowerCase();

      // Check if email is in company_employees table
      const employeeResult = await query(
        `SELECT ce.*, c.name as company_name
         FROM company_employees ce
         JOIN companies c ON ce.company_id = c.id
         WHERE ce.employee_email = $1 AND ce.is_active = true AND c.is_active = true`,
        [emailLower]
      );

      if (employeeResult.rows.length > 0) {
        company_id = employeeResult.rows[0].company_id;
        is_company_verified = true;

        // Link employee to user account
        await query(
          `UPDATE company_employees
           SET user_id = $1, is_verified = true, verified_at = NOW()
           WHERE id = $2`,
          [user.id, employeeResult.rows[0].id]
        );
      } else {
        // Check if email domain allows self-registration
        const emailDomain = emailLower.split('@')[1];
        const domainResult = await query(
          `SELECT id FROM companies
           WHERE email_domain = $1
           AND allow_employee_self_registration = true
           AND is_active = true`,
          [emailDomain]
        );

        if (domainResult.rows.length > 0) {
          company_id = domainResult.rows[0].id;
          is_company_verified = true;

          // Create employee record
          await query(
            `INSERT INTO company_employees (company_id, employee_email, full_name, is_verified, verified_at, user_id, is_active)
             VALUES ($1, $2, $3, true, NOW(), $4, true)
             ON CONFLICT (company_id, employee_email) DO UPDATE
             SET user_id = $4, is_verified = true, verified_at = NOW()`,
            [company_id, emailLower, `${name} ${surname || ''}`.trim(), user.id]
          );
        }
      }
    }

    // Update user with registration data
    const updateResult = await query(
      `UPDATE users
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
       RETURNING *`,
      [
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
      ]
    );

    const updatedUser = updateResult.rows[0];

    // Generate new token with updated user data
    const token = generateToken({
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
  } catch (error) {
    const message = handleAndLogError('Registration', error, 'Unable to complete registration. Please try again.');
    res.status(500).json({
      error: 'registration_failed',
      message: message
    });
  }
});

// =============================================================================
// MAGIC LINK AUTHENTICATION (for employees)
// =============================================================================

// Send magic link to employee email
router.post('/magic-link/send', otpLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'missing_email',
        message: 'Please enter your work email address.'
      });
    }

    const emailLower = email.toLowerCase().trim();

    // Check rate limit
    const rateLimit = await checkMagicLinkRateLimit(emailLower);
    if (!rateLimit.allowed) {
      const minutes = Math.ceil((rateLimit.retryAfterSeconds || 0) / 60);
      return res.status(429).json({
        error: 'rate_limit_exceeded',
        message: `Too many login attempts. Please wait ${minutes} minute${minutes !== 1 ? 's' : ''} before trying again.`,
        retryAfterSeconds: rateLimit.retryAfterSeconds
      });
    }

    // Check if email is associated with a company employee
    const employeeResult = await query(
      `SELECT ce.*, c.name as company_name, u.id as user_id, u.name as user_name
       FROM company_employees ce
       JOIN companies c ON ce.company_id = c.id
       LEFT JOIN users u ON ce.user_id = u.id
       WHERE ce.employee_email = $1 AND ce.is_active = true AND c.is_active = true`,
      [emailLower]
    );

    if (employeeResult.rows.length === 0) {
      // Also check by email domain for self-registration companies
      const emailDomain = emailLower.split('@')[1];
      const domainResult = await query(
        `SELECT id, name FROM companies
         WHERE email_domain = $1 AND allow_employee_self_registration = true AND is_active = true`,
        [emailDomain]
      );

      if (domainResult.rows.length === 0) {
        // In dev mode, auto-create employee for any @sarnies.com email
        if ((process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true') && emailDomain === 'sarnies.com') {
          // Get or create Sarnies company
          let companyResult = await query(`SELECT id FROM companies WHERE email_domain = 'sarnies.com' LIMIT 1`);
          let companyId: number;

          if (companyResult.rows.length === 0) {
            const newCompany = await query(
              `INSERT INTO companies (name, email_domain, is_active, allow_employee_self_registration)
               VALUES ('Sarnies', 'sarnies.com', true, true) RETURNING id`
            );
            companyId = newCompany.rows[0].id;
          } else {
            companyId = companyResult.rows[0].id;
          }

          // Create employee record
          const namePart = emailLower.split('@')[0].replace(/[._]/g, ' ');
          await query(
            `INSERT INTO company_employees (company_id, employee_email, full_name, is_active)
             VALUES ($1, $2, $3, true)
             ON CONFLICT (company_id, employee_email) DO NOTHING`,
            [companyId, emailLower, namePart]
          );
          console.log(`📧 Auto-created employee for dev: ${emailLower}`);
        } else {
          // Don't reveal if email exists or not for security
          return res.json({
            message: 'If this email is registered, a magic link will be sent',
            expiresIn: '15 minutes'
          });
        }
      }
    }

    // Generate and save magic token
    const token = generateMagicToken();
    await saveMagicToken(emailLower, token);

    // Build magic link URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const magicLink = `${baseUrl}/auth/verify?token=${token}`;

    // In development/demo, return the link for testing
    const response: any = {
      message: 'Magic link sent successfully',
      expiresIn: '15 minutes'
    };

    if (process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true') {
      response.magicLink = magicLink;
      response.token = token;
    }

    // Send magic link email
    await sendMagicLinkEmail(emailLower, magicLink);

    // Only log sensitive data in development
    if (process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true') {
      console.log(`📧 Magic link generated for ${emailLower}: ${magicLink}`);
    }

    res.json(response);
  } catch (error) {
    const message = handleAndLogError('Magic link send', error, 'Unable to send login link. Please try again.');
    res.status(500).json({
      error: 'magic_link_failed',
      message: message
    });
  }
});

// Verify magic link token and authenticate employee
router.get('/magic-link/verify/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        error: 'missing_token',
        message: 'Login link is incomplete. Please use the link from your email.'
      });
    }

    // Verify the magic token - returns email if valid
    const email = await verifyMagicToken(token);

    if (!email) {
      return res.status(401).json({
        error: 'magic_link_expired',
        message: getUserFriendlyMessage('magic_link_expired')
      });
    }

    // Find the employee record
    const employeeResult = await query(
      `SELECT ce.*, c.name as company_name, c.id as company_id
       FROM company_employees ce
       JOIN companies c ON ce.company_id = c.id
       WHERE ce.employee_email = $1 AND ce.is_active = true AND c.is_active = true`,
      [email]
    );

    let user;
    let needsRegistration = false;

    if (employeeResult.rows.length > 0) {
      const employee = employeeResult.rows[0];

      // Check if employee is linked to a user account
      if (employee.user_id) {
        const userResult = await query('SELECT * FROM users WHERE id = $1', [employee.user_id]);
        if (userResult.rows.length > 0) {
          user = userResult.rows[0];
        }
      }

      // If no user account linked, create one automatically for verified employee
      if (!user) {
        // Parse employee name into name/surname
        const nameParts = (employee.full_name || 'Employee').split(' ');
        const firstName = nameParts[0] || 'Employee';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Generate a unique phone placeholder (employees don't need phone for auth)
        // Phone is varchar(20), so keep it short
        const phonePlaceholder = `E${Date.now().toString(36)}`;

        // Create user account for employee
        const createUserResult = await query(
          `INSERT INTO users (name, surname, phone, company)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [firstName, lastName, phonePlaceholder, employee.company_name]
        );

        user = createUserResult.rows[0];

        // Link employee record to new user
        await query(
          `UPDATE company_employees SET user_id = $1, is_verified = true, verified_at = NOW() WHERE id = $2`,
          [user.id, employee.id]
        );
      }
    } else {
      // Check by domain for self-registration
      const emailDomain = email.split('@')[1];
      const domainResult = await query(
        `SELECT id, name FROM companies
         WHERE email_domain = $1 AND allow_employee_self_registration = true AND is_active = true`,
        [emailDomain]
      );

      if (domainResult.rows.length > 0) {
        // Valid domain - they need to complete registration
        return res.json({
          needs_registration: true,
          email: email,
          company: {
            id: domainResult.rows[0].id,
            name: domainResult.rows[0].name
          }
        });
      } else {
        return res.status(401).json({
          error: 'email_not_authorized',
          message: 'This email address is not authorized for employee access. Please contact your administrator.'
        });
      }
    }

    // Generate JWT token (use the verified email from magic link)
    const jwtToken = generateToken({
      id: user.id,
      email: email,
      type: 'employee'
    });

    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        phone: user.phone,
        email: email,
        birthday: user.birthday,
        gender: user.gender,
        company: user.company,
        points_balance: user.points_balance,
        user_type: 'employee',
        is_company_verified: true,
        created_at: user.created_at,
        type: 'employee'
      }
    });
  } catch (error) {
    const message = handleAndLogError('Magic link verify', error, 'Unable to verify login link. Please request a new one.');
    res.status(500).json({
      error: 'magic_link_verification_failed',
      message: message
    });
  }
});

// =============================================================================
// STAFF SELF-REGISTRATION
// =============================================================================

// Check if email is eligible for staff registration
router.post('/staff/check-email', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'missing_email',
        message: 'Please enter your work email address.'
      });
    }

    const emailLower = email.toLowerCase().trim();
    const emailDomain = emailLower.split('@')[1];

    if (!emailDomain) {
      return res.status(400).json({
        error: 'invalid_email_format',
        message: getUserFriendlyMessage('invalid_email_format')
      });
    }

    // Check if email domain is registered for staff self-registration
    const companyResult = await query(
      `SELECT id, name, slug, logo_url, staff_default_branch
       FROM companies
       WHERE staff_email_domain = $1
       AND allow_staff_self_registration = true
       AND is_active = true`,
      [emailDomain]
    );

    if (companyResult.rows.length === 0) {
      return res.json({
        eligible: false,
        message: 'This email domain is not registered for staff self-registration'
      });
    }

    // Check if staff already exists with this email
    const existingStaff = await query(
      'SELECT id, is_verified FROM staff_users WHERE email = $1',
      [emailLower]
    );

    if (existingStaff.rows.length > 0) {
      if (existingStaff.rows[0].is_verified) {
        return res.json({
          eligible: false,
          message: 'An account with this email already exists. Please login instead.',
          already_registered: true
        });
      } else {
        return res.json({
          eligible: true,
          company: companyResult.rows[0],
          pending_verification: true,
          message: 'Account pending verification. Check your email or request a new verification link.'
        });
      }
    }

    res.json({
      eligible: true,
      company: companyResult.rows[0]
    });
  } catch (error) {
    const message = handleAndLogError('Staff email check', error, 'Unable to verify email eligibility. Please try again.');
    res.status(500).json({
      error: 'email_check_failed',
      message: message
    });
  }
});

// Register new staff member
router.post('/staff/register', otpLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, name, branch } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'missing_fields',
        message: 'Please fill in all required fields: email, password, and name.'
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'password_too_weak',
        message: getUserFriendlyMessage('password_too_weak'),
        details: passwordValidation.errors
      });
    }

    const emailLower = email.toLowerCase().trim();
    const emailDomain = emailLower.split('@')[1];

    // Verify email domain is allowed for staff registration
    const companyResult = await query(
      `SELECT id, name, staff_default_branch
       FROM companies
       WHERE staff_email_domain = $1
       AND allow_staff_self_registration = true
       AND is_active = true`,
      [emailDomain]
    );

    if (companyResult.rows.length === 0) {
      return res.status(403).json({
        error: 'email_domain_not_allowed',
        message: getUserFriendlyMessage('email_domain_not_allowed')
      });
    }

    const company = companyResult.rows[0];

    // Check if staff already exists
    const existingStaff = await query('SELECT id FROM staff_users WHERE email = $1', [emailLower]);
    if (existingStaff.rows.length > 0) {
      return res.status(400).json({
        error: 'email_already_exists',
        message: getUserFriendlyMessage('email_already_exists')
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create staff user (unverified)
    const staffBranch = branch || company.staff_default_branch || 'Main';

    const result = await query(
      `INSERT INTO staff_users (
        email, password_hash, name, role, branch, company_id,
        is_verified, verification_token, verification_token_expires, active
      ) VALUES ($1, $2, $3, 'staff', $4, $5, false, $6, $7, false)
      RETURNING id, email, name, branch`,
      [emailLower, passwordHash, name, staffBranch, company.id, verificationToken, tokenExpires]
    );

    const newStaff = result.rows[0];

    // Build verification link
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const verificationLink = `${baseUrl}/auth/verify-staff?token=${verificationToken}`;

    // In development/demo, return the link for testing
    const response: any = {
      message: 'Registration successful. Please check your email to verify your account.',
      staff: {
        id: newStaff.id,
        email: newStaff.email,
        name: newStaff.name,
        branch: newStaff.branch
      }
    };

    if (process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true') {
      response.verificationLink = verificationLink;
      response.verificationToken = verificationToken;
    }

    // TODO: Send verification email in production
    console.log(`📧 Staff verification link for ${emailLower}: ${verificationLink}`);

    res.status(201).json(response);
  } catch (error: any) {
    console.error('Staff registration error:', error);
    if (error.code === '23505') {
      res.status(400).json({
        error: 'email_already_exists',
        message: getUserFriendlyMessage('email_already_exists')
      });
    } else {
      const message = handleAndLogError('Staff registration', error, 'Unable to create your account. Please try again.');
      res.status(500).json({
        error: 'registration_failed',
        message: message
      });
    }
  }
});

// Verify staff email
router.get('/staff/verify/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        error: 'missing_token',
        message: 'Verification link is incomplete. Please use the link from your email.'
      });
    }

    // Find staff by token
    const result = await query(
      `SELECT * FROM staff_users
       WHERE verification_token = $1
       AND verification_token_expires > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'verification_token_expired',
        message: getUserFriendlyMessage('verification_token_expired')
      });
    }

    const staff = result.rows[0];

    // Mark as verified and activate
    await query(
      `UPDATE staff_users
       SET is_verified = true, verified_at = NOW(), active = true,
           verification_token = NULL, verification_token_expires = NULL
       WHERE id = $1`,
      [staff.id]
    );

    // Generate JWT token
    const jwtToken = generateToken({
      id: staff.id,
      email: staff.email,
      role: staff.role,
      type: 'staff'
    });

    res.json({
      message: 'Email verified successfully. You can now login.',
      token: jwtToken,
      user: {
        id: staff.id,
        email: staff.email,
        name: staff.name,
        role: staff.role,
        branch: staff.branch,
        type: 'staff'
      }
    });
  } catch (error) {
    const message = handleAndLogError('Staff verification', error, 'Unable to verify your email. Please try again.');
    res.status(500).json({
      error: 'verification_failed',
      message: message
    });
  }
});

// Resend staff verification email
router.post('/staff/resend-verification', otpLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'missing_email',
        message: 'Please enter your email address.'
      });
    }

    const emailLower = email.toLowerCase().trim();

    // Find unverified staff
    const result = await query(
      'SELECT * FROM staff_users WHERE email = $1 AND is_verified = false',
      [emailLower]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists for security
      return res.json({ message: 'If an unverified account exists, a verification email will be sent.' });
    }

    const staff = result.rows[0];

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await query(
      `UPDATE staff_users
       SET verification_token = $1, verification_token_expires = $2
       WHERE id = $3`,
      [verificationToken, tokenExpires, staff.id]
    );

    // Build verification link
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const verificationLink = `${baseUrl}/auth/verify-staff?token=${verificationToken}`;

    const response: any = {
      message: 'Verification email sent. Please check your inbox.'
    };

    if (process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true') {
      response.verificationLink = verificationLink;
      response.verificationToken = verificationToken;
    }

    // TODO: Send verification email in production
    console.log(`📧 Staff verification resent for ${emailLower}: ${verificationLink}`);

    res.json(response);
  } catch (error) {
    const message = handleAndLogError('Resend verification', error, 'Unable to resend verification email. Please try again.');
    res.status(500).json({
      error: 'resend_failed',
      message: message
    });
  }
});

// Staff forgot password - request reset
router.post('/staff/forgot-password', otpLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'missing_email',
        message: 'Please enter your email address to reset your password.'
      });
    }

    const emailLower = email.toLowerCase().trim();

    // Find staff by email
    const result = await query(
      'SELECT id, email, name FROM staff_users WHERE email = $1 AND active = true',
      [emailLower]
    );

    // Always return success to prevent email enumeration
    const response: any = {
      message: 'If an account with this email exists, a password reset link will be sent.'
    };

    if (result.rows.length > 0) {
      const staff = result.rows[0];

      // Generate reset token
      const resetToken = generateVerificationToken();
      const tokenExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

      await query(
        `UPDATE staff_users
         SET password_reset_token = $1, password_reset_expires = $2
         WHERE id = $3`,
        [resetToken, tokenExpires, staff.id]
      );

      // Build reset link
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      const resetLink = `${baseUrl}/staff/reset-password?token=${resetToken}`;

      if (process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true') {
        response.resetLink = resetLink;
        response.resetToken = resetToken;
      }

      // TODO: Send reset email in production
      if (process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true') {
        console.log(`📧 Staff password reset link for ${emailLower}: ${resetLink}`);
      }
    }

    res.json(response);
  } catch (error) {
    const message = handleAndLogError('Staff forgot password', error, 'Unable to process password reset. Please try again.');
    res.status(500).json({
      error: 'password_reset_request_failed',
      message: message
    });
  }
});

// Staff reset password - complete reset
router.post('/staff/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        error: 'missing_fields',
        message: 'Please provide both the reset token and your new password.'
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'password_too_weak',
        message: getUserFriendlyMessage('password_too_weak'),
        details: passwordValidation.errors
      });
    }

    // Find staff by reset token
    const result = await query(
      `SELECT * FROM staff_users
       WHERE password_reset_token = $1
       AND password_reset_expires > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'verification_token_expired',
        message: 'This password reset link has expired. Please request a new one.'
      });
    }

    const staff = result.rows[0];

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await query(
      `UPDATE staff_users
       SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL
       WHERE id = $2`,
      [passwordHash, staff.id]
    );

    res.json({ message: 'Password reset successfully. You can now login with your new password.' });
  } catch (error) {
    const message = handleAndLogError('Staff reset password', error, 'Unable to reset password. Please try again.');
    res.status(500).json({
      error: 'password_reset_failed',
      message: message
    });
  }
});

// Get current user (customer or employee)
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'unauthorized',
        message: getUserFriendlyMessage('unauthorized')
      });
    }

    const token = authHeader.substring(7);
    const { verifyToken } = require('../utils/jwt');
    const payload = verifyToken(token);

    const result = await query(
      `SELECT u.*,
              COALESCE(SUM(t.amount), 0) as total_spend,
              COUNT(DISTINCT t.id) FILTER (WHERE t.transaction_type = 'purchase') as total_purchases_count
       FROM users u
       LEFT JOIN transactions t ON u.id = t.user_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [payload.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'Your account could not be found. Please log in again.'
      });
    }

    const user = result.rows[0];

    // Check if this user is linked to an employee record
    let employeeInfo = null;
    const employeeResult = await query(
      `SELECT ce.*, c.name as company_name
       FROM company_employees ce
       JOIN companies c ON ce.company_id = c.id
       WHERE ce.user_id = $1`,
      [user.id]
    );
    if (employeeResult.rows.length > 0) {
      employeeInfo = employeeResult.rows[0];
    }

    // Determine user type from JWT payload or employee record
    const userType = payload.type || (employeeInfo ? 'employee' : 'customer');

    res.json({
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        phone: user.phone,
        email: payload.email || null,
        birthday: user.birthday,
        gender: user.gender,
        company: employeeInfo?.company_name || user.company,
        points_balance: user.points_balance,
        user_type: userType,
        is_company_verified: employeeInfo ? employeeInfo.is_verified : false,
        total_spend: parseFloat(user.total_spend) || 0,
        total_purchases_count: parseInt(user.total_purchases_count) || 0,
        created_at: user.created_at,
        type: userType
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(401).json({
      error: 'token_expired',
      message: getUserFriendlyMessage('token_expired')
    });
  }
});

// Logout - blacklist the current token
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const token = req.headers.authorization?.substring(7);

    if (!token) {
      return res.status(400).json({
        error: 'missing_token',
        message: 'No session found to log out.'
      });
    }

    const payload = decodeToken(token);

    if (payload?.jti && payload?.exp) {
      // Blacklist the token until its natural expiry
      const expiresAt = new Date(payload.exp * 1000);
      await blacklistToken(
        payload.jti,
        expiresAt,
        payload.type === 'customer' || payload.type === 'employee' ? payload.id : undefined,
        payload.type === 'staff' || payload.role === 'admin' ? payload.id : undefined,
        'logout'
      );
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    // Still return success - logout should not fail from user perspective
    res.json({ message: 'Logged out successfully' });
  }
});

export default router;
