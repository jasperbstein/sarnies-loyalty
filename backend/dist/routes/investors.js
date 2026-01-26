"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../db/database"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// ============================================================================
// INVESTOR CREDITS - User Endpoints
// ============================================================================
/**
 * GET /api/investors/credits
 * Get all investor credits for logged-in user
 */
router.get('/credits', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        // Get user info
        const userResult = await database_1.default.query(`SELECT
        user_type,
        investor_group_credits_enabled,
        investor_group_credits_balance,
        investor_group_credits_annual_allocation,
        investor_group_credits_allocated_at,
        investor_group_credits_expires_at,
        investor_discount_percentage
      FROM users WHERE id = $1`, [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        if (user.user_type !== 'investor') {
            return res.status(403).json({ error: 'User is not an investor' });
        }
        // Get outlet-specific credits
        const outletCreditsResult = await database_1.default.query(`SELECT
        ioc.*,
        o.name as outlet_name,
        o.address as outlet_address
      FROM investor_outlet_credits ioc
      JOIN outlets o ON o.id = ioc.outlet_id
      WHERE ioc.user_id = $1
      ORDER BY o.name`, [userId]);
        res.json({
            user_type: user.user_type,
            discount_percentage: user.investor_discount_percentage,
            group_credits: user.investor_group_credits_enabled ? {
                enabled: true,
                balance: user.investor_group_credits_balance,
                annual_allocation: user.investor_group_credits_annual_allocation,
                allocated_at: user.investor_group_credits_allocated_at,
                expires_at: user.investor_group_credits_expires_at,
            } : {
                enabled: false,
            },
            outlet_credits: outletCreditsResult.rows,
        });
    }
    catch (error) {
        console.error('Error fetching investor credits:', error);
        res.status(500).json({ error: 'Failed to fetch credits' });
    }
});
/**
 * GET /api/investors/credits/outlet/:outletId
 * Get available credits for specific outlet
 */
router.get('/credits/outlet/:outletId', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { outletId } = req.params;
        const result = await database_1.default.query('SELECT * FROM get_investor_credits_for_outlet($1, $2)', [userId, outletId]);
        if (result.rows.length === 0) {
            return res.json({
                outlet_credits: 0,
                group_credits: 0,
                total_available: 0,
            });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error fetching outlet credits:', error);
        res.status(500).json({ error: 'Failed to fetch outlet credits' });
    }
});
/**
 * GET /api/investors/transactions
 * Get credit transaction history
 */
router.get('/transactions', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50, offset = 0 } = req.query;
        const result = await database_1.default.query(`SELECT
        ct.*,
        o.name as outlet_name,
        v.title as voucher_title
      FROM credit_transactions ct
      LEFT JOIN outlets o ON o.id = ct.outlet_id
      LEFT JOIN vouchers v ON v.id = ct.voucher_id
      WHERE ct.user_id = $1
      AND ct.credit_type IN ('investor_outlet', 'investor_group')
      ORDER BY ct.created_at DESC
      LIMIT $2 OFFSET $3`, [userId, limit, offset]);
        res.json({
            transactions: result.rows,
            total: result.rowCount,
        });
    }
    catch (error) {
        console.error('Error fetching credit transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});
// ============================================================================
// ADMIN ENDPOINTS - Investor Credits Management
// ============================================================================
/**
 * POST /api/admin/:userId/outlet-credits
 * Allocate outlet-specific credits to investor
 */
router.post('/admin/:userId/outlet-credits', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const client = await database_1.default.connect();
    try {
        const { userId } = req.params;
        const { outletId, annualAllocation, creditsBalance, autoRenew = true, expiresAt } = req.body;
        const staffId = req.user.id;
        if (!outletId || annualAllocation === undefined) {
            return res.status(400).json({ error: 'outletId and annualAllocation are required' });
        }
        await client.query('BEGIN');
        // Verify user is investor
        const userCheck = await client.query('SELECT user_type FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }
        // Set user type to investor if not already
        if (userCheck.rows[0].user_type !== 'investor') {
            await client.query('UPDATE users SET user_type = $1 WHERE id = $2', ['investor', userId]);
        }
        // Upsert outlet credits
        const balance = creditsBalance !== undefined ? creditsBalance : annualAllocation;
        const expiryDate = expiresAt || new Date(new Date().getFullYear(), 11, 31, 23, 59, 59); // Dec 31 of current year
        const creditResult = await client.query(`INSERT INTO investor_outlet_credits (
        user_id, outlet_id, credits_balance, annual_allocation,
        allocated_at, expires_at, auto_renew
      ) VALUES ($1, $2, $3, $4, NOW(), $5, $6)
      ON CONFLICT (user_id, outlet_id)
      DO UPDATE SET
        annual_allocation = EXCLUDED.annual_allocation,
        credits_balance = EXCLUDED.credits_balance,
        expires_at = EXCLUDED.expires_at,
        auto_renew = EXCLUDED.auto_renew,
        updated_at = NOW()
      RETURNING *`, [userId, outletId, balance, annualAllocation, expiryDate, autoRenew]);
        // Log transaction
        await client.query(`INSERT INTO credit_transactions (
        user_id, credit_type, outlet_id, transaction_type,
        credits_change, balance_after, notes, staff_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
            userId,
            'investor_outlet',
            outletId,
            'allocation',
            balance,
            balance,
            `Admin allocated ${annualAllocation} annual credits`,
            staffId
        ]);
        await client.query('COMMIT');
        res.json({
            success: true,
            credit: creditResult.rows[0],
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error allocating outlet credits:', error);
        res.status(500).json({ error: 'Failed to allocate credits' });
    }
    finally {
        client.release();
    }
});
/**
 * POST /api/admin/:userId/group-credits
 * Enable/allocate group credits for investor
 */
router.post('/admin/:userId/group-credits', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const client = await database_1.default.connect();
    try {
        const { userId } = req.params;
        const { enabled = true, annualAllocation = 0, creditsBalance, expiresAt } = req.body;
        const staffId = req.user.id;
        await client.query('BEGIN');
        // Verify user exists
        const userCheck = await client.query('SELECT user_type FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }
        // Set user type to investor if not already
        if (userCheck.rows[0].user_type !== 'investor') {
            await client.query('UPDATE users SET user_type = $1 WHERE id = $2', ['investor', userId]);
        }
        const balance = creditsBalance !== undefined ? creditsBalance : annualAllocation;
        const expiryDate = expiresAt || new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);
        // Update user's group credits
        const result = await client.query(`UPDATE users
      SET
        investor_group_credits_enabled = $1,
        investor_group_credits_balance = $2,
        investor_group_credits_annual_allocation = $3,
        investor_group_credits_allocated_at = NOW(),
        investor_group_credits_expires_at = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING
        investor_group_credits_enabled,
        investor_group_credits_balance,
        investor_group_credits_annual_allocation,
        investor_group_credits_allocated_at,
        investor_group_credits_expires_at`, [enabled, balance, annualAllocation, expiryDate, userId]);
        // Log transaction
        if (enabled && balance > 0) {
            await client.query(`INSERT INTO credit_transactions (
          user_id, credit_type, transaction_type,
          credits_change, balance_after, notes, staff_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                userId,
                'investor_group',
                'allocation',
                balance,
                balance,
                `Admin allocated ${annualAllocation} annual group credits`,
                staffId
            ]);
        }
        await client.query('COMMIT');
        res.json({
            success: true,
            group_credits: result.rows[0],
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error allocating group credits:', error);
        res.status(500).json({ error: 'Failed to allocate group credits' });
    }
    finally {
        client.release();
    }
});
/**
 * PATCH /api/admin/:userId/credits/adjust
 * Manually adjust investor credits
 */
router.patch('/admin/:userId/credits/adjust', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    const client = await database_1.default.connect();
    try {
        const { userId } = req.params;
        const { creditType, outletId, amount, notes } = req.body;
        const staffId = req.user.id;
        if (!creditType || amount === undefined) {
            return res.status(400).json({ error: 'creditType and amount are required' });
        }
        if (creditType === 'investor_outlet' && !outletId) {
            return res.status(400).json({ error: 'outletId required for outlet credits' });
        }
        await client.query('BEGIN');
        let newBalance;
        if (creditType === 'investor_outlet') {
            // Adjust outlet credits
            const result = await client.query(`UPDATE investor_outlet_credits
        SET credits_balance = credits_balance + $1,
            updated_at = NOW()
        WHERE user_id = $2 AND outlet_id = $3
        RETURNING credits_balance`, [amount, userId, outletId]);
            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Outlet credit not found' });
            }
            newBalance = result.rows[0].credits_balance;
        }
        else if (creditType === 'investor_group') {
            // Adjust group credits
            const result = await client.query(`UPDATE users
        SET investor_group_credits_balance = investor_group_credits_balance + $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING investor_group_credits_balance`, [amount, userId]);
            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'User not found' });
            }
            newBalance = result.rows[0].investor_group_credits_balance;
        }
        else {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Invalid credit type' });
        }
        // Log transaction
        await client.query(`INSERT INTO credit_transactions (
        user_id, credit_type, outlet_id, transaction_type,
        credits_change, balance_after, notes, staff_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
            userId,
            creditType,
            outletId || null,
            'adjustment',
            amount,
            newBalance,
            notes || 'Manual adjustment by admin',
            staffId
        ]);
        await client.query('COMMIT');
        res.json({
            success: true,
            new_balance: newBalance,
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adjusting credits:', error);
        res.status(500).json({ error: 'Failed to adjust credits' });
    }
    finally {
        client.release();
    }
});
/**
 * GET /api/admin/credits/expiring
 * Get credits expiring soon (next 30 days)
 */
router.get('/admin/credits/expiring', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        // Get expiring outlet credits
        const outletResult = await database_1.default.query(`SELECT
        ioc.*,
        u.name, u.surname, u.phone,
        o.name as outlet_name
      FROM investor_outlet_credits ioc
      JOIN users u ON u.id = ioc.user_id
      JOIN outlets o ON o.id = ioc.outlet_id
      WHERE ioc.expires_at IS NOT NULL
      AND ioc.expires_at <= NOW() + ($1 || ' days')::INTERVAL
      AND ioc.credits_balance > 0
      ORDER BY ioc.expires_at ASC`, [days]);
        // Get expiring group credits
        const groupResult = await database_1.default.query(`SELECT
        id, name, surname, phone,
        investor_group_credits_balance,
        investor_group_credits_expires_at
      FROM users
      WHERE investor_group_credits_enabled = true
      AND investor_group_credits_expires_at IS NOT NULL
      AND investor_group_credits_expires_at <= NOW() + ($1 || ' days')::INTERVAL
      AND investor_group_credits_balance > 0
      ORDER BY investor_group_credits_expires_at ASC`, [days]);
        res.json({
            outlet_credits_expiring: outletResult.rows,
            group_credits_expiring: groupResult.rows,
        });
    }
    catch (error) {
        console.error('Error fetching expiring credits:', error);
        res.status(500).json({ error: 'Failed to fetch expiring credits' });
    }
});
exports.default = router;
//# sourceMappingURL=investors.js.map