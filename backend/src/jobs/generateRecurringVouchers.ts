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

import { query } from '../db/database';
import { generateQRToken } from '../utils/jwt';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

interface User {
  id: number;
  user_type: string;
  birthday: string | null;
  registration_date: string | null;
  last_daily_voucher_generated_at: Date | null;
  last_weekly_voucher_generated_at: Date | null;
  last_monthly_voucher_generated_at: Date | null;
}

interface Voucher {
  id: number;
  title: string;
  recurrence_type: string;
  recurrence_interval: number;
  target_user_types: string[];
  expiry_type: string;
  expiry_days: number | null;
  expiry_date: Date | null;
  max_redemptions_per_user_per_day: number | null;
}

/**
 * Check if user is eligible for a recurring voucher
 */
function isUserEligible(user: User, voucher: Voucher): boolean {
  const { recurrence_type } = voucher;
  const today = new Date();

  switch (recurrence_type) {
    case 'daily':
      // Generate if never generated OR last generated was before today
      if (!user.last_daily_voucher_generated_at) return true;
      const lastDaily = new Date(user.last_daily_voucher_generated_at);
      return lastDaily.toDateString() !== today.toDateString();

    case 'weekly':
      // Generate if never generated OR more than 7 days ago
      if (!user.last_weekly_voucher_generated_at) return true;
      const lastWeekly = new Date(user.last_weekly_voucher_generated_at);
      const daysDiff = (today.getTime() - lastWeekly.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff >= 7 * voucher.recurrence_interval;

    case 'monthly':
      // Generate if never generated OR more than 30 days ago
      if (!user.last_monthly_voucher_generated_at) return true;
      const lastMonthly = new Date(user.last_monthly_voucher_generated_at);
      const monthsDiff = (today.getTime() - lastMonthly.getTime()) / (1000 * 60 * 60 * 24);
      return monthsDiff >= 30 * voucher.recurrence_interval;

    case 'birthday':
      // Check if today is user's birthday (month/day match)
      if (!user.birthday) return false;
      const birthday = new Date(user.birthday);
      return (
        birthday.getMonth() === today.getMonth() &&
        birthday.getDate() === today.getDate()
      );

    case 'anniversary':
      // Check if today is user's registration anniversary
      if (!user.registration_date) return false;
      const regDate = new Date(user.registration_date);
      return (
        regDate.getMonth() === today.getMonth() &&
        regDate.getDate() === today.getDate()
      );

    default:
      return false;
  }
}

/**
 * Generate a voucher instance for a user
 */
async function generateVoucherInstance(user: User, voucher: Voucher): Promise<void> {
  try {
    // Calculate expiry
    let expiresAt: Date;
    if (voucher.expiry_type === 'days_after_redeem' && voucher.expiry_days) {
      expiresAt = new Date(Date.now() + voucher.expiry_days * 24 * 60 * 60 * 1000);
    } else if (voucher.expiry_type === 'fixed_date' && voucher.expiry_date) {
      expiresAt = new Date(voucher.expiry_date);
    } else {
      // Default: 24 hours for auto-generated vouchers
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    // Generate UUID and QR token
    const uuid = uuidv4();
    const customerId = user.id.toString().padStart(6, '0');

    const qrData = {
      type: 'voucher_redemption',
      customer_id: customerId,
      voucher_id: voucher.id.toString(),
      voucher_instance_id: uuid,
      expires_at: expiresAt.toISOString()
    };

    // Auto-generated recurring vouchers use 24h QR token expiry
    // This is intentionally longer than payment QR codes (120s) since these are pre-generated
    // and the user may not use them immediately. The voucher instance has its own expires_at.
    const qrToken = generateQRToken(qrData, '24h');

    // Create voucher instance
    await query(
      `INSERT INTO voucher_instances
       (uuid, user_id, voucher_id, qr_code_data, status, redeemed_at, expires_at, is_reusable)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)`,
      [uuid, user.id, voucher.id, qrToken, 'active', expiresAt, false]
    );

    console.log(`✅ Generated voucher "${voucher.title}" for user ${user.id} (${user.user_type})`);
  } catch (error) {
    console.error(`❌ Failed to generate voucher for user ${user.id}:`, error);
  }
}

/**
 * Update user's recurrence timestamp
 */
async function updateRecurrenceTimestamp(userId: number, recurrenceType: string): Promise<void> {
  const timestampColumn =
    recurrenceType === 'daily' ? 'last_daily_voucher_generated_at' :
    recurrenceType === 'weekly' ? 'last_weekly_voucher_generated_at' :
    recurrenceType === 'monthly' ? 'last_monthly_voucher_generated_at' :
    null;

  if (timestampColumn) {
    await query(
      `UPDATE users SET ${timestampColumn} = NOW() WHERE id = $1`,
      [userId]
    );
  }
}

/**
 * Main job function
 */
export async function generateRecurringVouchers(): Promise<void> {
  const startTime = Date.now();
  console.log('🔄 Starting recurring vouchers generation job...');

  try {
    // 1. Get all auto-generate vouchers
    const vouchersResult = await query(
      `SELECT * FROM vouchers
       WHERE is_active = true
       AND auto_generate = true
       AND recurrence_type IS NOT NULL
       ORDER BY id ASC`
    );

    const vouchers = vouchersResult.rows;
    console.log(`📋 Found ${vouchers.length} auto-generate vouchers`);

    if (vouchers.length === 0) {
      console.log('✅ No auto-generate vouchers to process');
      return;
    }

    let totalGenerated = 0;

    // 2. Process each voucher
    for (const voucher of vouchers) {
      console.log(`\n🎫 Processing: "${voucher.title}" (${voucher.recurrence_type})`);

      // Get eligible users for this voucher
      const usersResult = await query(
        `SELECT id, user_type, birthday, registration_date,
                last_daily_voucher_generated_at, last_weekly_voucher_generated_at,
                last_monthly_voucher_generated_at
         FROM users
         WHERE user_type = ANY($1)
         ORDER BY id ASC`,
        [voucher.target_user_types || ['customer', 'employee']]
      );

      const users = usersResult.rows;
      console.log(`   👥 Found ${users.length} potential users`);

      let voucherGenerated = 0;

      // 3. Check eligibility and generate instances
      for (const user of users) {
        if (isUserEligible(user, voucher)) {
          // Check if user already has an active instance for today
          const existingResult = await query(
            `SELECT COUNT(*) as count FROM voucher_instances
             WHERE voucher_id = $1 AND user_id = $2
             AND status = 'active'
             AND DATE(redeemed_at) = CURRENT_DATE`,
            [voucher.id, user.id]
          );

          const hasActiveInstance = parseInt(existingResult.rows[0].count) > 0;

          if (!hasActiveInstance) {
            // Check daily limit (if applicable)
            if (voucher.max_redemptions_per_user_per_day) {
              const todayCount = await query(
                `SELECT COUNT(*) as count FROM voucher_instances
                 WHERE voucher_id = $1 AND user_id = $2
                 AND DATE(redeemed_at) = CURRENT_DATE`,
                [voucher.id, user.id]
              );

              if (parseInt(todayCount.rows[0].count) >= voucher.max_redemptions_per_user_per_day) {
                continue; // Skip - already redeemed max times today
              }
            }

            await generateVoucherInstance(user, voucher);
            await updateRecurrenceTimestamp(user.id, voucher.recurrence_type);
            voucherGenerated++;
            totalGenerated++;
          }
        }
      }

      console.log(`   ✅ Generated ${voucherGenerated} instances for "${voucher.title}"`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✨ Job completed in ${elapsed}s`);
    console.log(`📊 Total instances generated: ${totalGenerated}`);

  } catch (error) {
    console.error('❌ Error in recurring vouchers job:', error);
    throw error;
  }
}

/**
 * Run job manually (for testing)
 */
if (require.main === module) {
  generateRecurringVouchers()
    .then(() => {
      console.log('✅ Job finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Job failed:', error);
      process.exit(1);
    });
}
