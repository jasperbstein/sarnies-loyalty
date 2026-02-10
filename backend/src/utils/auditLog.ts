import { query } from '../db/database';

export type AuditAction = 'create' | 'update' | 'delete' | 'archive' | 'restore' | 'approve' | 'reject' | 'redeem' | 'refund' | 'send_invite';
export type EntityType = 'voucher' | 'announcement' | 'user' | 'transaction' | 'outlet' | 'staff' | 'staff_user' | 'company' | 'points_adjustment' | 'settings';
export type Severity = 'info' | 'warning' | 'critical';

interface AuditLogParams {
  // Who performed the action
  userId?: number;
  staffId?: number;
  userEmail?: string;
  userName?: string;

  // What action was performed
  action: AuditAction;
  entityType: EntityType;
  entityId?: number;

  // Details
  description: string;
  changes?: {
    before?: any;
    after?: any;
  };
  metadata?: {
    ip?: string;
    userAgent?: string;
    [key: string]: any;
  };

  // Severity
  severity?: Severity;
  success?: boolean;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const {
      userId,
      staffId,
      userEmail,
      userName,
      action,
      entityType,
      entityId,
      description,
      changes,
      metadata,
      severity = 'info',
      success = true
    } = params;

    await query(
      `INSERT INTO audit_logs (
        user_id, staff_id, user_email, user_name,
        action, entity_type, entity_id,
        description, changes, metadata,
        severity, success
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
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
      ]
    );
  } catch (error) {
    // Don't throw - audit logging should never break the main operation
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Helper function to extract user info from request
 */
export function extractUserInfo(req: any) {
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
export function extractRequestMetadata(req: any) {
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
export async function logVoucherAction(
  req: any,
  action: AuditAction,
  voucherId: number,
  voucherTitle: string,
  changes?: any
) {
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
export async function logAnnouncementAction(
  req: any,
  action: AuditAction,
  announcementId: number,
  announcementTitle: string,
  changes?: any
) {
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
export async function logUserAction(
  req: any,
  action: AuditAction,
  targetUserId: number,
  targetUserName: string,
  changes?: any
) {
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
export async function logPointsAdjustment(
  req: any,
  userId: number,
  userName: string,
  pointsChange: number,
  reason: string,
  newBalance: number
) {
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
export async function logStaffAction(
  req: any,
  action: AuditAction,
  staffId: number,
  staffEmail: string,
  changes?: any
) {
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
export async function logCompanyAction(
  req: any,
  action: AuditAction,
  companyId: number,
  companyName: string,
  changes?: any
) {
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
export async function logOutletAction(
  req: any,
  action: AuditAction,
  outletId: number,
  outletName: string,
  changes?: any
) {
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
export async function logSettingChange(
  req: any,
  settingKey: string,
  oldValue: any,
  newValue: any
) {
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
export async function getAuditLogs(filters: {
  entityType?: EntityType;
  entityId?: number;
  action?: AuditAction;
  userId?: number;
  staffId?: number;
  startDate?: Date;
  endDate?: Date;
  severity?: Severity;
  limit?: number;
  offset?: number;
}) {
  const conditions: string[] = [];
  const values: any[] = [];
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

  const result = await query(
    `SELECT * FROM audit_logs
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`,
    [...values, limit, offset]
  );

  return result.rows;
}

/**
 * Get audit log count with filters
 */
export async function getAuditLogCount(filters: {
  entityType?: EntityType;
  entityId?: number;
  action?: AuditAction;
  userId?: number;
  staffId?: number;
  startDate?: Date;
  endDate?: Date;
  severity?: Severity;
}) {
  const conditions: string[] = [];
  const values: any[] = [];
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

  const result = await query(
    `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`,
    values
  );

  return parseInt(result.rows[0].count);
}
