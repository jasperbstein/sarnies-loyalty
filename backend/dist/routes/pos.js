"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const jwt_1 = require("../utils/jwt");
const socket_1 = require("../socket");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
// Points calculation for external POS: 1 point per 100 THB
const POINTS_PER_100_THB = 1;
/**
 * POST /api/pos/scan-qr
 * Handle TWO types of QR codes:
 * 1. Static QR (loyalty_id) - Award points for purchase
 * 2. Dynamic QR (voucher_redemption) - Use voucher
 */
router.post('/scan-qr', auth_1.authenticate, async (req, res) => {
    try {
        const { qr_token, amount, outlet, staff_id } = req.body;
        if (!qr_token || !outlet || !staff_id) {
            return res.status(400).json({ error: 'qr_token, outlet, and staff_id are required' });
        }
        // Verify and decode QR token
        let payload;
        try {
            payload = (0, jwt_1.verifyQRToken)(qr_token);
        }
        catch (error) {
            return res.status(400).json({ error: 'Invalid or expired QR code' });
        }
        const { type } = payload;
        // Route to appropriate handler based on QR type
        if (type === 'loyalty_id') {
            return await handleLoyaltyIdScan(payload, amount, outlet, staff_id, res);
        }
        else if (type === 'voucher_redemption') {
            return await handleVoucherRedemption(payload, outlet, staff_id, res);
        }
        else {
            return res.status(400).json({ error: 'Invalid QR code type' });
        }
    }
    catch (error) {
        console.error('Scan QR error:', error);
        res.status(500).json({ error: 'Failed to process QR code' });
    }
});
/**
 * Handle static loyalty ID QR scan - award points for purchase
 */
async function handleLoyaltyIdScan(payload, amount, outlet, staff_id, res) {
    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid purchase amount is required for loyalty scan' });
    }
    const customerId = parseInt(payload.customer_id);
    // Get customer details
    const userResult = await (0, database_1.query)('SELECT * FROM users WHERE id = $1', [customerId]);
    if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
    }
    const user = userResult.rows[0];
    // Calculate points (1 point per 10 baht)
    const pointsAwarded = Math.floor(amount / 10);
    const newBalance = user.points_balance + pointsAwarded;
    // Update user points and total spend
    await (0, database_1.query)(`UPDATE users
     SET points_balance = $1,
         total_spend = total_spend + $2,
         total_purchases_count = total_purchases_count + 1
     WHERE id = $3`, [newBalance, amount, customerId]);
    // Create transaction record
    await (0, database_1.query)(`INSERT INTO transactions
     (user_id, type, points_delta, amount_value, outlet, staff_id)
     VALUES ($1, $2, $3, $4, $5, $6)`, [customerId, 'earn', pointsAwarded, amount, outlet, staff_id]);
    return res.json({
        type: 'points_awarded',
        customer: {
            id: user.id,
            name: user.name,
            surname: user.surname,
            phone: user.phone
        },
        points_awarded: pointsAwarded,
        new_balance: newBalance,
        amount_spent: amount
    });
}
/**
 * Handle voucher redemption QR scan - use voucher
 */
async function handleVoucherRedemption(payload, outlet, staff_id, res) {
    const { customer_id, voucher_id, voucher_instance_id, expires_at } = payload;
    // Check if QR has expired
    if (new Date(expires_at) < new Date()) {
        return res.status(400).json({ error: 'QR code has expired' });
    }
    // Get voucher instance
    const instanceResult = await (0, database_1.query)('SELECT * FROM voucher_instances WHERE uuid = $1', [voucher_instance_id]);
    if (instanceResult.rows.length === 0) {
        return res.status(404).json({ error: 'Voucher instance not found' });
    }
    const instance = instanceResult.rows[0];
    // Check if already used
    if (instance.status === 'used') {
        return res.status(400).json({ error: 'Voucher has already been used' });
    }
    // Check if expired
    if (instance.status === 'expired') {
        return res.status(400).json({ error: 'Voucher has expired' });
    }
    // Get customer details
    const userResult = await (0, database_1.query)('SELECT * FROM users WHERE id = $1', [instance.user_id]);
    if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
    }
    const user = userResult.rows[0];
    // Get voucher details
    const voucherResult = await (0, database_1.query)('SELECT * FROM vouchers WHERE id = $1', [voucher_id]);
    if (voucherResult.rows.length === 0) {
        return res.status(404).json({ error: 'Voucher not found' });
    }
    const voucher = voucherResult.rows[0];
    // Mark voucher instance as used
    await (0, database_1.query)(`UPDATE voucher_instances
     SET status = 'used', used_at = NOW(), used_by_staff_id = $1, used_at_outlet = $2
     WHERE id = $3`, [staff_id, outlet, instance.id]);
    // Emit WebSocket event to notify employee that their voucher was redeemed
    try {
        const io = (0, socket_1.getSocket)();
        io.to(`user:${user.id}`).emit('voucher_redeemed', {
            voucher_id: voucher.id,
            voucher_title: voucher.title,
            voucher_type: voucher.voucher_type,
            cash_value: voucher.cash_value,
            used_at: new Date().toISOString(),
            outlet: outlet
        });
        console.log(`📡 Emitted voucher_redeemed event to user:${user.id}`);
    }
    catch (socketError) {
        console.error('WebSocket emit error:', socketError);
        // Continue even if WebSocket fails - don't block the redemption
    }
    // Create transaction record
    await (0, database_1.query)(`INSERT INTO transactions
     (user_id, type, points_delta, amount_value, voucher_id, outlet, staff_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
        user.id,
        'use',
        0,
        voucher.cash_value,
        voucher_id,
        outlet,
        staff_id
    ]);
    return res.json({
        type: 'voucher_used',
        customer: {
            id: user.id,
            name: user.name,
            surname: user.surname,
            phone: user.phone
        },
        voucher: {
            id: voucher.id,
            title: voucher.title,
            description: voucher.description,
            voucher_type: voucher.voucher_type
        },
        value: voucher.cash_value
    });
}
// =============================================================================
// EXTERNAL POS INTEGRATION API
// =============================================================================
// These endpoints allow external POS systems to submit transactions
// via API key authentication (X-API-Key header)
/**
 * Middleware: Validate External POS API Key
 */
async function validateExternalApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return res.status(401).json({
            success: false,
            error: 'missing_api_key',
            message: 'X-API-Key header is required'
        });
    }
    try {
        const keyHash = crypto_1.default.createHash('sha256').update(apiKey).digest('hex');
        const result = await (0, database_1.query)(`SELECT id, outlet_id, name, is_active
       FROM pos_api_keys
       WHERE api_key_hash = $1`, [keyHash]);
        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'invalid_api_key',
                message: 'Invalid API key'
            });
        }
        const key = result.rows[0];
        if (!key.is_active) {
            return res.status(401).json({
                success: false,
                error: 'api_key_revoked',
                message: 'API key has been revoked'
            });
        }
        await (0, database_1.query)('UPDATE pos_api_keys SET last_used_at = NOW(), total_transactions = total_transactions + 1 WHERE id = $1', [key.id]);
        req.apiKey = {
            id: key.id,
            outlet_id: key.outlet_id,
            name: key.name
        };
        next();
    }
    catch (error) {
        console.error('API key validation error:', error);
        return res.status(500).json({
            success: false,
            error: 'server_error',
            message: 'Failed to validate API key'
        });
    }
}
/**
 * Helper: Normalize phone number for lookup
 */
function normalizePhoneForLookup(phone) {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '66' + cleaned.slice(1);
    }
    if (!cleaned.startsWith('+')) {
        cleaned = '+' + cleaned;
    }
    return cleaned;
}
/**
 * Helper: Find customer by phone or member ID
 */
async function findCustomerByIdentifier(identifier) {
    // Try phone number first
    if (identifier.startsWith('+') || /^\d+$/.test(identifier)) {
        const normalizedPhone = normalizePhoneForLookup(identifier);
        const result = await (0, database_1.query)('SELECT id, name, phone, points_balance, tier_level, customer_id, birthday FROM users WHERE phone = $1', [normalizedPhone]);
        if (result.rows.length > 0) {
            return result.rows[0];
        }
    }
    // Try member ID (MEM-XXXXX format or customer_id)
    const memberIdMatch = identifier.match(/^(?:MEM-)?(\w+)$/i);
    if (memberIdMatch) {
        const result = await (0, database_1.query)('SELECT id, name, phone, points_balance, tier_level, customer_id, birthday FROM users WHERE customer_id = $1', [memberIdMatch[1]]);
        if (result.rows.length > 0) {
            return result.rows[0];
        }
    }
    return null;
}
/**
 * POST /api/pos/transaction
 * Submit a transaction from external POS system
 */
router.post('/transaction', validateExternalApiKey, async (req, res) => {
    try {
        const { customer_identifier, transaction_id, transaction_time, amount, receipt_number, line_items } = req.body;
        // Validate required fields
        if (!customer_identifier) {
            return res.status(400).json({
                success: false,
                error: 'missing_customer_identifier',
                message: 'customer_identifier is required'
            });
        }
        if (!transaction_id) {
            return res.status(400).json({
                success: false,
                error: 'missing_transaction_id',
                message: 'transaction_id is required for idempotency'
            });
        }
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'invalid_amount',
                message: 'amount must be a positive number'
            });
        }
        // Check for duplicate (idempotency)
        const duplicateCheck = await (0, database_1.query)('SELECT id, points_earned, status FROM pos_transactions_log WHERE api_key_id = $1 AND external_transaction_id = $2', [req.apiKey.id, transaction_id]);
        if (duplicateCheck.rows.length > 0) {
            const existing = duplicateCheck.rows[0];
            if (existing.status === 'success') {
                return res.status(200).json({
                    success: true,
                    duplicate: true,
                    message: 'Transaction already processed',
                    points_earned: existing.points_earned
                });
            }
        }
        // Find customer
        const customer = await findCustomerByIdentifier(customer_identifier);
        if (!customer) {
            await (0, database_1.query)(`INSERT INTO pos_transactions_log
         (api_key_id, external_transaction_id, transaction_time, customer_identifier, amount, receipt_number, line_items, status, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
                req.apiKey.id,
                transaction_id,
                transaction_time || new Date(),
                customer_identifier,
                amount,
                receipt_number || null,
                line_items ? JSON.stringify(line_items) : null,
                'customer_not_found',
                'No member found with this identifier'
            ]);
            return res.status(404).json({
                success: false,
                error: 'customer_not_found',
                message: 'No member found with this identifier'
            });
        }
        // Calculate points
        const pointsEarned = Math.floor(amount / 100) * POINTS_PER_100_THB;
        // Check birthday multiplier
        let multiplier = 1;
        if (customer.birthday) {
            const [day, month] = customer.birthday.split('-').map(Number);
            const now = new Date();
            if (now.getMonth() + 1 === month) {
                multiplier = 2;
            }
        }
        const totalPointsEarned = pointsEarned * multiplier;
        const newBalance = customer.points_balance + totalPointsEarned;
        // Update user
        await (0, database_1.query)(`UPDATE users
       SET points_balance = $1,
           last_activity_date = NOW(),
           lifetime_points_earned = COALESCE(lifetime_points_earned, 0) + $2,
           updated_at = NOW()
       WHERE id = $3`, [newBalance, totalPointsEarned, customer.id]);
        // Update tier
        const tierResult = await (0, database_1.query)('SELECT lifetime_points_earned FROM users WHERE id = $1', [customer.id]);
        const lifetimePoints = tierResult.rows[0]?.lifetime_points_earned || 0;
        const newTier = lifetimePoints >= 1000 ? 'Platinum' :
            lifetimePoints >= 500 ? 'Gold' :
                lifetimePoints >= 200 ? 'Silver' : 'Bronze';
        if (newTier !== customer.tier_level) {
            await (0, database_1.query)('UPDATE users SET tier_level = $1 WHERE id = $2', [newTier, customer.id]);
        }
        // Create transaction
        const txResult = await (0, database_1.query)(`INSERT INTO transactions
       (user_id, type, points_delta, amount_value, outlet, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`, [customer.id, 'earn', totalPointsEarned, amount, req.apiKey.name, transaction_time || new Date()]);
        // Log POS transaction
        await (0, database_1.query)(`INSERT INTO pos_transactions_log
       (api_key_id, external_transaction_id, transaction_time, customer_identifier, customer_id, amount, receipt_number, line_items, points_earned, transaction_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [
            req.apiKey.id,
            transaction_id,
            transaction_time || new Date(),
            customer_identifier,
            customer.id,
            amount,
            receipt_number || null,
            line_items ? JSON.stringify(line_items) : null,
            totalPointsEarned,
            txResult.rows[0].id,
            'success'
        ]);
        // Queue notification
        await (0, database_1.query)(`INSERT INTO notification_queue
       (user_id, notification_type, title, body, data, category, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
            customer.id,
            'points_earned',
            'Points Earned!',
            `You earned ${totalPointsEarned} points${multiplier > 1 ? ' (2x birthday bonus!)' : ''} from your purchase.`,
            JSON.stringify({ points_earned: totalPointsEarned, multiplier, amount, new_balance: newBalance }),
            'points_rewards',
            'pending'
        ]);
        return res.json({
            success: true,
            points_earned: totalPointsEarned,
            multiplier: multiplier > 1 ? multiplier : undefined,
            new_balance: newBalance,
            user: {
                id: customer.id,
                name: customer.name,
                tier: newTier
            }
        });
    }
    catch (error) {
        console.error('POS transaction error:', error);
        return res.status(500).json({
            success: false,
            error: 'server_error',
            message: 'Failed to process transaction'
        });
    }
});
/**
 * GET /api/pos/search-customer
 * Unified customer search for staff portal (phone, email, ID, name)
 */
router.get('/search-customer', auth_1.authenticate, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || typeof q !== 'string' || q.trim().length < 2) {
            return res.status(400).json({ error: 'Search query must be at least 2 characters' });
        }
        const searchTerm = q.trim();
        let customers = [];
        // Try to determine search type - order matters!
        // Phone check must come before numeric ID (phone can be all digits)
        const isPhone = searchTerm.startsWith('+') || /^0\d{8,9}$/.test(searchTerm) || /^66\d{9}$/.test(searchTerm);
        const isNumericId = !isPhone && /^\d{1,6}$/.test(searchTerm); // IDs are short numbers
        const isEmail = searchTerm.includes('@');
        if (isPhone) {
            // Search by phone - get last 9 digits for matching
            const digitsOnly = searchTerm.replace(/\D/g, '');
            const last9 = digitsOnly.slice(-9);
            const normalizedPhone = normalizePhoneForLookup(searchTerm);
            const result = await (0, database_1.query)(`SELECT id, name, surname, phone, email, points_balance, user_type, tier_level, customer_id
         FROM users
         WHERE phone = $1 OR phone LIKE $2 OR phone LIKE $3
         LIMIT 10`, [normalizedPhone, `%${last9}%`, `%${digitsOnly}%`]);
            customers = result.rows;
        }
        else if (isNumericId) {
            // Search by ID (numeric user id or customer_id string)
            const result = await (0, database_1.query)(`SELECT id, name, surname, phone, email, points_balance, user_type, tier_level, customer_id
         FROM users
         WHERE id = $1 OR customer_id = $2
         LIMIT 10`, [parseInt(searchTerm), searchTerm]);
            customers = result.rows;
        }
        else if (isEmail) {
            // Search by email
            const result = await (0, database_1.query)(`SELECT id, name, surname, phone, email, points_balance, user_type, tier_level, customer_id
         FROM users
         WHERE LOWER(email) LIKE LOWER($1)
         LIMIT 10`, [`%${searchTerm}%`]);
            customers = result.rows;
        }
        else {
            // Search by name
            const result = await (0, database_1.query)(`SELECT id, name, surname, phone, email, points_balance, user_type, tier_level, customer_id
         FROM users
         WHERE LOWER(name) LIKE LOWER($1) OR LOWER(surname) LIKE LOWER($1)
            OR LOWER(name || ' ' || COALESCE(surname, '')) LIKE LOWER($1)
         ORDER BY
           CASE WHEN LOWER(name) = LOWER($2) THEN 0
                WHEN LOWER(name) LIKE LOWER($3) THEN 1
                ELSE 2
           END,
           name ASC
         LIMIT 10`, [`%${searchTerm}%`, searchTerm, `${searchTerm}%`]);
            customers = result.rows;
        }
        return res.json({
            customers: customers.map(c => ({
                id: c.id,
                name: c.name,
                surname: c.surname,
                phone: c.phone,
                email: c.email,
                points_balance: c.points_balance,
                user_type: c.user_type,
                tier_level: c.tier_level,
                member_id: c.customer_id ? `MEM-${c.customer_id}` : null
            })),
            search_term: searchTerm,
            count: customers.length
        });
    }
    catch (error) {
        console.error('Customer search error:', error);
        return res.status(500).json({ error: 'Failed to search customers' });
    }
});
/**
 * GET /api/pos/lookup/:identifier
 * Lookup customer by phone or member ID (for external POS)
 */
router.get('/lookup/:identifier', validateExternalApiKey, async (req, res) => {
    try {
        const { identifier } = req.params;
        const customer = await findCustomerByIdentifier(identifier);
        if (!customer) {
            return res.status(404).json({
                success: false,
                error: 'customer_not_found',
                message: 'No member found with this identifier'
            });
        }
        return res.json({
            success: true,
            customer: {
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                member_id: customer.customer_id ? `MEM-${customer.customer_id}` : null,
                points_balance: customer.points_balance,
                tier: customer.tier_level
            }
        });
    }
    catch (error) {
        console.error('Customer lookup error:', error);
        return res.status(500).json({
            success: false,
            error: 'server_error',
            message: 'Failed to lookup customer'
        });
    }
});
// =============================================================================
// ADMIN: POS API KEY MANAGEMENT
// =============================================================================
/**
 * GET /api/pos/keys
 * List all POS API keys (admin only)
 */
router.get('/keys', auth_1.authenticate, async (req, res) => {
    try {
        // Check admin role
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const result = await (0, database_1.query)(`
      SELECT
        id,
        name,
        key_prefix,
        outlet_id,
        is_active,
        created_at,
        last_used_at,
        total_requests,
        (SELECT COUNT(*) FROM pos_transactions_log WHERE api_key_id = pos_api_keys.id AND status = 'success') as total_transactions
      FROM pos_api_keys
      ORDER BY created_at DESC
    `);
        return res.json({ keys: result.rows });
    }
    catch (error) {
        console.error('List POS keys error:', error);
        return res.status(500).json({ error: 'Failed to list API keys' });
    }
});
/**
 * POST /api/pos/keys
 * Create a new POS API key (admin only)
 */
router.post('/keys', auth_1.authenticate, async (req, res) => {
    try {
        // Check admin role
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const { name, outlet_id } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Key name is required' });
        }
        // Generate secure API key
        const apiKey = `sk_live_${crypto_1.default.randomBytes(32).toString('hex')}`;
        const keyHash = crypto_1.default.createHash('sha256').update(apiKey).digest('hex');
        const keyPrefix = apiKey.substring(0, 12);
        // Insert key
        const result = await (0, database_1.query)(`INSERT INTO pos_api_keys (name, api_key_hash, key_prefix, outlet_id, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, key_prefix, outlet_id, is_active, created_at`, [name.trim(), keyHash, keyPrefix, outlet_id || null, req.user.id]);
        return res.json({
            key: result.rows[0],
            apiKey // Return the full key only once!
        });
    }
    catch (error) {
        console.error('Create POS key error:', error);
        return res.status(500).json({ error: 'Failed to create API key' });
    }
});
/**
 * DELETE /api/pos/keys/:id
 * Revoke a POS API key (admin only)
 */
router.delete('/keys/:id', auth_1.authenticate, async (req, res) => {
    try {
        // Check admin role
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const { id } = req.params;
        const result = await (0, database_1.query)(`UPDATE pos_api_keys
       SET is_active = false, revoked_at = NOW(), revoked_by = $2
       WHERE id = $1
       RETURNING id`, [id, req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'API key not found' });
        }
        return res.json({ success: true, message: 'API key revoked' });
    }
    catch (error) {
        console.error('Revoke POS key error:', error);
        return res.status(500).json({ error: 'Failed to revoke API key' });
    }
});
/**
 * GET /api/pos/keys/:id/logs
 * Get transaction logs for a specific API key (admin only)
 */
router.get('/keys/:id/logs', auth_1.authenticate, async (req, res) => {
    try {
        // Check admin role
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const { id } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        const result = await (0, database_1.query)(`
      SELECT
        ptl.id,
        ptl.external_transaction_id,
        ptl.customer_identifier as customer_phone,
        ptl.amount,
        ptl.points_earned,
        ptl.status,
        ptl.error_message,
        ptl.created_at,
        pak.name as outlet
      FROM pos_transactions_log ptl
      JOIN pos_api_keys pak ON ptl.api_key_id = pak.id
      WHERE ptl.api_key_id = $1
      ORDER BY ptl.created_at DESC
      LIMIT $2 OFFSET $3
    `, [id, limit, offset]);
        return res.json({
            logs: result.rows.map(row => ({
                ...row,
                amount_thb: row.amount
            }))
        });
    }
    catch (error) {
        console.error('Get POS logs error:', error);
        return res.status(500).json({ error: 'Failed to get transaction logs' });
    }
});
/**
 * GET /api/pos/keys/stats
 * Get overall POS integration statistics (admin only)
 */
router.get('/keys/stats', auth_1.authenticate, async (req, res) => {
    try {
        // Check admin role
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const stats = await (0, database_1.query)(`
      SELECT
        (SELECT COUNT(*) FROM pos_api_keys WHERE is_active = true) as active_keys,
        (SELECT COUNT(*) FROM pos_api_keys WHERE is_active = false) as revoked_keys,
        (SELECT COUNT(*) FROM pos_transactions_log WHERE status = 'success') as successful_transactions,
        (SELECT COUNT(*) FROM pos_transactions_log WHERE status != 'success') as failed_transactions,
        (SELECT COALESCE(SUM(amount), 0) FROM pos_transactions_log WHERE status = 'success') as total_amount,
        (SELECT COALESCE(SUM(points_earned), 0) FROM pos_transactions_log WHERE status = 'success') as total_points_earned
    `);
        return res.json({ stats: stats.rows[0] });
    }
    catch (error) {
        console.error('Get POS stats error:', error);
        return res.status(500).json({ error: 'Failed to get statistics' });
    }
});
exports.default = router;
//# sourceMappingURL=pos.js.map