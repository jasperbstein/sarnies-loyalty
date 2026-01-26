"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMagicLinkEmail = exports.sendOTPEmail = exports.sendEmail = void 0;
const resend_1 = require("resend");
// Initialize Resend
const resend = new resend_1.Resend(process.env.RESEND_API_KEY || 're_41JJzMcf_K1MVxrAVTLCqPXyNrCsZPN1u');
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@sarnies.tech';
const FROM_NAME = 'Sarnies Loyalty';
const sendEmail = async (options) => {
    console.log(`📧 Sending email to ${options.to}: ${options.subject}`);
    console.log(`📧 From: ${FROM_NAME} <${FROM_EMAIL}>`);
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
    }
    catch (error) {
        console.error(`❌ Failed to send email:`, error.message || error);
        throw error;
    }
};
exports.sendEmail = sendEmail;
const sendOTPEmail = async (email, otp, companyName) => {
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
    await (0, exports.sendEmail)({ to: email, subject, text, html });
};
exports.sendOTPEmail = sendOTPEmail;
const sendMagicLinkEmail = async (email, magicLink) => {
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
    await (0, exports.sendEmail)({ to: email, subject, text, html });
};
exports.sendMagicLinkEmail = sendMagicLinkEmail;
//# sourceMappingURL=email.js.map