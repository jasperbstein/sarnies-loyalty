'use client';

import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const { isPulling, pullDistance, isRefreshing, shouldShowIndicator } = usePullToRefresh({
    onRefresh,
  });

  const rotation = isRefreshing ? 360 : (pullDistance / 80) * 180;

  return (
    <div className="relative">
      {/* Pull to refresh indicator */}
      <div
        className={`fixed top-0 left-0 right-0 z-40 flex justify-center transition-all duration-200 ${
          shouldShowIndicator ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          transform: `translateY(${Math.min(pullDistance, 80)}px)`,
        }}
      >
        <div className="bg-white rounded-full shadow-lg p-3 mt-4">
          <RefreshCw
            className={`w-5 h-5 text-gray-700 ${isRefreshing ? 'animate-spin' : ''}`}
            style={{
              transform: isRefreshing ? '' : `rotate(${rotation}deg)`,
              transition: isRefreshing ? '' : 'transform 0.1s ease-out',
            }}
          />
        </div>
      </div>

      {children}
    </div>
  );
};
