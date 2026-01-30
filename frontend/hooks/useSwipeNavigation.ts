import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SwipeNavigationOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

export const useSwipeNavigation = (options: SwipeNavigationOptions = {}) => {
  const { onSwipeLeft, onSwipeRight, threshold = 50 } = options;
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX.current = e.changedTouches[0].screenX;
      handleSwipe();
    };

    const handleSwipe = () => {
      const diff = touchStartX.current - touchEndX.current;

      if (Math.abs(diff) < threshold) return;

      if (diff > 0) {
        // Swiped left
        onSwipeLeft?.();
      } else {
        // Swiped right
        onSwipeRight?.();
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, threshold]);
};

// Hook for tab-based swipe navigation
export const useTabSwipeNavigation = () => {
  const router = useRouter();

  const tabs = [
    '/app/home',
    '/app/rewards',
    '/app/activity',
    '/app/profile',
  ];

  const getCurrentTabIndex = () => {
    if (typeof window === 'undefined') return 0;
    const pathname = window.location.pathname;
    const index = tabs.findIndex(tab => pathname.includes(tab));
    return index >= 0 ? index : 0;
  };

  const navigateToTab = (direction: 'left' | 'right') => {
    const currentIndex = getCurrentTabIndex();
    let newIndex: number;

    if (direction === 'left') {
      newIndex = Math.min(currentIndex + 1, tabs.length - 1);
    } else {
      newIndex = Math.max(currentIndex - 1, 0);
    }

    if (newIndex !== currentIndex) {
      router.push(tabs[newIndex]);
    }
  };

  useSwipeNavigation({
    onSwipeLeft: () => navigateToTab('left'),
    onSwipeRight: () => navigateToTab('right'),
    threshold: 75,
  });
};
