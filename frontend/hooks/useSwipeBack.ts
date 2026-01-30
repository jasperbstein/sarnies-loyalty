import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SwipeBackOptions {
  enabled?: boolean;
  threshold?: number;
  edgeWidth?: number;
}

export const useSwipeBack = (options: SwipeBackOptions = {}) => {
  const { enabled = true, threshold = 100, edgeWidth = 50 } = options;
  const router = useRouter();
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isEdgeSwipe = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;

      // Check if touch started from the left edge
      isEdgeSwipe.current = touch.clientX < edgeWidth;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isEdgeSwipe.current) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = Math.abs(touch.clientY - touchStartY.current);

      // Only trigger if horizontal swipe is dominant
      if (deltaX > threshold && deltaX > deltaY * 2) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isEdgeSwipe.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = Math.abs(touch.clientY - touchStartY.current);

      // Swipe right from edge = go back
      if (deltaX > threshold && deltaX > deltaY * 2) {
        router.back();
      }

      isEdgeSwipe.current = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, threshold, edgeWidth, router]);
};
