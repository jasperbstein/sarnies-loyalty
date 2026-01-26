/**
 * Generate Recurring Vouchers Job
 * Purpose: Auto-generate voucher instances for eligible users based on recurrence rules
 * Schedule: Runs daily at 00:01 AM
 *
 * Handles:
 * - Daily vouchers (e.g., employee daily drink)
 * - Birthday vouchers (on user's birthday)
 * - Anniversary vouchers (on registration anniversary)
 * - Weekly/Monthly vouchers (based on last generated timestamp)
 */
/**
 * Main job function
 */
export declare function generateRecurringVouchers(): Promise<void>;
//# sourceMappingURL=generateRecurringVouchers.d.ts.map