import webpush from 'web-push';
import { query } from '../db/database';

// VAPID keys should be generated once and stored in environment variables
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@sarnies.com';

// Initialize web-push with VAPID details
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('✅ Web Push initialized');
} else {
  console.warn('⚠️  VAPID keys not configured - push notifications disabled');
}

/**
 * Get the public VAPID key (needed by frontend)
 */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

/**
 * Subscribe a user to push notifications
 */
export async function subscribeToPush(
  userId: number,
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  },
  userAgent?: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key, user_agent, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW())
       ON CONFLICT (user_id, endpoint)
       DO UPDATE SET p256dh_key = $3, auth_key = $4, is_active = true, last_used_at = NOW()`,
      [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, userAgent]
    );
    console.log(`✅ Push subscription saved for user ${userId}`);
  } catch (error) {
    console.error('Failed to save push subscription:', error);
    throw error;
  }
}

/**
 * Unsubscribe a user from push notifications
 */
export async function unsubscribeFromPush(userId: number, endpoint?: string): Promise<void> {
  try {
    if (endpoint) {
      await query(
        'UPDATE push_subscriptions SET is_active = false WHERE user_id = $1 AND endpoint = $2',
        [userId, endpoint]
      );
    } else {
      await query(
        'UPDATE push_subscriptions SET is_active = false WHERE user_id = $1',
        [userId]
      );
    }
    console.log(`✅ Push subscription deactivated for user ${userId}`);
  } catch (error) {
    console.error('Failed to unsubscribe from push:', error);
    throw error;
  }
}

/**
 * Send a push notification to a specific user
 */
export async function sendPushToUser(
  userId: number,
  notification: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: any;
    tag?: string;
    requireInteraction?: boolean;
  }
): Promise<{ success: number; failed: number }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('Push notifications not configured');
    return { success: 0, failed: 0 };
  }

  try {
    // Get user's active subscriptions
    const result = await query(
      'SELECT * FROM push_subscriptions WHERE user_id = $1 AND is_active = true',
      [userId]
    );

    if (result.rows.length === 0) {
      console.log(`No active push subscriptions for user ${userId}`);
      return { success: 0, failed: 0 };
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icons/icon-192x192.png',
      badge: notification.badge || '/icons/badge-72x72.png',
      data: notification.data || {},
      tag: notification.tag,
      requireInteraction: notification.requireInteraction ?? false
    });

    let success = 0;
    let failed = 0;

    for (const sub of result.rows) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh_key,
              auth: sub.auth_key
            }
          },
          payload
        );

        // Update last_used_at
        await query(
          'UPDATE push_subscriptions SET last_used_at = NOW() WHERE id = $1',
          [sub.id]
        );

        success++;
      } catch (error: any) {
        console.error(`Failed to send push to subscription ${sub.id}:`, error);

        // If subscription is invalid (410 Gone or 404), deactivate it
        if (error.statusCode === 410 || error.statusCode === 404) {
          await query(
            'UPDATE push_subscriptions SET is_active = false WHERE id = $1',
            [sub.id]
          );
          console.log(`Deactivated invalid subscription ${sub.id}`);
        }

        failed++;
      }
    }

    return { success, failed };
  } catch (error) {
    console.error('Error sending push notifications:', error);
    throw error;
  }
}

/**
 * Process pending notifications from the queue
 */
export async function processNotificationQueue(): Promise<void> {
  try {
    // Get pending notifications that are due
    const pending = await query(`
      SELECT nq.*, u.notification_prefs
      FROM notification_queue nq
      JOIN users u ON nq.user_id = u.id
      WHERE nq.status = 'pending'
      AND nq.scheduled_for <= NOW()
      ORDER BY nq.scheduled_for ASC
      LIMIT 100
    `);

    console.log(`📬 Processing ${pending.rowCount} pending notifications`);

    for (const notification of pending.rows) {
      try {
        // Check user's notification preferences
        const prefs = notification.notification_prefs || {};
        const categoryPref = prefs[notification.category];

        if (categoryPref === false) {
          // User has opted out of this category
          await query(
            `UPDATE notification_queue SET status = 'skipped', sent_at = NOW() WHERE id = $1`,
            [notification.id]
          );
          continue;
        }

        // Send the push notification
        const result = await sendPushToUser(notification.user_id, {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          tag: notification.notification_type
        });

        if (result.success > 0) {
          await query(
            `UPDATE notification_queue SET status = 'sent', sent_at = NOW() WHERE id = $1`,
            [notification.id]
          );
        } else if (result.failed > 0) {
          await query(
            `UPDATE notification_queue
             SET status = 'failed', sent_at = NOW(), error_message = 'All subscriptions failed'
             WHERE id = $1`,
            [notification.id]
          );
        } else {
          // No subscriptions
          await query(
            `UPDATE notification_queue
             SET status = 'skipped', sent_at = NOW(), error_message = 'No active subscriptions'
             WHERE id = $1`,
            [notification.id]
          );
        }
      } catch (error: any) {
        console.error(`Failed to process notification ${notification.id}:`, error);
        await query(
          `UPDATE notification_queue
           SET status = 'failed', sent_at = NOW(), error_message = $2
           WHERE id = $1`,
          [notification.id, error.message]
        );
      }
    }
  } catch (error) {
    console.error('Error processing notification queue:', error);
    throw error;
  }
}

/**
 * Queue a notification for later sending
 */
export async function queueNotification(
  userId: number,
  type: string,
  title: string,
  body: string,
  category: string,
  data?: any,
  scheduledFor?: Date
): Promise<number> {
  const result = await query(
    `INSERT INTO notification_queue
     (user_id, notification_type, title, body, data, category, status, scheduled_for)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', COALESCE($7, NOW()))
     RETURNING id`,
    [userId, type, title, body, JSON.stringify(data || {}), category, scheduledFor]
  );

  return result.rows[0].id;
}

/**
 * Send immediate notification (queue + process)
 */
export async function sendImmediateNotification(
  userId: number,
  type: string,
  title: string,
  body: string,
  category: string,
  data?: any
): Promise<{ success: number; failed: number }> {
  return sendPushToUser(userId, {
    title,
    body,
    data: { type, ...data },
    tag: type
  });
}
