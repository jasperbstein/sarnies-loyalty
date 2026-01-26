/**
 * Scheduled Job: Renew Investor & Media Credits
 * Runs annually on January 1st at midnight
 *
 * This job:
 * 1. Expires old investor credits
 * 2. Renews auto-renew credits
 * 3. Resets media budgets
 */
export declare function renewInvestorCredits(): Promise<void>;
export declare function resetMediaBudgets(): Promise<void>;
export declare function runAnnualRenewal(): Promise<void>;
//# sourceMappingURL=renewCredits.d.ts.map