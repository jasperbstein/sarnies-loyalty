/**
 * Gold Monthly Voucher Generator
 *
 * This job runs daily and generates a free monthly drink voucher for all Gold tier members
 * who haven't received one this month yet.
 *
 * Run with: npx ts-node src/jobs/generateGoldMonthlyVouchers.ts
 * Or schedule with cron: 0 1 1 * * (1am on 1st of each month)
 */

import { query, transaction } from '../db/database';

async function generateGoldMonthlyVouchers() {
  console.log('🏆 Starting Gold Monthly Voucher Generation...');

  try {
    // Get the Gold monthly voucher ID from settings
    const settingsResult = await query(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'gold_monthly_voucher_id'"
    );

    if (!settingsResult.rows[0]?.setting_value) {
      console.error('❌ Gold monthly voucher ID not configured in app_settings');
      return;
    }

    const goldVoucherId = parseInt(settingsResult.rows[0].setting_value, 10);
    console.log(`📋 Gold voucher ID: ${goldVoucherId}`);

    // Get voucher details
    const voucherResult = await query(
      'SELECT * FROM vouchers WHERE id = $1 AND is_active = true',
      [goldVoucherId]
    );

    if (voucherResult.rows.length === 0) {
      console.error('❌ Gold monthly voucher not found or inactive');
      return;
    }

    const voucher = voucherResult.rows[0];
    console.log(`🎫 Voucher: ${voucher.title}`);

    // Find all Gold members who haven't received their voucher this month
    const currentMonth = new Date();
    const firstOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

    const eligibleUsersResult = await query(`
      SELECT id, name, email, phone, tier_level, last_gold_monthly_voucher_at
      FROM users
      WHERE tier_level = 'Gold'
        AND can_earn_points = true
        AND user_type = 'customer'
        AND is_active = true
        AND (
          last_gold_monthly_voucher_at IS NULL
          OR last_gold_monthly_voucher_at < $1
        )
    `, [firstOfMonth]);

    const eligibleUsers = eligibleUsersResult.rows;
    console.log(`👥 Found ${eligibleUsers.length} eligible Gold members`);

    if (eligibleUsers.length === 0) {
      console.log('✅ All Gold members already have their monthly voucher');
      return;
    }

    // Generate voucher instances for each eligible user
    let successCount = 0;
    let errorCount = 0;

    for (const user of eligibleUsers) {
      try {
        await transaction(async (client) => {
          // Create voucher instance
          const instanceResult = await client.query(`
            INSERT INTO voucher_instances (
              voucher_id,
              user_id,
              uuid,
              status,
              expires_at,
              notes
            ) VALUES (
              $1,
              $2,
              gen_random_uuid(),
              'active',
              NOW() + INTERVAL '30 days',
              'Auto-generated Gold monthly voucher'
            )
            RETURNING id, uuid
          `, [goldVoucherId, user.id]);

          // Update user's last voucher timestamp
          await client.query(`
            UPDATE users
            SET last_gold_monthly_voucher_at = NOW()
            WHERE id = $1
          `, [user.id]);

          console.log(`  ✅ Generated voucher for ${user.name} (ID: ${user.id})`);
        });

        successCount++;
      } catch (error) {
        console.error(`  ❌ Failed for user ${user.id}:`, error);
        errorCount++;
      }
    }

    console.log('');
    console.log('📊 Summary:');
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log('🏆 Gold Monthly Voucher Generation Complete!');

  } catch (error) {
    console.error('❌ Job failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  generateGoldMonthlyVouchers()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { generateGoldMonthlyVouchers };
