import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt';
import { isTokenBlacklisted } from '../utils/tokenBlacklist';

export interface AuthRequest extends Request {
  user?: JWTPayload;
  token?: string;  // Store raw token for logout
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    // Check if token is blacklisted (for logout/revocation)
    if (payload.jti) {
      const blacklisted = await isTokenBlacklisted(payload.jti);
      if (blacklisted) {
        return res.status(401).json({ error: 'Token has been revoked' });
      }
    }

    req.user = payload;
    req.token = token;  // Store for potential logout
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireStaff = requireRole(['staff', 'admin']);
export const requireAdmin = requireRole(['admin']);
