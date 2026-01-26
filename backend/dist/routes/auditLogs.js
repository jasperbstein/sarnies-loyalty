"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const auditLog_1 = require("../utils/auditLog");
const router = (0, express_1.Router)();
/**
 * GET /api/audit-logs
 * Get audit logs with filters (Admin only)
 */
router.get('/', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { entityType, entityId, action, userId, staffId, startDate, endDate, severity, page = '1', limit = '50' } = req.query;
        const filters = {};
        if (entityType)
            filters.entityType = entityType;
        if (entityId)
            filters.entityId = parseInt(entityId);
        if (action)
            filters.action = action;
        if (userId)
            filters.userId = parseInt(userId);
        if (staffId)
            filters.staffId = parseInt(staffId);
        if (startDate)
            filters.startDate = new Date(startDate);
        if (endDate)
            filters.endDate = new Date(endDate);
        if (severity)
            filters.severity = severity;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        filters.limit = limitNum;
        filters.offset = (pageNum - 1) * limitNum;
        // Get logs and total count
        const [logs, totalCount] = await Promise.all([
            (0, auditLog_1.getAuditLogs)(filters),
            (0, auditLog_1.getAuditLogCount)(filters)
        ]);
        res.json({
            logs,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitNum)
            }
        });
    }
    catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});
/**
 * GET /api/audit-logs/entity/:entityType/:entityId
 * Get audit logs for a specific entity (Admin only)
 */
router.get('/entity/:entityType/:entityId', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        const limit = parseInt(req.query.limit) || 20;
        const logs = await (0, auditLog_1.getAuditLogs)({
            entityType: entityType,
            entityId: parseInt(entityId),
            limit
        });
        res.json({ logs });
    }
    catch (error) {
        console.error('Get entity audit logs error:', error);
        res.status(500).json({ error: 'Failed to fetch entity audit logs' });
    }
});
/**
 * GET /api/audit-logs/user/:userId
 * Get audit logs for a specific user's actions (Admin only)
 */
router.get('/user/:userId', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const userType = req.query.userType; // 'user' or 'staff'
        const filters = { limit };
        if (userType === 'staff') {
            filters.staffId = parseInt(userId);
        }
        else {
            filters.userId = parseInt(userId);
        }
        const logs = await (0, auditLog_1.getAuditLogs)(filters);
        res.json({ logs });
    }
    catch (error) {
        console.error('Get user audit logs error:', error);
        res.status(500).json({ error: 'Failed to fetch user audit logs' });
    }
});
/**
 * GET /api/audit-logs/recent
 * Get recent audit logs (Admin only)
 */
router.get('/recent', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const logs = await (0, auditLog_1.getAuditLogs)({ limit });
        res.json({ logs });
    }
    catch (error) {
        console.error('Get recent audit logs error:', error);
        res.status(500).json({ error: 'Failed to fetch recent audit logs' });
    }
});
exports.default = router;
//# sourceMappingURL=auditLogs.js.map