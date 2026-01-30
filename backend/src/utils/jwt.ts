import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
// Reduced default from 30d to 7d for better security
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET not set in environment. Using insecure default for development only.');
}

const SECRET = JWT_SECRET || 'dev-only-insecure-secret-do-not-use-in-production';

export interface JWTPayload {
  id: number;
  email?: string;
  phone?: string;
  role?: string;
  type: 'staff' | 'customer' | 'employee' | 'investor' | 'media';
  jti?: string;  // JWT ID for blacklisting
  exp?: number;  // Expiry timestamp
  iat?: number;  // Issued at timestamp
}

export const generateToken = (payload: JWTPayload): string => {
  // Add unique JWT ID for blacklist support
  const jti = crypto.randomBytes(16).toString('hex');
  return jwt.sign({ ...payload, jti }, SECRET, { expiresIn: JWT_EXPIRES_IN } as any);
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Decode token without verification (for getting JTI from potentially expired tokens)
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
};

// Default QR token expiry for payment/redemption QR codes (120 seconds)
// This can be overridden via QR_TOKEN_EXPIRY_SECONDS env variable
export const QR_TOKEN_EXPIRY_SECONDS = process.env.QR_TOKEN_EXPIRY_SECONDS || '120';

/**
 * Generate a QR token with configurable expiry
 * @param data - Payload data for the token
 * @param expiresIn - Expiry time (e.g., '120s', '10m', '24h'). Use undefined for no expiry (static tokens)
 */
export const generateQRToken = (data: any, expiresIn?: string): string => {
  // If no expiry specified, create a non-expiring token (for static user QR codes)
  if (expiresIn === undefined) {
    return jwt.sign(data, SECRET);
  }
  // Default to configured expiry if empty string passed
  const expiry = expiresIn || `${QR_TOKEN_EXPIRY_SECONDS}s`;
  return jwt.sign(data, SECRET, { expiresIn: expiry } as any);
};

export const verifyQRToken = (token: string): any => {
  try {
    return jwt.verify(token, SECRET);
  } catch (error) {
    throw new Error('Invalid or expired QR token');
  }
};
