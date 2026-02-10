import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { query } from '../db/database';
import { generateToken, REMEMBER_ME_DURATIONS, RememberMeDuration } from '../utils/jwt';
import { generateOTP, saveOTP, sendOTP, verifyOTP, saveEmailOTP, sendEmailOTP, verifyEmailOTP } from '../utils/otp';
import { generateMagicToken, generateSessionId, saveMagicToken, verifyMagicToken, checkMagicLinkRateLimit, getSessionIdForToken } from '../utils/magicLink';
import { getSocket } from '../socket';
import { otpLimiter, authLimiter } from '../middleware/rateLimiter';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validatePasswordStrength } from '../utils/passwordValidator';
import { blacklistToken } from '../utils/tokenBlacklist';
import { decodeToken } from '../utils/jwt';
import { logFailedAttempt, isAccountLocked } from '../utils/loginAttempts';
import { getUserFriendlyMessage, handleAndLogError, createErrorResponse } from '../utils/errorMessages';
import { sendMagicLinkEmail, sendStaffVerificationEmail, sendPasswordResetEmail } from '../utils/email';
import { authMethodsService } from '../services/authMethods';

const router = Router();

// =============================================================================
// UNIFIED AUTHENTICATION - IDENTIFY ENDPOINT
// =============================================================================

// Identify user type from phone or email
router.post('/identify', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;

    if (!identifier || typeof identifier !== 'string') {
      return res.status(400).json({
        error: 'missing_identifier',
        message: 'Please enter your phone number or email address.'
      });
    }

    const trimmed = identifier.trim();

    // Detect if it's a phone number or email
    const isPhone = /^[+\d\s-]+$/.test(trimmed) && trimmed.replace(/\D/g, '').length >= 9;
    const isEmail = trimmed.includes('@') && trimmed.includes('.');

    if (!isPhone && !isEmail) {
      return res.status(400).json({
        error: 'invalid_identifier',
        message: 'Please enter a valid phone number or email address.'
      });
    }

    // Phone-based identification (customer)
    if (isPhone) {
      const normalizedPhone = normalizePhone(trimmed);

      // Check if user exists
      const userResult = await query(
        'SELECT id, name, registration_completed FROM users WHERE phone = $1',
        [normalizedPhone]
      );

      const existingUser = userResult.rows.length > 0;
      const registrationCompleted = existingUser && userResult.rows[0].registration_completed;

      return res.json({
        identifier_type: 'phone',
        user_type: 'customer',
        auth_method: 'otp',
        existing_user: existingUser,
        registration_completed: registrationCompleted,
        next_step: 'send_otp'
      });
    }

    // Email-based identification
    const emailLower = trimmed.toLowerCase();
    const emailDomain = emailLower.split('@')[1];

    if (!emailDomain) {
      return res.status(400).json({
        error: 'invalid_email',
        message: 'Please enter a valid email address.'
      });
    }

    // Priority 0: Check staff_users table FIRST (existing staff/admin)
    // Staff must use password authentication, not magic links
    const staffResult = await query(
      `SELECT id, name, role, is_verified, active FROM staff_users WHERE email = $1`,
      [emailLower]
    );

    if (staffResult.rows.length > 0) {
      const staff = staffResult.rows[0];
      return res.json({
        identifier_type: 'email',
        user_type: staff.role === 'admin' ? 'admin' : 'staff',
        auth_method: 'password',
        existing_user: true,
        is_verified: staff.is_verified,
        is_active: staff.active,
        next_step: staff.is_verified && staff.active ? 'enter_password' : 'verify_email'
      });
    }

    // Priority 1: Check if email is linked to an existing user (LINE users, email-registered)
    // This allows users who registered via LINE to log in with their linked email
    const existingUserByEmail = await query(
      `SELECT id, name, email, line_id, phone, registration_completed, user_type, email_verified
       FROM users WHERE LOWER(email) = $1`,
      [emailLower]
    );

    if (existingUserByEmail.rows.length > 0) {
      const user = existingUserByEmail.rows[0];
      // If user has LINE linked, they can use LINE to login
      // Or they can use email OTP
      return res.json({
        identifier_type: 'email',
        user_type: user.user_type || 'customer',
        auth_method: 'otp', // Email OTP for customers
        existing_user: true,
        registration_completed: user.registration_completed,
        has_line: !!user.line_id,
        has_phone: !!user.phone && !user.phone.startsWith('LINE') && !user.phone.startsWith('E'),
        next_step: 'send_email_otp'
      });
    }

    // Priority 2: Check company_employees table (existing employee - corporate partners)
    const employeeResult = await query(
      `SELECT ce.id, ce.full_name, ce.user_id, ce.is_verified,
              c.id as company_id, c.name as company_name, c.logo_url, c.discount_percentage
       FROM company_employees ce
       JOIN companies c ON ce.company_id = c.id
       WHERE ce.employee_email = $1 AND ce.is_active = true AND c.is_active = true`,
      [emailLower]
    );

    if (employeeResult.rows.length > 0) {
      const employee = employeeResult.rows[0];
      return res.json({
        identifier_type: 'email',
        user_type: 'employee',
        auth_method: 'magic_link',
        existing_user: !!employee.user_id,
        company: {
          id: employee.company_id,
          name: employee.company_name,
          logo_url: employee.logo_url,
          discount_percentage: employee.discount_percentage
        },
        next_step: 'send_magic_link'
      });
    }

    // Priority 3: Check companies.staff_email_domain (new Sarnies staff registration)
    const staffDomainResult = await query(
      `SELECT id, name, logo_url, staff_default_branch
       FROM companies
       WHERE staff_email_domain = $1
       AND allow_staff_self_registration = true
       AND is_active = true`,
      [emailDomain]
    );

    if (staffDomainResult.rows.length > 0) {
      const company = staffDomainResult.rows[0];
      return res.json({
        identifier_type: 'email',
        user_type: 'new_staff',
        auth_method: 'password',
        existing_user: false,
        company: {
          id: company.id,
          name: company.name,
          logo_url: company.logo_url,
          default_branch: company.staff_default_branch
        },
        next_step: 'staff_register'
      });
    }

    // Priority 4: Check companies.email_domain (corporate employee self-registration)
    const employeeDomainResult = await query(
      `SELECT id, name, logo_url, discount_percentage
       FROM companies
       WHERE email_domain = $1
       AND allow_employee_self_registration = true
       AND is_active = true`,
      [emailDomain]
    );

    if (employeeDomainResult.rows.length > 0) {
      const company = employeeDomainResult.rows[0];
      return res.json({
        identifier_type: 'email',
        user_type: 'employee',
        auth_method: 'magic_link',
        existing_user: false,
        company: {
          id: company.id,
          name: company.name,
          logo_url: company.logo_url,
          discount_percentage: company.discount_percentage
        },
        next_step: 'send_magic_link'
      });
    }

    // No match - new user, use magic link to create account
    return res.json({
      identifier_type: 'email',
      user_type: 'customer',
      auth_method: 'magic_link',
      existing_user: false,
      next_step: 'send_magic_link',
      message: 'We\'ll send you a magic link to sign in or create your account.'
    });

  } catch (error) {
    const message = handleAndLogError('Identify', error, 'Unable to process your request. Please try again.');
    res.status(500).json({
      error: 'identify_failed',
      message: message
    });
  }
});

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
    const { email, password, remember_me } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!email || !password) {
      return res.status(400).json({
        error: 'missing_credentials',
        message: 'Please enter both your email and password.'
      });
    }

    // Check if account is temporarily locked due to too many failed attempts
    const locked = await isAccountLocked(email, 10, 15);
    if (locked) {
      return res.status(429).json({
        error: 'account_locked',
        message: 'Too many failed login attempts. Please wait 15 minutes before trying again.'
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

    // Determine token expiry based on remember_me setting
    const expiresIn = remember_me && REMEMBER_ME_DURATIONS[remember_me as RememberMeDuration]
      ? remember_me
      : undefined; // Uses default JWT_EXPIRES_IN

    const token = generateToken({
      id: staff.id,
      email: staff.email,
      role: staff.role,
      type: 'staff'
    }, expiresIn);

    res.json({
      token,
      user: {
        id: staff.id,
        email: staff.email,
        name: staff.name,
        role: staff.role,
        branch: staff.branch,
        type: 'staff'
      },
      remember_me: expiresIn || '7d'
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

    // Never expose OTP in response - it should only be sent via SMS
    res.json({
      message: 'OTP sent successfully',
      expiresIn: '5 minutes'
    });
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
    let { phone, otp, remember_me } = req.body;

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

    // Determine token expiry based on remember_me setting
    const expiresIn = remember_me && REMEMBER_ME_DURATIONS[remember_me as RememberMeDuration]
      ? remember_me
      : undefined; // Uses default JWT_EXPIRES_IN

    const token = generateToken({
      id: user.id,
      phone: user.phone,
      type: user.user_type || 'customer'
    }, expiresIn);

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
      needs_registration: !user.registration_completed,
      remember_me: expiresIn || '7d'
    });
  } catch (error) {
    const message = handleAndLogError('OTP verify', error, 'Unable to verify code. Please try again.');
    res.status(500).json({
      error: 'verification_failed',
      message: message
    });
  }
});

// =============================================================================
// EMAIL-BASED OTP (alternative to SMS for customers)
// =============================================================================

// Send OTP to customer via email
router.post('/otp/email/send', otpLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'missing_email',
        message: 'Please enter your email address to receive a verification code.'
      });
    }

    const emailLower = email.toLowerCase().trim();

    // Validate email format
    if (!emailLower.includes('@') || !emailLower.includes('.')) {
      return res.status(400).json({
        error: 'invalid_email',
        message: 'Please enter a valid email address.'
      });
    }

    const otp = generateOTP();
    await saveEmailOTP(emailLower, otp);
    await sendEmailOTP(emailLower, otp);

    res.json({
      message: 'Verification code sent to your email',
      expiresIn: '5 minutes'
    });
  } catch (error) {
    const message = handleAndLogError('Email OTP send', error, 'Unable to send verification code. Please try again.');
    res.status(500).json({
      error: 'otp_send_failed',
      message: message
    });
  }
});

// Verify email OTP and login customer
router.post('/otp/email/verify', otpLimiter, async (req: Request, res: Response) => {
  try {
    const { email, otp, remember_me } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        error: 'missing_fields',
        message: 'Please enter your email address and verification code.'
      });
    }

    const emailLower = email.toLowerCase().trim();

    const valid = await verifyEmailOTP(emailLower, otp);

    if (!valid) {
      return res.status(401).json({
        error: 'invalid_otp',
        message: getUserFriendlyMessage('invalid_otp')
      });
    }

    // Check if user exists by email
    let userResult = await query('SELECT * FROM users WHERE LOWER(email) = $1', [emailLower]);

    // If no user found by email, create a new one
    if (userResult.rows.length === 0) {
      // Create new user with email (no placeholder phone - proper auth tracking)
      const insertResult = await query(
        `INSERT INTO users (email, email_verified, registration_completed, user_type, primary_auth_method)
         VALUES ($1, true, false, 'customer', 'email')
         RETURNING *`,
        [emailLower]
      );
      userResult = insertResult;
    } else {
      // Mark email as verified if not already
      await query(
        'UPDATE users SET email_verified = true WHERE id = $1 AND email_verified IS NOT TRUE',
        [userResult.rows[0].id]
      );
    }

    const user = userResult.rows[0];

    // Determine token expiry based on remember_me setting
    const expiresIn = remember_me && REMEMBER_ME_DURATIONS[remember_me as RememberMeDuration]
      ? remember_me
      : undefined;

    const token = generateToken({
      id: user.id,
      email: user.email,
      type: user.user_type || 'customer'
    }, expiresIn);

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
      needs_registration: !user.registration_completed,
      remember_me: expiresIn || '7d'
    });
  } catch (error) {
    const message = handleAndLogError('Email OTP verify', error, 'Unable to verify code. Please try again.');
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
      user_id, // For LINE users who don't have phone yet
      name,
      surname,
      email,
      birthday,
      gender,
      company,
      email_consent,
      sms_consent,
      preferred_outlet,
      company_id: inviteCompanyId // From company invite code
    } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'missing_fields',
        message: 'Please provide your name to complete registration.'
      });
    }

    let user;

    // Support both phone-based and user_id-based lookup (for LINE users)
    if (user_id) {
      // LINE user - lookup by ID
      const userResult = await query('SELECT * FROM users WHERE id = $1', [user_id]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          error: 'user_not_found',
          message: 'User not found. Please try logging in again.'
        });
      }
      user = userResult.rows[0];
    } else if (phone) {
      // Phone-based user
      const normalizedPhone = normalizePhone(phone);
      const userResult = await query('SELECT * FROM users WHERE phone = $1', [normalizedPhone]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          error: 'user_not_found',
          message: 'Please verify your phone number first before completing registration.'
        });
      }
      user = userResult.rows[0];
    } else {
      return res.status(400).json({
        error: 'missing_fields',
        message: 'Please provide your phone number or user ID.'
      });
    }

    // Check if email is associated with a company
    // Priority: invite code company_id > email domain matching
    let company_id = null;
    let is_company_verified = false;

    // If company_id provided from invite code, use it directly
    if (inviteCompanyId) {
      // Verify the company exists and is active
      const companyCheck = await query(
        'SELECT id, invite_code_uses FROM companies WHERE id = $1 AND is_active = true',
        [inviteCompanyId]
      );
      if (companyCheck.rows.length > 0) {
        company_id = inviteCompanyId;
        is_company_verified = true; // Verified via invite code

        // Increment invite code usage counter
        await query(
          'UPDATE companies SET invite_code_uses = COALESCE(invite_code_uses, 0) + 1 WHERE id = $1',
          [inviteCompanyId]
        );
      }
    }

    // If no company from invite code, check email domain
    if (!company_id && email) {
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

    // Determine user_type based on company association
    // If user has a verified company, they are an employee; otherwise customer
    // For join flow: user already has company set, preserve that
    const finalUserType = user.user_type === 'employee' ? 'employee' :
                          (company_id && is_company_verified) ? 'employee' : 'customer';
    const finalCompanyId = user.company_id || company_id;
    const finalIsCompanyVerified = user.is_company_verified || is_company_verified;

    // Use existing email if not provided (magic link users already have email)
    const finalEmail = email?.toLowerCase() || user.email;

    // Update user with registration data (use ID for reliable lookup)
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
           user_type = $12,
           registration_completed = true
       WHERE id = $13
       RETURNING *`,
      [
        name,
        surname,
        finalEmail,
        birthday,
        gender,
        company,
        email_consent || false,
        sms_consent || false,
        preferred_outlet,
        finalCompanyId,
        finalIsCompanyVerified,
        finalUserType,
        user.id
      ]
    );

    const updatedUser = updateResult.rows[0];

    // Generate new token with correct user_type
    const token = generateToken({
      id: updatedUser.id,
      phone: updatedUser.phone,
      type: finalUserType
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
        user_type: finalUserType,
        type: finalUserType,
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
// MAGIC LINK AUTHENTICATION (for all users)
// =============================================================================

// Send magic link to any email - works for customers, employees, and new users
router.post('/magic-link/send', otpLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'missing_email',
        message: 'Please enter your email address.'
      });
    }

    const emailLower = email.toLowerCase().trim();

    // Validate email format
    if (!emailLower.includes('@') || !emailLower.includes('.')) {
      return res.status(400).json({
        error: 'invalid_email',
        message: 'Please enter a valid email address.'
      });
    }

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

    // Generate session ID for WebSocket-based login notification
    const sessionId = generateSessionId();

    // Generate and save magic token with session ID
    const token = generateMagicToken();
    await saveMagicToken(emailLower, token, sessionId);

    // Build magic link URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const magicLink = `${baseUrl}/auth/verify?token=${token}`;

    // Send magic link email
    await sendMagicLinkEmail(emailLower, magicLink);

    // Return session ID so frontend can listen for login confirmation via WebSocket
    res.json({
      message: 'Magic link sent successfully',
      expiresIn: '30 minutes',
      sessionId: sessionId
    });
  } catch (error) {
    const message = handleAndLogError('Magic link send', error, 'Unable to send login link. Please try again.');
    res.status(500).json({
      error: 'magic_link_failed',
      message: message
    });
  }
});

// Verify magic link token and authenticate user (works for all user types)
router.get('/magic-link/verify/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { remember_me } = req.query;

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

    let user;
    let userType: 'customer' | 'employee' | 'staff' | 'investor' | 'media' = 'customer';
    let companyId = null;
    let isCompanyVerified = false;
    let needsRegistration = false;

    // Step 1: Check if user already exists with this email
    const existingUserResult = await query(
      'SELECT * FROM users WHERE LOWER(email) = $1',
      [email]
    );

    if (existingUserResult.rows.length > 0) {
      user = existingUserResult.rows[0];
      userType = user.user_type || 'customer';
      companyId = user.company_id;
      isCompanyVerified = user.is_company_verified;
      needsRegistration = !user.registration_completed;

      // Mark email as verified
      await query(
        'UPDATE users SET email_verified = true WHERE id = $1',
        [user.id]
      );
    } else {
      // Step 2: Check if this email is in company_employees table
      const employeeResult = await query(
        `SELECT ce.*, c.name as company_name, c.id as company_id, c.discount_percentage
         FROM company_employees ce
         JOIN companies c ON ce.company_id = c.id
         WHERE ce.employee_email = $1 AND ce.is_active = true AND c.is_active = true`,
        [email]
      );

      if (employeeResult.rows.length > 0) {
        const employee = employeeResult.rows[0];

        // Check if employee is linked to a user account
        if (employee.user_id) {
          const userResult = await query('SELECT * FROM users WHERE id = $1', [employee.user_id]);
          if (userResult.rows.length > 0) {
            user = userResult.rows[0];
            userType = 'employee';
            companyId = employee.company_id;
            isCompanyVerified = true;
          }
        }

        // If no user account linked, create one for the employee
        if (!user) {
          const nameParts = (employee.full_name || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          const createUserResult = await query(
            `INSERT INTO users (name, surname, email, email_verified, company_id, is_company_verified, user_type, registration_completed, primary_auth_method)
             VALUES ($1, $2, $3, true, $4, true, 'employee', false, 'email')
             RETURNING *`,
            [firstName, lastName, email, employee.company_id]
          );

          user = createUserResult.rows[0];
          userType = 'employee';
          companyId = employee.company_id;
          isCompanyVerified = true;
          needsRegistration = true;

          // Link employee record to new user
          await query(
            `UPDATE company_employees SET user_id = $1, is_verified = true, verified_at = NOW() WHERE id = $2`,
            [user.id, employee.id]
          );
        }
      } else {
        // Step 3: Check email domain for company self-registration
        const emailDomain = email.split('@')[1];
        const domainResult = await query(
          `SELECT id, name, discount_percentage FROM companies
           WHERE email_domain = $1 AND allow_employee_self_registration = true AND is_active = true`,
          [emailDomain]
        );

        if (domainResult.rows.length > 0) {
          // Auto-assign to company based on email domain
          const company = domainResult.rows[0];
          const namePart = email.split('@')[0].replace(/[._]/g, ' ');

          const createUserResult = await query(
            `INSERT INTO users (name, email, email_verified, company_id, is_company_verified, user_type, registration_completed, primary_auth_method)
             VALUES ($1, $2, true, $3, true, 'employee', false, 'email')
             RETURNING *`,
            [namePart, email, company.id]
          );

          user = createUserResult.rows[0];
          userType = 'employee';
          companyId = company.id;
          isCompanyVerified = true;
          needsRegistration = true;

          // Create employee record
          await query(
            `INSERT INTO company_employees (company_id, employee_email, full_name, user_id, is_verified, verified_at, is_active)
             VALUES ($1, $2, $3, $4, true, NOW(), true)
             ON CONFLICT (company_id, employee_email) DO UPDATE SET user_id = $4, is_verified = true, verified_at = NOW()`,
            [company.id, email, namePart, user.id]
          );
        } else {
          // Step 4: Create a regular customer account
          const namePart = email.split('@')[0].replace(/[._]/g, ' ');

          const createUserResult = await query(
            `INSERT INTO users (name, email, email_verified, user_type, registration_completed, primary_auth_method)
             VALUES ($1, $2, true, 'customer', false, 'email')
             RETURNING *`,
            [namePart, email]
          );

          user = createUserResult.rows[0];
          userType = 'customer';
          needsRegistration = true;
        }
      }
    }

    // Determine token expiry based on remember_me setting
    const rememberMeValue = remember_me as string;
    const expiresIn = rememberMeValue && REMEMBER_ME_DURATIONS[rememberMeValue as RememberMeDuration]
      ? rememberMeValue
      : undefined;

    // Generate JWT token
    const jwtToken = generateToken({
      id: user.id,
      email: email,
      type: userType
    }, expiresIn);

    const userData = {
      id: user.id,
      name: user.name,
      surname: user.surname,
      phone: user.phone,
      email: email,
      birthday: user.birthday,
      gender: user.gender,
      company: user.company,
      company_id: companyId,
      points_balance: user.points_balance,
      user_type: userType,
      is_company_verified: isCompanyVerified,
      created_at: user.created_at,
      registration_completed: user.registration_completed,
      type: userType
    };

    // Emit WebSocket event to notify waiting login page
    const sessionId = await getSessionIdForToken(token);
    if (sessionId) {
      try {
        const io = getSocket();
        io.to(`magic-link:${sessionId}`).emit('magic_link_verified', {
          success: true,
          token: jwtToken,
          user: userData,
          needs_registration: needsRegistration
        });
        console.log(`📡 Emitted magic_link_verified to session ${sessionId}`);
      } catch (socketError) {
        console.error('Failed to emit WebSocket event:', socketError);
      }
    }

    res.json({
      token: jwtToken,
      user: userData,
      needs_registration: needsRegistration
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

    // Send verification email
    try {
      await sendStaffVerificationEmail(emailLower, verificationLink, name);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails - staff can request resend
    }

    // Auto-verify in development for convenience
    if (process.env.NODE_ENV === 'development') {
      await query('UPDATE staff_users SET is_verified = true WHERE id = $1', [newStaff.id]);
    }

    // Never expose verification token in response
    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      staff: {
        id: newStaff.id,
        email: newStaff.email,
        name: newStaff.name,
        branch: newStaff.branch
      }
    });
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

    // Send verification email
    try {
      await sendStaffVerificationEmail(staff.email, verificationLink, staff.name);
    } catch (emailError) {
      console.error('Failed to resend verification email:', emailError);
    }

    // Never expose verification token in response
    res.json({
      message: 'Verification email sent. Please check your inbox.'
    });
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

      // Send password reset email
      try {
        await sendPasswordResetEmail(emailLower, resetLink);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
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
      `SELECT ce.*, c.name as company_name, c.users_collect_points, c.discount_percentage as company_discount
       FROM company_employees ce
       JOIN companies c ON ce.company_id = c.id
       WHERE ce.user_id = $1`,
      [user.id]
    );
    if (employeeResult.rows.length > 0) {
      employeeInfo = employeeResult.rows[0];
    }

    // Also check direct company_id on user (for users who joined via invite code)
    let companyInfo = null;
    if (user.company_id && !employeeInfo) {
      const companyResult = await query(
        `SELECT id, name, users_collect_points, discount_percentage FROM companies WHERE id = $1`,
        [user.company_id]
      );
      if (companyResult.rows.length > 0) {
        companyInfo = companyResult.rows[0];
      }
    }

    // Determine user type from JWT payload or employee record
    const userType = payload.type || (employeeInfo ? 'employee' : 'customer');

    // Determine if user collects points: false if company says so, or if employee
    const usersCollectPoints = employeeInfo?.users_collect_points ?? companyInfo?.users_collect_points ?? true;

    res.json({
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        phone: user.phone,
        email: payload.email || null,
        birthday: user.birthday,
        gender: user.gender,
        company: employeeInfo?.company_name || companyInfo?.name || user.company,
        company_id: employeeInfo?.company_id || user.company_id || null,
        points_balance: user.points_balance,
        users_collect_points: usersCollectPoints,
        user_type: userType,
        is_company_verified: employeeInfo ? employeeInfo.is_verified : (user.is_company_verified || false),
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
