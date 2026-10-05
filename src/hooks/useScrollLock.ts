import { useEffect } from 'react';

let lockCount = 0;
let originalOverflow = '';
let originalPaddingRight = '';
let originalOverscrollBehavior = '';

/**
 * Incrementally locks window and body scrolling to prevent background scroll
 * when modals, drawers, or popups are visible.
 */
export function lockScroll(): void {
  if (typeof document === 'undefined') return;

  if (lockCount === 0) {
    originalOverflow = document.body.style.overflow || '';
    originalPaddingRight = document.body.style.paddingRight || '';
    originalOverscrollBehavior = document.body.style.overscrollBehavior || '';

    // Calculate scrollbar width to prevent horizontal layout jumps
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'contain';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'contain';
  }
  lockCount++;
}

/**
 * Decrements lock count and restores scrolling when all modals are closed.
 */
export function unlockScroll(): void {
  if (typeof document === 'undefined') return;

  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = originalOverflow;
    document.body.style.paddingRight = originalPaddingRight;
    document.body.style.overscrollBehavior = originalOverscrollBehavior;
    document.documentElement.style.overflow = '';
    document.documentElement.style.overscrollBehavior = '';
  }
}

/**
 * React hook to lock background scroll while `isActive` is true.
 */
export function useScrollLock(isActive: boolean): void {
  useEffect(() => {
    if (!isActive) return;

    lockScroll();
    return () => {
      unlockScroll();
    };
  }, [isActive]);
}
