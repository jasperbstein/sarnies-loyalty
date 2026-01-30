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

import pool from '../db/database';

// Configuration (can be moved to settings table)
const EXPIRY_MONTHS = 12;
const WARNING_MONTHS = 11;

/**
 * Send warning notifications to users approaching points expiry
 */
export async function sendExpirationWarnings() {
  const client = await pool.connect();

  try {
    console.log('📧 Checking for users needing expiration warnings...');

    // Find users inactive for WARNING_MONTHS who haven't been warned yet
    // (We track this by checking notification_queue for recent warnings)
    const warningDate = new Date();
    warningDate.setMonth(warningDate.getMonth() - WARNING_MONTHS);

    const usersNeedingWarning = await client.query(`
      SELECT u.id, u.name, u.phone, u.points_balance, u.last_activity_date
      FROM users u
      WHERE u.points_balance > 0
      AND u.last_activity_date IS NOT NULL
      AND u.last_activity_date < $1
      AND u.last_activity_date >= $2
      AND NOT EXISTS (
        SELECT 1 FROM notification_queue nq
        WHERE nq.user_id = u.id
        AND nq.notification_type = 'points_expiring_warning'
        AND nq.created_at > NOW() - INTERVAL '30 days'
      )
    `, [warningDate, new Date(warningDate.getTime() - 30 * 24 * 60 * 60 * 1000)]);

    console.log(`📧 Found ${usersNeedingWarning.rowCount} users needing expiration warnings`);

    // Queue warning notifications
    for (const user of usersNeedingWarning.rows) {
      // Check user notification preferences
      const prefs = user.notification_prefs || { points_rewards: true };
      if (!prefs.points_rewards) {
        console.log(`⏭️  Skipping user ${user.id} - notifications disabled`);
        continue;
      }

      const expiryDate = new Date(user.last_activity_date);
      expiryDate.setMonth(expiryDate.getMonth() + EXPIRY_MONTHS);

      await client.query(`
        INSERT INTO notification_queue
        (user_id, notification_type, title, body, data, category, status, scheduled_for)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        user.id,
        'points_expiring_warning',
        'Your Points Are About to Expire',
        `Your ${user.points_balance} points will expire on ${expiryDate.toLocaleDateString()}. Visit any Sarnies location to earn or redeem points!`,
        JSON.stringify({
          points_balance: user.points_balance,
          expiry_date: expiryDate.toISOString(),
          last_activity: user.last_activity_date
        }),
        'points_rewards',
        'pending'
      ]);

      console.log(`📧 Queued warning for user ${user.id} (${user.points_balance} pts)`);
    }

    console.log(`✅ Queued ${usersNeedingWarning.rowCount} expiration warnings`);

  } catch (error) {
    console.error('❌ Error sending expiration warnings:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Expire points for users inactive for EXPIRY_MONTHS
 */
export async function expireInactivePoints() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('⏰ Checking for points to expire...');

    // Find users inactive for EXPIRY_MONTHS
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() - EXPIRY_MONTHS);

    const usersToExpire = await client.query(`
      SELECT id, name, phone, points_balance, last_activity_date
      FROM users
      WHERE points_balance > 0
      AND last_activity_date IS NOT NULL
      AND last_activity_date < $1
    `, [expiryDate]);

    console.log(`⏰ Found ${usersToExpire.rowCount} users with points to expire`);

    let totalPointsExpired = 0;

    for (const user of usersToExpire.rows) {
      const pointsToExpire = user.points_balance;
      totalPointsExpired += pointsToExpire;

      // Set points to 0
      await client.query(`
        UPDATE users
        SET points_balance = 0,
            updated_at = NOW()
        WHERE id = $1
      `, [user.id]);

      // Create expiration transaction record
      await client.query(`
        INSERT INTO transactions
        (user_id, type, points_delta, outlet, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [
        user.id,
        'expire',
        -pointsToExpire,
        'System'
      ]);

      // Queue expiration notification
      const prefs = user.notification_prefs || { points_rewards: true };
      if (prefs.points_rewards) {
        await client.query(`
          INSERT INTO notification_queue
          (user_id, notification_type, title, body, data, category, status, scheduled_for)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
          user.id,
          'points_expired',
          'Points Expired',
          `Your ${pointsToExpire} points have expired due to 12 months of inactivity. Visit Sarnies to start earning again!`,
          JSON.stringify({
            points_expired: pointsToExpire,
            expired_at: new Date().toISOString(),
            last_activity: user.last_activity_date
          }),
          'points_rewards',
          'pending'
        ]);
      }

      console.log(`❌ Expired ${pointsToExpire} pts for user ${user.id} (${user.name})`);
    }

    await client.query('COMMIT');

    console.log(`✅ Expired ${totalPointsExpired} total points from ${usersToExpire.rowCount} users`);

    return {
      usersAffected: usersToExpire.rowCount,
      totalPointsExpired
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error expiring points:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Main job entry point - runs both warning and expiration
 */
export async function runPointsExpirationJob() {
  console.log('\n⏰ Starting points expiration job...\n');

  try {
    // First send warnings
    await sendExpirationWarnings();

    // Then expire points
    const result = await expireInactivePoints();

    console.log('\n✅ Points expiration job complete!\n');
    return result;

  } catch (error) {
    console.error('\n❌ Points expiration job failed:', error);
    throw error;
  }
}

// If run directly (for testing/manual execution)
if (require.main === module) {
  runPointsExpirationJob()
    .then((result) => {
      console.log('Done:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed:', error);
      process.exit(1);
    });
}
