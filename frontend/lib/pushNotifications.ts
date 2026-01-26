import { notificationsAPI } from './api';

const PUSH_SW_PATH = '/push-sw.js';

/**
 * Register the push notification service worker
 */
export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(PUSH_SW_PATH, {
      scope: '/'
    });
    console.log('Push service worker registered:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Failed to register push service worker:', error);
    return null;
  }
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Check if notifications are permitted
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Get the service worker registration, registering if needed
 */
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    // Check for existing registration
    let registration: ServiceWorkerRegistration | null | undefined =
      await navigator.serviceWorker.getRegistration(PUSH_SW_PATH);

    if (!registration) {
      // Register new service worker
      registration = await registerPushServiceWorker();
    }

    if (registration) {
      // Wait for it to be ready
      await navigator.serviceWorker.ready;
      return registration;
    }

    return null;
  } catch (error) {
    console.error('Failed to get service worker registration:', error);
    return null;
  }
}

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(): Promise<boolean> {
  try {
    // Check permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.log('Notification permission not granted');
      return false;
    }

    // Get service worker registration
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      console.error('No service worker registration');
      return false;
    }

    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      // Update subscription on server
      await notificationsAPI.subscribe(existingSubscription);
      return true;
    }

    // Get VAPID public key from server
    const vapidResponse = await notificationsAPI.getVapidKey();
    const vapidPublicKey = vapidResponse.data.vapidPublicKey;

    if (!vapidPublicKey) {
      console.error('No VAPID public key available');
      return false;
    }

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource
    });

    // Send subscription to server
    await notificationsAPI.subscribe(subscription);

    console.log('Successfully subscribed to push notifications');
    return true;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return false;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      return false;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return true; // Already unsubscribed
    }

    // Unsubscribe from push manager
    await subscription.unsubscribe();

    // Notify server
    await notificationsAPI.unsubscribe(subscription.endpoint);

    console.log('Successfully unsubscribed from push notifications');
    return true;
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    return false;
  }
}

/**
 * Check if currently subscribed to push
 */
export async function isSubscribedToPush(): Promise<boolean> {
  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      return false;
    }

    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    console.error('Failed to check push subscription:', error);
    return false;
  }
}

/**
 * Send a test notification
 */
export async function sendTestNotification(): Promise<boolean> {
  try {
    const response = await notificationsAPI.sendTest();
    return response.data.success;
  } catch (error) {
    console.error('Failed to send test notification:', error);
    return false;
  }
}
