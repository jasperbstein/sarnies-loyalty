import { query } from '../db/database';
import { sendOTPEmail } from './email';

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);

// Initialize Twilio client (lazy - only when needed)
let twilioClient: any = null;

const getTwilioClient = (): any => {
  if (twilioClient) return twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken || accountSid.startsWith('your_')) {
    return null;
  }

  // Dynamic require to avoid TypeScript import issues
  const twilio = require('twilio');
  twilioClient = twilio(accountSid, authToken);
  return twilioClient;
};

export const generateOTP = (): string => {
  // In development, always use 123456 for easy testing
  if (process.env.NODE_ENV === 'development') {
    return '123456';
  }

  // In production, generate random 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const saveOTP = async (phone: string, otp: string): Promise<void> => {
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await query(
    `INSERT INTO otp_sessions (phone, otp_code, expires_at)
     VALUES ($1, $2, $3)`,
    [phone, otp, expiresAt]
  );
};

const isDev = process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true';

export const verifyOTP = async (phone: string, otp: string): Promise<boolean> => {
  if (isDev) {
    console.log(`🔍 Verifying OTP for ${phone}, code: ${otp}`);
  }

  const result = await query(
    `SELECT * FROM otp_sessions
     WHERE phone = $1 AND otp_code = $2 AND expires_at > NOW() AND verified = false
     ORDER BY created_at DESC
     LIMIT 1`,
    [phone, otp]
  );

  if (result.rows.length === 0) {
    if (isDev) {
      console.log(`❌ OTP verification failed for ${phone}`);

      // Check if OTP exists but is expired or already verified
      const debugResult = await query(
        `SELECT otp_code, expires_at, verified, created_at FROM otp_sessions
         WHERE phone = $1 ORDER BY created_at DESC LIMIT 1`,
        [phone]
      );

      if (debugResult.rows.length > 0) {
        const session = debugResult.rows[0];
        console.log(`   Latest OTP: ${session.otp_code}, Expires: ${session.expires_at}, Verified: ${session.verified}`);
      }
    }

    return false;
  }

  // Mark OTP as verified
  await query(
    `UPDATE otp_sessions SET verified = true WHERE id = $1`,
    [result.rows[0].id]
  );

  if (isDev) {
    console.log(`✅ OTP verified successfully for ${phone}`);
  }
  return true;
};

export const sendOTP = async (phone: string, otp: string): Promise<void> => {
  // Always log in dev for debugging
  if (isDev) {
    console.log(`📱 OTP for ${phone}: ${otp}`);
  }

  const client = getTwilioClient();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  // If Twilio is not configured, just log (dev mode)
  if (!client || !fromNumber || fromNumber.startsWith('your_')) {
    if (isDev) {
      console.log(`⚠️  Twilio not configured. Use OTP code above for testing.`);
    } else {
      console.error('❌ Twilio not configured! SMS will not be sent.');
    }
    return;
  }

  try {
    const message = await client.messages.create({
      body: `Your Sarnies verification code is: ${otp}. This code expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      from: fromNumber,
      to: phone
    });

    console.log(`✅ SMS sent to ${phone}, SID: ${message.sid}`);
  } catch (error: any) {
    console.error(`❌ Failed to send SMS to ${phone}:`, error.message);
    // Don't throw - let the flow continue even if SMS fails
    // The OTP is still saved in DB and can be verified
    if (!isDev) {
      // In production, we might want to alert about SMS failures
      console.error('SMS sending failed - user may not receive OTP');
    }
  }
};

// ============================================
// EMAIL-BASED OTP (alternative to SMS)
// ============================================

export const saveEmailOTP = async (email: string, otp: string): Promise<void> => {
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Store in same table, using phone column for email (it's just an identifier)
  await query(
    `INSERT INTO otp_sessions (phone, otp_code, expires_at)
     VALUES ($1, $2, $3)`,
    [email.toLowerCase(), otp, expiresAt]
  );
};

export const verifyEmailOTP = async (email: string, otp: string): Promise<boolean> => {
  const emailLower = email.toLowerCase();

  if (isDev) {
    console.log(`🔍 Verifying email OTP for ${emailLower}, code: ${otp}`);
  }

  const result = await query(
    `SELECT * FROM otp_sessions
     WHERE phone = $1 AND otp_code = $2 AND expires_at > NOW() AND verified = false
     ORDER BY created_at DESC
     LIMIT 1`,
    [emailLower, otp]
  );

  if (result.rows.length === 0) {
    if (isDev) {
      console.log(`❌ Email OTP verification failed for ${emailLower}`);
    }
    return false;
  }

  // Mark OTP as verified
  await query(
    `UPDATE otp_sessions SET verified = true WHERE id = $1`,
    [result.rows[0].id]
  );

  if (isDev) {
    console.log(`✅ Email OTP verified successfully for ${emailLower}`);
  }
  return true;
};

export const sendEmailOTP = async (email: string, otp: string): Promise<void> => {
  // Always log in dev for debugging
  if (isDev) {
    console.log(`📧 Email OTP for ${email}: ${otp}`);
  }

  try {
    await sendOTPEmail(email, otp);
    console.log(`✅ OTP email sent to ${email}`);
  } catch (error: any) {
    console.error(`❌ Failed to send OTP email to ${email}:`, error.message);
    // Don't throw - let the flow continue
    // In dev mode, the OTP is logged above
  }
};
