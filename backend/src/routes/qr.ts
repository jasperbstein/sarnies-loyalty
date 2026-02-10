import { Router, Response } from 'express';
import QRCode from 'qrcode';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateQRToken, verifyQRToken, QR_TOKEN_EXPIRY_SECONDS } from '../utils/jwt';
import { query } from '../db/database';

const router = Router();

// Use the centralized QR token expiry constant (default: 120 seconds for payment QR codes)
const QR_TOKEN_EXPIRY = QR_TOKEN_EXPIRY_SECONDS;

// Generate user QR for earning points
router.get('/user/:user_id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { user_id } = req.params;

    // Customers can only generate their own QR
    if (req.user?.type === 'customer' && req.user.id !== parseInt(user_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify user exists
    const userResult = await query('SELECT id, name, phone FROM users WHERE id = $1', [user_id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Generate token
    const token = generateQRToken(
      {
        type: 'user',
        user_id: parseInt(user_id),
        phone: user.phone
      },
      `${QR_TOKEN_EXPIRY}s`
    );

    // Generate QR code
    const qrDataURL = await QRCode.toDataURL(token);

    res.json({
      token,
      qr_code: qrDataURL,
      expires_in: parseInt(QR_TOKEN_EXPIRY),
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Generate user QR error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Generate voucher redemption QR
router.get('/voucher/:user_id/:voucher_id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { user_id, voucher_id } = req.params;

    // Customers can only generate their own voucher QR
    if (req.user?.type === 'customer' && req.user.id !== parseInt(user_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify user exists
    const userResult = await query('SELECT * FROM users WHERE id = $1', [user_id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Verify voucher exists and is active
    const voucherResult = await query(
      `SELECT * FROM vouchers
       WHERE id = $1 AND is_active = true
       AND (expiry_date IS NULL OR expiry_date > NOW())`,
      [voucher_id]
    );

    if (voucherResult.rows.length === 0) {
      return res.status(404).json({ error: 'Voucher not found or inactive' });
    }

    const voucher = voucherResult.rows[0];

    // Check if user has enough points
    if (user.points_balance < voucher.points_required) {
      return res.status(400).json({ error: 'Insufficient points' });
    }

    // Generate token
    const token = generateQRToken(
      {
        type: 'voucher',
        user_id: parseInt(user_id),
        voucher_id: parseInt(voucher_id),
        phone: user.phone
      },
      `${QR_TOKEN_EXPIRY}s`
    );

    // Generate QR code
    const qrDataURL = await QRCode.toDataURL(token);

    res.json({
      token,
      qr_code: qrDataURL,
      expires_in: parseInt(QR_TOKEN_EXPIRY),
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        points_balance: user.points_balance
      },
      voucher: {
        id: voucher.id,
        name: voucher.name,
        points_required: voucher.points_required
      }
    });
  } catch (error) {
    console.error('Generate voucher QR error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Verify QR token (staff only)
router.post('/verify', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Verify token
    const payload = verifyQRToken(token);

    // Get user data
    const userResult = await query('SELECT * FROM users WHERE id = $1', [payload.user_id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    const response: any = {
      type: payload.type,
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        phone: user.phone,
        points_balance: user.points_balance
      }
    };

    // If voucher redemption, include voucher data
    if (payload.type === 'voucher') {
      const voucherResult = await query('SELECT * FROM vouchers WHERE id = $1', [payload.voucher_id]);

      if (voucherResult.rows.length === 0) {
        return res.status(404).json({ error: 'Voucher not found' });
      }

      const voucher = voucherResult.rows[0];

      // Validate voucher
      if (!voucher.is_active) {
        return res.status(400).json({ error: 'Voucher is not active' });
      }

      if (voucher.expiry_date && new Date(voucher.expiry_date) < new Date()) {
        return res.status(400).json({ error: 'Voucher has expired' });
      }

      // Check if user has enough points
      if (user.points_balance < voucher.points_required) {
        return res.status(400).json({ error: 'User has insufficient points' });
      }

      response.voucher = {
        id: voucher.id,
        name: voucher.name,
        description: voucher.description,
        points_required: voucher.points_required,
        voucher_type: voucher.voucher_type,
        value_amount: voucher.value_amount
      };
    }

    res.json(response);
  } catch (error: any) {
    console.error('Verify QR error:', error);
    res.status(400).json({ error: error.message || 'Invalid or expired QR code' });
  }
});

export default router;
