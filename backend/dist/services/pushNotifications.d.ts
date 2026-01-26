/**
 * Get the public VAPID key (needed by frontend)
 */
export declare function getVapidPublicKey(): string;
/**
 * Subscribe a user to push notifications
 */
export declare function subscribeToPush(userId: number, subscription: {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}, userAgent?: string): Promise<void>;
/**
 * Unsubscribe a user from push notifications
 */
export declare function unsubscribeFromPush(userId: number, endpoint?: string): Promise<void>;
/**
 * Send a push notification to a specific user
 */
export declare function sendPushToUser(userId: number, notification: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: any;
    tag?: string;
    requireInteraction?: boolean;
}): Promise<{
    success: number;
    failed: number;
}>;
/**
 * Process pending notifications from the queue
 */
export declare function processNotificationQueue(): Promise<void>;
/**
 * Queue a notification for later sending
 */
export declare function queueNotification(userId: number, type: string, title: string, body: string, category: string, data?: any, scheduledFor?: Date): Promise<number>;
/**
 * Send immediate notification (queue + process)
 */
export declare function sendImmediateNotification(userId: number, type: string, title: string, body: string, category: string, data?: any): Promise<{
    success: number;
    failed: number;
}>;
//# sourceMappingURL=pushNotifications.d.ts.map