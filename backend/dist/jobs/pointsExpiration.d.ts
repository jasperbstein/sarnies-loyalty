/**
 * Scheduled Job: Points Expiration
 * Runs daily at 2 AM
 *
 * This job:
 * 1. Sends warning notifications at 11 months of inactivity
 * 2. Expires all points at 12 months of inactivity
 *
 * Per requirements addendum:
 * - Points expire after 12 months of inactivity
 * - Activity = earning points OR redeeming a voucher
 * - Expiration is all-or-nothing (full balance expires)
 */
/**
 * Send warning notifications to users approaching points expiry
 */
export declare function sendExpirationWarnings(): Promise<void>;
/**
 * Expire points for users inactive for EXPIRY_MONTHS
 */
export declare function expireInactivePoints(): Promise<{
    usersAffected: number | null;
    totalPointsExpired: number;
}>;
/**
 * Main job entry point - runs both warning and expiration
 */
export declare function runPointsExpirationJob(): Promise<{
    usersAffected: number | null;
    totalPointsExpired: number;
}>;
//# sourceMappingURL=pointsExpiration.d.ts.map