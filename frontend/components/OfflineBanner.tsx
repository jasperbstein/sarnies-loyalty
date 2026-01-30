'use client';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { WifiOff, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Banner that appears when the user goes offline.
 * Also briefly shows a "back online" message when reconnected.
 */
export function OfflineBanner() {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  // Show "back online" message when reconnecting
  useEffect(() => {
    if (wasOffline && isOnline) {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [wasOffline, isOnline]);

  // Don't render anything when online and not showing reconnection message
  if (isOnline && !showReconnected) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[200] transition-all duration-300 ${
        isOnline ? 'bg-green-600' : 'bg-amber-600'
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-center gap-2 px-4 py-2">
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4 text-white" />
            <span className="text-sm font-medium text-white">
              Back online
            </span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-white" />
            <span className="text-sm font-medium text-white">
              You are offline. Some features may not work.
            </span>
          </>
        )}
      </div>
    </div>
  );
}
