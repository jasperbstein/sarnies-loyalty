"use strict";
/**
 * Scheduled Job: Renew Investor & Media Credits
 * Runs annually on January 1st at midnight
 *
 * This job:
 * 1. Expires old investor credits
 * 2. Renews auto-renew credits
 * 3. Resets media budgets
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renewInvestorCredits = renewInvestorCredits;
exports.resetMediaBudgets = resetMediaBudgets;
exports.runAnnualRenewal = runAnnualRenewal;
const database_1 = __importDefault(require("../db/database"));
async function renewInvestorCredits() {
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        const now = new Date();
        const nextYearEnd = new Date(now.getFullYear() + 1, 11, 31, 23, 59, 59);
        console.log('🔄 Starting investor credit renewal...');
        // 1. Expire and renew outlet credits
        const outletResult = await client.query(`UPDATE investor_outlet_credits
       SET
         credits_balance = CASE
           WHEN auto_renew = true THEN annual_allocation
           ELSE 0
         END,
         allocated_at = CASE
           WHEN auto_renew = true THEN NOW()
           ELSE allocated_at
         END,
         expires_at = CASE
           WHEN auto_renew = true THEN $1
           ELSE expires_at
         END,
         updated_at = NOW()
       WHERE expires_at < NOW()
       OR (auto_renew = true AND EXTRACT(MONTH FROM expires_at) = 12)
       RETURNING user_id, outlet_id, credits_balance, auto_renew`, [nextYearEnd]);
        // Log outlet credit renewals
        for (const credit of outletResult.rows) {
            if (credit.auto_renew) {
                await client.query(`INSERT INTO credit_transactions
           (user_id, credit_type, outlet_id, transaction_type, credits_change, balance_after, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                    credit.user_id,
                    'investor_outlet',
                    credit.outlet_id,
                    'renewal',
                    credit.credits_balance,
                    credit.credits_balance,
                    'Annual credit renewal'
                ]);
            }
            else {
                await client.query(`INSERT INTO credit_transactions
           (user_id, credit_type, outlet_id, transaction_type, credits_change, balance_after, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                    credit.user_id,
                    'investor_outlet',
                    credit.outlet_id,
                    'expiry',
                    -credit.credits_balance,
                    0,
                    'Annual credit expiry (no auto-renew)'
                ]);
            }
        }
        console.log(`✅ Renewed/expired ${outletResult.rowCount} outlet credit accounts`);
        // 2. Expire and renew group credits
        const groupResult = await client.query(`UPDATE users
       SET
         investor_group_credits_balance = investor_group_credits_annual_allocation,
         investor_group_credits_allocated_at = NOW(),
         investor_group_credits_expires_at = $1,
         updated_at = NOW()
       WHERE investor_group_credits_enabled = true
       AND (investor_group_credits_expires_at < NOW()
            OR EXTRACT(MONTH FROM investor_group_credits_expires_at) = 12)
       RETURNING id, investor_group_credits_balance`, [nextYearEnd]);
        // Log group credit renewals
        for (const user of groupResult.rows) {
            await client.query(`INSERT INTO credit_transactions
         (user_id, credit_type, transaction_type, credits_change, balance_after, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`, [
                user.id,
                'investor_group',
                'renewal',
                user.investor_group_credits_balance,
                user.investor_group_credits_balance,
                'Annual group credit renewal'
            ]);
        }
        console.log(`✅ Renewed ${groupResult.rowCount} group credit accounts`);
        await client.query('COMMIT');
        console.log('✅ Investor credit renewal complete');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error renewing investor credits:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
async function resetMediaBudgets() {
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        const now = new Date();
        const nextYearEnd = new Date(now.getFullYear() + 1, 11, 31, 23, 59, 59);
        console.log('🔄 Starting media budget reset...');
        const result = await client.query(`UPDATE users
       SET
         media_spent_this_year_thb = 0,
         media_budget_allocated_at = NOW(),
         media_budget_expires_at = $1,
         updated_at = NOW()
       WHERE user_type = 'media'
       AND media_annual_budget_thb > 0
       AND (media_budget_expires_at < NOW()
            OR EXTRACT(MONTH FROM media_budget_expires_at) = 12)
       RETURNING id, media_annual_budget_thb`, [nextYearEnd]);
        // Log budget renewals
        for (const user of result.rows) {
            await client.query(`INSERT INTO credit_transactions
         (user_id, credit_type, transaction_type, amount_thb, notes)
         VALUES ($1, $2, $3, $4, $5)`, [
                user.id,
                'media',
                'renewal',
                user.media_annual_budget_thb,
                'Annual media budget reset'
            ]);
        }
        console.log(`✅ Reset ${result.rowCount} media budgets`);
        await client.query('COMMIT');
        console.log('✅ Media budget reset complete');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error resetting media budgets:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
// Run both renewals
async function runAnnualRenewal() {
    console.log('\n🎉 Starting annual credit renewal process...\n');
    try {
        await renewInvestorCredits();
        await resetMediaBudgets();
        console.log('\n✅ Annual renewal process complete!\n');
    }
    catch (error) {
        console.error('\n❌ Annual renewal failed:', error);
        throw error;
    }
}
// If run directly (for testing/manual execution)
if (require.main === module) {
    runAnnualRenewal()
        .then(() => {
        console.log('Done');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=renewCredits.js.map