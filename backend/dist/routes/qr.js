"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const qrcode_1 = __importDefault(require("qrcode"));
const auth_1 = require("../middleware/auth");
const jwt_1 = require("../utils/jwt");
const database_1 = require("../db/database");
const router = (0, express_1.Router)();
const QR_TOKEN_EXPIRY = process.env.QR_TOKEN_EXPIRY_SECONDS || '120';
// Generate user QR for earning points
router.get('/user/:user_id', auth_1.authenticate, async (req, res) => {
    try {
        const { user_id } = req.params;
        // Customers can only generate their own QR
        if (req.user?.type === 'customer' && req.user.id !== parseInt(user_id)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Verify user exists
        const userResult = await (0, database_1.query)('SELECT id, name, phone FROM users WHERE id = $1', [user_id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        // Generate token
        const token = (0, jwt_1.generateQRToken)({
            type: 'user',
            user_id: parseInt(user_id),
            phone: user.phone
        }, `${QR_TOKEN_EXPIRY}s`);
        // Generate QR code
        const qrDataURL = await qrcode_1.default.toDataURL(token);
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
    }
    catch (error) {
        console.error('Generate user QR error:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});
// Generate voucher redemption QR
router.get('/voucher/:user_id/:voucher_id', auth_1.authenticate, async (req, res) => {
    try {
        const { user_id, voucher_id } = req.params;
        // Customers can only generate their own voucher QR
        if (req.user?.type === 'customer' && req.user.id !== parseInt(user_id)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Verify user exists
        const userResult = await (0, database_1.query)('SELECT * FROM users WHERE id = $1', [user_id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        // Verify voucher exists and is active
        const voucherResult = await (0, database_1.query)(`SELECT * FROM vouchers
       WHERE id = $1 AND is_active = true
       AND (expires_at IS NULL OR expires_at > NOW())`, [voucher_id]);
        if (voucherResult.rows.length === 0) {
            return res.status(404).json({ error: 'Voucher not found or inactive' });
        }
        const voucher = voucherResult.rows[0];
        // Check if user has enough points
        if (user.points_balance < voucher.points_required) {
            return res.status(400).json({ error: 'Insufficient points' });
        }
        // Generate token
        const token = (0, jwt_1.generateQRToken)({
            type: 'voucher',
            user_id: parseInt(user_id),
            voucher_id: parseInt(voucher_id),
            phone: user.phone
        }, `${QR_TOKEN_EXPIRY}s`);
        // Generate QR code
        const qrDataURL = await qrcode_1.default.toDataURL(token);
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
    }
    catch (error) {
        console.error('Generate voucher QR error:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});
// Verify QR token (staff only)
router.post('/verify', auth_1.authenticate, async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }
        // Verify token
        const payload = (0, jwt_1.verifyQRToken)(token);
        // Get user data
        const userResult = await (0, database_1.query)('SELECT * FROM users WHERE id = $1', [payload.user_id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        const response = {
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
            const voucherResult = await (0, database_1.query)('SELECT * FROM vouchers WHERE id = $1', [payload.voucher_id]);
            if (voucherResult.rows.length === 0) {
                return res.status(404).json({ error: 'Voucher not found' });
            }
            const voucher = voucherResult.rows[0];
            // Validate voucher
            if (!voucher.is_active) {
                return res.status(400).json({ error: 'Voucher is not active' });
            }
            if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
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
    }
    catch (error) {
        console.error('Verify QR error:', error);
        res.status(400).json({ error: error.message || 'Invalid or expired QR code' });
    }
});
exports.default = router;
//# sourceMappingURL=qr.js.map