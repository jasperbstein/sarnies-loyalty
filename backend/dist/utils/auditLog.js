"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = createAuditLog;
exports.extractUserInfo = extractUserInfo;
exports.extractRequestMetadata = extractRequestMetadata;
exports.logVoucherAction = logVoucherAction;
exports.logAnnouncementAction = logAnnouncementAction;
exports.logUserAction = logUserAction;
exports.logPointsAdjustment = logPointsAdjustment;
exports.logStaffAction = logStaffAction;
exports.logCompanyAction = logCompanyAction;
exports.logOutletAction = logOutletAction;
exports.logSettingChange = logSettingChange;
exports.getAuditLogs = getAuditLogs;
exports.getAuditLogCount = getAuditLogCount;
const database_1 = require("../db/database");
/**
 * Create an audit log entry
 */
async function createAuditLog(params) {
    try {
        const { userId, staffId, userEmail, userName, action, entityType, entityId, description, changes, metadata, severity = 'info', success = true } = params;
        await (0, database_1.query)(`INSERT INTO audit_logs (
        user_id, staff_id, user_email, user_name,
        action, entity_type, entity_id,
        description, changes, metadata,
        severity, success
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [
            userId || null,
            staffId || null,
            userEmail || null,
            userName || null,
            action,
            entityType,
            entityId || null,
            description,
            changes ? JSON.stringify(changes) : null,
            metadata ? JSON.stringify(metadata) : null,
            severity,
            success
        ]);
    }
    catch (error) {
        // Don't throw - audit logging should never break the main operation
        console.error('Failed to create audit log:', error);
    }
}
/**
 * Helper function to extract user info from request
 */
function extractUserInfo(req) {
    const user = req.user;
    if (!user) {
        return {
            userId: undefined,
            staffId: undefined,
            userEmail: undefined,
            userName: undefined
        };
    }
    return {
        userId: user.type === 'customer' ? user.id : undefined,
        staffId: user.type === 'staff' ? user.id : undefined,
        userEmail: user.email || user.phone,
        userName: user.name || 'Unknown User'
    };
}
/**
 * Helper function to extract request metadata
 */
function extractRequestMetadata(req) {
    return {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        method: req.method,
        path: req.path
    };
}
/**
 * Convenience function for logging voucher operations
 */
async function logVoucherAction(req, action, voucherId, voucherTitle, changes) {
    const userInfo = extractUserInfo(req);
    const metadata = extractRequestMetadata(req);
    await createAuditLog({
        ...userInfo,
        action,
        entityType: 'voucher',
        entityId: voucherId,
        description: `${action.toUpperCase()} voucher: ${voucherTitle}`,
        changes,
        metadata,
        severity: action === 'delete' ? 'warning' : 'info'
    });
}
/**
 * Convenience function for logging announcement operations
 */
async function logAnnouncementAction(req, action, announcementId, announcementTitle, changes) {
    const userInfo = extractUserInfo(req);
    const metadata = extractRequestMetadata(req);
    await createAuditLog({
        ...userInfo,
        action,
        entityType: 'announcement',
        entityId: announcementId,
        description: `${action.toUpperCase()} announcement: ${announcementTitle}`,
        changes,
        metadata,
        severity: action === 'delete' ? 'warning' : 'info'
    });
}
/**
 * Convenience function for logging user operations
 */
async function logUserAction(req, action, targetUserId, targetUserName, changes) {
    const userInfo = extractUserInfo(req);
    const metadata = extractRequestMetadata(req);
    await createAuditLog({
        ...userInfo,
        action,
        entityType: 'user',
        entityId: targetUserId,
        description: `${action.toUpperCase()} user: ${targetUserName}`,
        changes,
        metadata,
        severity: action === 'delete' ? 'critical' : 'info'
    });
}
/**
 * Convenience function for logging points adjustments
 */
async function logPointsAdjustment(req, userId, userName, pointsChange, reason, newBalance) {
    const userInfo = extractUserInfo(req);
    const metadata = extractRequestMetadata(req);
    await createAuditLog({
        ...userInfo,
        action: pointsChange > 0 ? 'create' : 'update',
        entityType: 'points_adjustment',
        entityId: userId,
        description: `Adjusted points for ${userName}: ${pointsChange > 0 ? '+' : ''}${pointsChange} (Reason: ${reason})`,
        changes: {
            before: { balance: newBalance - pointsChange },
            after: { balance: newBalance }
        },
        metadata: {
            ...metadata,
            pointsChange,
            reason
        },
        severity: 'warning'
    });
}
/**
 * Convenience function for logging staff user operations
 */
async function logStaffAction(req, action, staffId, staffEmail, changes) {
    const userInfo = extractUserInfo(req);
    const metadata = extractRequestMetadata(req);
    await createAuditLog({
        ...userInfo,
        action,
        entityType: 'staff',
        entityId: staffId,
        description: `${action.toUpperCase()} staff user: ${staffEmail}`,
        changes,
        metadata,
        severity: action === 'delete' ? 'critical' : action === 'update' && changes?.before?.password_hash !== changes?.after?.password_hash ? 'warning' : 'info'
    });
}
/**
 * Convenience function for logging company operations
 */
async function logCompanyAction(req, action, companyId, companyName, changes) {
    const userInfo = extractUserInfo(req);
    const metadata = extractRequestMetadata(req);
    await createAuditLog({
        ...userInfo,
        action,
        entityType: 'company',
        entityId: companyId,
        description: `${action.toUpperCase()} company: ${companyName}`,
        changes,
        metadata,
        severity: action === 'delete' ? 'warning' : 'info'
    });
}
/**
 * Convenience function for logging outlet operations
 */
async function logOutletAction(req, action, outletId, outletName, changes) {
    const userInfo = extractUserInfo(req);
    const metadata = extractRequestMetadata(req);
    await createAuditLog({
        ...userInfo,
        action,
        entityType: 'outlet',
        entityId: outletId,
        description: `${action.toUpperCase()} outlet: ${outletName}`,
        changes,
        metadata,
        severity: action === 'delete' ? 'warning' : 'info'
    });
}
/**
 * Convenience function for logging settings changes
 */
async function logSettingChange(req, settingKey, oldValue, newValue) {
    const userInfo = extractUserInfo(req);
    const metadata = extractRequestMetadata(req);
    await createAuditLog({
        ...userInfo,
        action: 'update',
        entityType: 'settings',
        description: `Updated setting: ${settingKey}`,
        changes: {
            before: { [settingKey]: oldValue },
            after: { [settingKey]: newValue }
        },
        metadata,
        severity: 'info'
    });
}
/**
 * Get audit logs with filters
 */
async function getAuditLogs(filters) {
    const conditions = [];
    const values = [];
    let paramCounter = 1;
    if (filters.entityType) {
        conditions.push(`entity_type = $${paramCounter++}`);
        values.push(filters.entityType);
    }
    if (filters.entityId) {
        conditions.push(`entity_id = $${paramCounter++}`);
        values.push(filters.entityId);
    }
    if (filters.action) {
        conditions.push(`action = $${paramCounter++}`);
        values.push(filters.action);
    }
    if (filters.userId) {
        conditions.push(`user_id = $${paramCounter++}`);
        values.push(filters.userId);
    }
    if (filters.staffId) {
        conditions.push(`staff_id = $${paramCounter++}`);
        values.push(filters.staffId);
    }
    if (filters.startDate) {
        conditions.push(`created_at >= $${paramCounter++}`);
        values.push(filters.startDate);
    }
    if (filters.endDate) {
        conditions.push(`created_at <= $${paramCounter++}`);
        values.push(filters.endDate);
    }
    if (filters.severity) {
        conditions.push(`severity = $${paramCounter++}`);
        values.push(filters.severity);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    const result = await (0, database_1.query)(`SELECT * FROM audit_logs
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`, [...values, limit, offset]);
    return result.rows;
}
/**
 * Get audit log count with filters
 */
async function getAuditLogCount(filters) {
    const conditions = [];
    const values = [];
    let paramCounter = 1;
    if (filters.entityType) {
        conditions.push(`entity_type = $${paramCounter++}`);
        values.push(filters.entityType);
    }
    if (filters.entityId) {
        conditions.push(`entity_id = $${paramCounter++}`);
        values.push(filters.entityId);
    }
    if (filters.action) {
        conditions.push(`action = $${paramCounter++}`);
        values.push(filters.action);
    }
    if (filters.userId) {
        conditions.push(`user_id = $${paramCounter++}`);
        values.push(filters.userId);
    }
    if (filters.staffId) {
        conditions.push(`staff_id = $${paramCounter++}`);
        values.push(filters.staffId);
    }
    if (filters.startDate) {
        conditions.push(`created_at >= $${paramCounter++}`);
        values.push(filters.startDate);
    }
    if (filters.endDate) {
        conditions.push(`created_at <= $${paramCounter++}`);
        values.push(filters.endDate);
    }
    if (filters.severity) {
        conditions.push(`severity = $${paramCounter++}`);
        values.push(filters.severity);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await (0, database_1.query)(`SELECT COUNT(*) as count FROM audit_logs ${whereClause}`, values);
    return parseInt(result.rows[0].count);
}
//# sourceMappingURL=auditLog.js.map