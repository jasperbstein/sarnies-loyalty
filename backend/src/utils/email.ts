import { Resend } from 'resend';

// Initialize Resend - API key MUST be set in environment
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('RESEND_API_KEY must be set in production environment');
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@sarnies.tech';
const FROM_NAME = 'Sarnies Loyalty';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  console.log(`📧 Sending email to ${options.to}: ${options.subject}`);
  console.log(`📧 From: ${FROM_NAME} <${FROM_EMAIL}>`);

  // In development without API key, log and skip actual sending
  if (!resend) {
    console.log(`📧 [DEV MODE] Email would be sent to ${options.to}`);
    console.log(`📧 [DEV MODE] Subject: ${options.subject}`);
    console.log(`📧 [DEV MODE] Body: ${options.text.substring(0, 200)}...`);
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text,
    });

    if (error) {
      console.error(`❌ Resend API error:`, JSON.stringify(error, null, 2));
      throw new Error(`Failed to send email: ${error.message || 'Unknown error'}`);
    }

    console.log(`✅ Email sent successfully to ${options.to}`, data);
  } catch (error: any) {
    console.error(`❌ Failed to send email:`, error.message || error);
    throw error;
  }
};

export const sendOTPEmail = async (email: string, otp: string, companyName?: string): Promise<void> => {
  const subject = 'Your Sarnies Verification Code';

  const text = companyName
    ? `Welcome to Sarnies Loyalty as a ${companyName} employee!\n\nYour verification code is: ${otp}\n\nThis code expires in 5 minutes.`
    : `Your Sarnies verification code is: ${otp}\n\nThis code expires in 5 minutes.`;

  const html = companyName
    ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1B1B1B;">Welcome to Sarnies Loyalty</h2>
        <p>You're registering as a <strong>${companyName}</strong> employee.</p>
        <div style="background: #F5F5F5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <p style="margin: 0; color: #6F6F6F;">Your verification code is:</p>
          <h1 style="margin: 10px 0; color: #1B1B1B; font-size: 32px; letter-spacing: 4px;">${otp}</h1>
        </div>
        <p style="color: #6F6F6F; font-size: 14px;">This code expires in 5 minutes.</p>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1B1B1B;">Sarnies Verification Code</h2>
        <div style="background: #F5F5F5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <p style="margin: 0; color: #6F6F6F;">Your verification code is:</p>
          <h1 style="margin: 10px 0; color: #1B1B1B; font-size: 32px; letter-spacing: 4px;">${otp}</h1>
        </div>
        <p style="color: #6F6F6F; font-size: 14px;">This code expires in 5 minutes.</p>
      </div>
    `;

  await sendEmail({ to: email, subject, text, html });
};

export const sendStaffVerificationEmail = async (email: string, verificationLink: string, staffName: string): Promise<void> => {
  const subject = 'Verify your Sarnies Staff account';

  const text = `Hi ${staffName},\n\nWelcome to Sarnies! Please verify your email by clicking the link below:\n\n${verificationLink}\n\nThis link expires in 24 hours.\n\nIf you didn't create this account, you can ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1B1B1B; margin: 0; font-size: 24px;">Sarnies Loyalty</h1>
      </div>

      <h2 style="color: #1B1B1B; font-size: 20px; margin-bottom: 20px;">Welcome, ${staffName}!</h2>

      <p style="color: #4A4A4A; font-size: 16px; line-height: 1.5;">
        Please verify your email address to complete your staff account setup.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationLink}"
           style="display: inline-block; background: #1B1B1B; color: #FFFFFF; text-decoration: none;
                  padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 500;">
          Verify Email
        </a>
      </div>

      <p style="color: #6F6F6F; font-size: 14px; line-height: 1.5;">
        Or copy and paste this link into your browser:
      </p>
      <p style="color: #1B1B1B; font-size: 12px; word-break: break-all; background: #F5F5F5;
                padding: 12px; border-radius: 6px;">
        ${verificationLink}
      </p>

      <hr style="border: none; border-top: 1px solid #E5E5E5; margin: 30px 0;">

      <p style="color: #9A9A9A; font-size: 12px; line-height: 1.5;">
        This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.
      </p>
    </div>
  `;

  await sendEmail({ to: email, subject, text, html });
};

export const sendPasswordResetEmail = async (email: string, resetLink: string): Promise<void> => {
  const subject = 'Reset your Sarnies password';

  const text = `You requested a password reset for your Sarnies Staff account.\n\nClick the link below to reset your password:\n\n${resetLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1B1B1B; margin: 0; font-size: 24px;">Sarnies Loyalty</h1>
      </div>

      <h2 style="color: #1B1B1B; font-size: 20px; margin-bottom: 20px;">Reset your password</h2>

      <p style="color: #4A4A4A; font-size: 16px; line-height: 1.5;">
        We received a request to reset your password. Click the button below to choose a new password.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}"
           style="display: inline-block; background: #1B1B1B; color: #FFFFFF; text-decoration: none;
                  padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 500;">
          Reset Password
        </a>
      </div>

      <p style="color: #6F6F6F; font-size: 14px; line-height: 1.5;">
        Or copy and paste this link into your browser:
      </p>
      <p style="color: #1B1B1B; font-size: 12px; word-break: break-all; background: #F5F5F5;
                padding: 12px; border-radius: 6px;">
        ${resetLink}
      </p>

      <hr style="border: none; border-top: 1px solid #E5E5E5; margin: 30px 0;">

      <p style="color: #9A9A9A; font-size: 12px; line-height: 1.5;">
        This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>
  `;

  await sendEmail({ to: email, subject, text, html });
};

export const sendMagicLinkEmail = async (email: string, magicLink: string): Promise<void> => {
  const subject = 'Sign in to Sarnies Loyalty';

  const text = `Click here to sign in to Sarnies Loyalty:\n\n${magicLink}\n\nThis link expires in 15 minutes. If you didn't request this, you can ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1B1B1B; margin: 0; font-size: 24px;">Sarnies Loyalty</h1>
      </div>

      <h2 style="color: #1B1B1B; font-size: 20px; margin-bottom: 20px;">Sign in to your account</h2>

      <p style="color: #4A4A4A; font-size: 16px; line-height: 1.5;">
        Click the button below to sign in to Sarnies Loyalty. This link will expire in 15 minutes.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${magicLink}"
           style="display: inline-block; background: #1B1B1B; color: #FFFFFF; text-decoration: none;
                  padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 500;">
          Sign in to Sarnies
        </a>
      </div>

      <p style="color: #6F6F6F; font-size: 14px; line-height: 1.5;">
        Or copy and paste this link into your browser:
      </p>
      <p style="color: #1B1B1B; font-size: 12px; word-break: break-all; background: #F5F5F5;
                padding: 12px; border-radius: 6px;">
        ${magicLink}
      </p>

      <hr style="border: none; border-top: 1px solid #E5E5E5; margin: 30px 0;">

      <p style="color: #9A9A9A; font-size: 12px; line-height: 1.5;">
        If you didn't request this email, you can safely ignore it. Someone may have typed your email address by mistake.
      </p>
    </div>
  `;

  await sendEmail({ to: email, subject, text, html });
};
