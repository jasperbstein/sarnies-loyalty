import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import crypto from 'crypto';

// JWT_SECRET must be set in environment - use same secret as main auth
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production environment');
}

// Use dev-only fallback for local development
const SECRET = JWT_SECRET || 'dev-only-insecure-secret-do-not-use-in-production';

/**
 * Generate improved static QR code with enhanced security
 */
export async function generateStaticQR(customerId: number): Promise<{
  token: string;
  dataUrl: string;
  createdAt: Date;
}> {
  const createdAt = new Date();

  // Enhanced JWT payload with version, issuer, and nonce for integrity
  const payload = {
    version: 1,
    type: 'loyalty_id',
    customer_id: customerId.toString().padStart(6, '0'),
    issuer: 'sarnies_loyalty',
    nonce: crypto.randomBytes(8).toString('hex'), // Tamper resistance
    iat: Math.floor(createdAt.getTime() / 1000)
  };

  // Non-expiring token for static QR (customer's permanent ID)
  // Omit expiresIn to create non-expiring token
  const token = jwt.sign(payload, SECRET);

  // Pre-generate QR code image as data URL
  const dataUrl = await QRCode.toDataURL(token, {
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'M' // Medium error correction (good balance)
  });

  return {
    token,
    dataUrl,
    createdAt
  };
}

/**
 * Validate and decode static QR token
 */
export function verifyStaticQR(token: string): {
  valid: boolean;
  customerId?: string;
  error?: string;
} {
  try {
    const decoded = jwt.verify(token, SECRET) as any;

    // Validate payload structure
    if (!decoded.type || decoded.type !== 'loyalty_id') {
      return { valid: false, error: 'Invalid QR code type' };
    }

    if (!decoded.customer_id) {
      return { valid: false, error: 'Missing customer ID' };
    }

    // Optional: Check version for future migrations
    if (decoded.version && decoded.version > 1) {
      return { valid: false, error: 'QR code version not supported' };
    }

    // Optional: Verify issuer
    if (decoded.issuer && decoded.issuer !== 'sarnies_loyalty') {
      return { valid: false, error: 'Invalid QR code issuer' };
    }

    return {
      valid: true,
      customerId: decoded.customer_id
    };
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return { valid: false, error: 'QR code expired' };
    }
    if (error.name === 'JsonWebTokenError') {
      return { valid: false, error: 'Invalid QR code' };
    }
    return { valid: false, error: 'QR verification failed' };
  }
}
