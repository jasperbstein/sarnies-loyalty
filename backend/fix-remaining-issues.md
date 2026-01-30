# Remaining Fixes Needed:

## 3. Add authentication to Settings API ✓
## 4. Fix company creation to auto-generate slug ✓
## 5. Fix invalid role error in staff.ts to return 400 not 500 ✓
## 6. Adjust rate limiting (discussed with user - seems okay)

---

# Production Deployment Checklist

## Email Integration (Resend)

**Status:** Partially implemented - development mode logs, production requires API key

### Setup Steps:
1. Create account at https://resend.com
2. Add your domain and verify DNS records
3. Generate an API key
4. Set environment variables:
   ```
   RESEND_API_KEY=re_your_api_key_here
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

### Implemented Email Types:
- [x] OTP verification emails (`sendOTPEmail`)
- [x] Magic link sign-in emails (`sendMagicLinkEmail`)
- [ ] Password reset emails (TODO: uncomment in auth.ts)
- [ ] Welcome emails (TODO)
- [ ] Transaction confirmation (TODO)

### Files:
- `src/utils/email.ts` - Email sending utility (Resend SDK)
- `src/routes/auth.ts` - Uses email for magic link and password reset

---

## SMS Integration (Twilio)

**Status:** NOT implemented - placeholder only

### Setup Steps:
1. Create account at https://twilio.com
2. Get your Account SID and Auth Token
3. Purchase a phone number with SMS capability
4. Set environment variables:
   ```
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

### Implementation Required:
1. Install Twilio SDK: `npm install twilio`
2. Update `src/utils/otp.ts`:
   ```typescript
   import twilio from 'twilio';

   const client = twilio(
     process.env.TWILIO_ACCOUNT_SID,
     process.env.TWILIO_AUTH_TOKEN
   );

   export const sendOTP = async (phone: string, otp: string): Promise<void> => {
     if (process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true') {
       console.log(`📱 OTP for ${phone}: ${otp}`);
       return;
     }

     await client.messages.create({
       body: `Your Sarnies verification code is: ${otp}. Valid for 5 minutes.`,
       from: process.env.TWILIO_PHONE_NUMBER,
       to: phone
     });
   };
   ```

### Current OTP Behavior:
- Development: Always returns `123456` and logs to console
- Production: Generates random 6-digit OTP but doesn't send SMS

---

## Push Notifications (Web Push / VAPID)

**Status:** Partially implemented - infrastructure exists

### Setup Steps:
1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Set environment variables:
   ```
   VAPID_PUBLIC_KEY=your_public_key
   VAPID_PRIVATE_KEY=your_private_key
   VAPID_SUBJECT=mailto:support@yourdomain.com
   ```

### Files:
- `src/services/pushNotifications.ts` - Push notification service

---

## Required Environment Variables (Production)

```env
# REQUIRED - App will crash without these in production
DATABASE_URL=postgresql://...
JWT_SECRET=your-secure-random-secret-min-32-chars

# REQUIRED for email functionality
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# REQUIRED for SMS functionality
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+...

# RECOMMENDED
NODE_ENV=production
FRONTEND_URL=https://app.yourdomain.com
BACKEND_URL=https://api.yourdomain.com
CORS_ORIGINS=https://app.yourdomain.com

# OPTIONAL (have defaults)
PORT=3000
JWT_EXPIRES_IN=30d
OTP_EXPIRY_MINUTES=5
QR_TOKEN_EXPIRY_SECONDS=120
POINTS_PER_100_THB=1
```

---

## Security Fixes Applied

1. ✅ Removed hardcoded Resend API key from `email.ts`
2. ✅ Removed hardcoded JWT secret fallback from `qrCode.ts`
3. ✅ Added production mode checks - sensitive data only logged in dev
4. ✅ Fixed points calculation consistency (1 point per 100 THB everywhere)

