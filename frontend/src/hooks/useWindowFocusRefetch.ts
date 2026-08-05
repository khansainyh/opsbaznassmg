import { useEffect, useRef } from 'react';

/**
 * Reusable hook that triggers a refetch function whenever the window/tab regains focus or visibility.
 * Includes throttling to prevent rapid duplicate calls.
 */
export function useWindowFocusRefetch(
  refetchFn: () => void, 
  throttleMs: number = 60000,
  enabled: boolean = true
) {
  const lastCallRef = useRef<number>(Date.now());

  useEffect(() => {
    const handleFocus = () => {
      if (!enabled) return;
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastCallRef.current >= throttleMs) {
          lastCallRef.current = now;
          refetchFn();
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [refetchFn, throttleMs, enabled]);
}
