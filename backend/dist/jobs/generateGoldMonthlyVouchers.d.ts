/**
 * Gold Monthly Voucher Generator
 *
 * This job runs daily and generates a free monthly drink voucher for all Gold tier members
 * who haven't received one this month yet.
 *
 * Run with: npx ts-node src/jobs/generateGoldMonthlyVouchers.ts
 * Or schedule with cron: 0 1 1 * * (1am on 1st of each month)
 */
declare function generateGoldMonthlyVouchers(): Promise<void>;
export { generateGoldMonthlyVouchers };
//# sourceMappingURL=generateGoldMonthlyVouchers.d.ts.map