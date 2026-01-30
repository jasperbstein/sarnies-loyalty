import { useEffect, useRef, useState } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
}

export const usePullToRefresh = (options: PullToRefreshOptions) => {
  const { onRefresh, threshold = 80, resistance = 2.5 } = options;
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef<number>(0);
  const scrollableRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Only allow pull to refresh at the top of the page
      if (window.scrollY === 0) {
        touchStartY.current = e.touches[0].clientY;
        scrollableRef.current = e.target as HTMLElement;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isRefreshing || window.scrollY > 0) return;

      const touchY = e.touches[0].clientY;
      const pull = touchY - touchStartY.current;

      if (pull > 0) {
        setIsPulling(true);
        const distance = Math.min(pull / resistance, threshold * 1.5);
        setPullDistance(distance);

        // Prevent default scrolling when pulling
        if (pull > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling) return;

      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh error:', error);
        } finally {
          setIsRefreshing(false);
        }
      }

      setIsPulling(false);
      setPullDistance(0);
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, pullDistance, isRefreshing, onRefresh, threshold, resistance]);

  return {
    isPulling,
    pullDistance,
    isRefreshing,
    shouldShowIndicator: isPulling || isRefreshing,
  };
};
