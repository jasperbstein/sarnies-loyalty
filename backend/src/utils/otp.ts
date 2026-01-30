import { query } from '../db/database';

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);

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
  if (isDev) {
    console.log(`📱 OTP for ${phone}: ${otp}`);
    console.log(`⚠️  SMS disabled. Use OTP code above for testing.`);
  }
  // TODO: Implement actual SMS sending via Twilio in production
};
