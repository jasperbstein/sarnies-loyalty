// Push Notification Service Worker
// This handles incoming push notifications

self.addEventListener('install', (event) => {
  console.log('[Push SW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Push SW] Activated');
  event.waitUntil(self.clients.claim());
});

// Handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[Push SW] Push received:', event);

  let data = {
    title: 'Sarnies',
    body: 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: {}
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        data: payload.data || {},
        tag: payload.tag,
        requireInteraction: payload.requireInteraction || false
      };
    } catch (e) {
      console.error('[Push SW] Failed to parse push data:', e);
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    data: data.data,
    tag: data.tag,
    requireInteraction: data.requireInteraction,
    vibrate: [100, 50, 100],
    actions: getActionsForType(data.data?.type)
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Get notification actions based on type
function getActionsForType(type) {
  switch (type) {
    case 'voucher_earned':
    case 'voucher_expiring':
      return [
        { action: 'view', title: 'View Vouchers' },
        { action: 'dismiss', title: 'Dismiss' }
      ];
    case 'points_earned':
      return [
        { action: 'view', title: 'View Rewards' },
        { action: 'dismiss', title: 'Dismiss' }
      ];
    case 'referral_complete':
      return [
        { action: 'view', title: 'View Referrals' },
        { action: 'dismiss', title: 'Dismiss' }
      ];
    case 'announcement':
      return [
        { action: 'view', title: 'Read More' },
        { action: 'dismiss', title: 'Dismiss' }
      ];
    default:
      return [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' }
      ];
  }
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Push SW] Notification clicked:', event);

  event.notification.close();

  const data = event.notification.data || {};
  let url = '/app/home';

  // Handle action buttons
  if (event.action === 'dismiss') {
    return;
  }

  // Determine URL based on notification type
  switch (data.type) {
    case 'voucher_earned':
    case 'voucher_expiring':
      url = '/app/vouchers';
      break;
    case 'points_earned':
      url = '/app/rewards';
      break;
    case 'referral_complete':
      url = '/app/referrals';
      break;
    case 'announcement':
      url = data.announcement_id
        ? `/app/announcements/${data.announcement_id}`
        : '/app/home';
      break;
    default:
      url = data.url || '/app/home';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if a window is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Open new window if none exists
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[Push SW] Notification closed:', event);
});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[Push SW] Push subscription changed');

  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((subscription) => {
        // Send new subscription to server
        return fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ subscription: subscription.toJSON() }),
          credentials: 'include'
        });
      })
  );
});
