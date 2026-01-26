export type AuditAction = 'create' | 'update' | 'delete' | 'archive' | 'restore' | 'approve' | 'reject' | 'redeem' | 'refund';
export type EntityType = 'voucher' | 'announcement' | 'user' | 'transaction' | 'outlet' | 'staff' | 'staff_user' | 'company' | 'points_adjustment' | 'settings';
export type Severity = 'info' | 'warning' | 'critical';
interface AuditLogParams {
    userId?: number;
    staffId?: number;
    userEmail?: string;
    userName?: string;
    action: AuditAction;
    entityType: EntityType;
    entityId?: number;
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
    severity?: Severity;
    success?: boolean;
}
/**
 * Create an audit log entry
 */
export declare function createAuditLog(params: AuditLogParams): Promise<void>;
/**
 * Helper function to extract user info from request
 */
export declare function extractUserInfo(req: any): {
    userId: any;
    staffId: any;
    userEmail: any;
    userName: any;
};
/**
 * Helper function to extract request metadata
 */
export declare function extractRequestMetadata(req: any): {
    ip: any;
    userAgent: any;
    method: any;
    path: any;
};
/**
 * Convenience function for logging voucher operations
 */
export declare function logVoucherAction(req: any, action: AuditAction, voucherId: number, voucherTitle: string, changes?: any): Promise<void>;
/**
 * Convenience function for logging announcement operations
 */
export declare function logAnnouncementAction(req: any, action: AuditAction, announcementId: number, announcementTitle: string, changes?: any): Promise<void>;
/**
 * Convenience function for logging user operations
 */
export declare function logUserAction(req: any, action: AuditAction, targetUserId: number, targetUserName: string, changes?: any): Promise<void>;
/**
 * Convenience function for logging points adjustments
 */
export declare function logPointsAdjustment(req: any, userId: number, userName: string, pointsChange: number, reason: string, newBalance: number): Promise<void>;
/**
 * Convenience function for logging staff user operations
 */
export declare function logStaffAction(req: any, action: AuditAction, staffId: number, staffEmail: string, changes?: any): Promise<void>;
/**
 * Convenience function for logging company operations
 */
export declare function logCompanyAction(req: any, action: AuditAction, companyId: number, companyName: string, changes?: any): Promise<void>;
/**
 * Convenience function for logging outlet operations
 */
export declare function logOutletAction(req: any, action: AuditAction, outletId: number, outletName: string, changes?: any): Promise<void>;
/**
 * Convenience function for logging settings changes
 */
export declare function logSettingChange(req: any, settingKey: string, oldValue: any, newValue: any): Promise<void>;
/**
 * Get audit logs with filters
 */
export declare function getAuditLogs(filters: {
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
}): Promise<any[]>;
/**
 * Get audit log count with filters
 */
export declare function getAuditLogCount(filters: {
    entityType?: EntityType;
    entityId?: number;
    action?: AuditAction;
    userId?: number;
    staffId?: number;
    startDate?: Date;
    endDate?: Date;
    severity?: Severity;
}): Promise<number>;
export {};
//# sourceMappingURL=auditLog.d.ts.map