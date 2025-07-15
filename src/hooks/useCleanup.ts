import { useEffect, useRef } from 'react';

interface CleanupFunction {
  (): void;
}

/**
 * Custom hook for managing cleanup of resources like intervals, timeouts, and WebSocket connections
 */
export const useCleanup = () => {
  const cleanupFunctions = useRef<CleanupFunction[]>([]);

  const addCleanup = (cleanupFn: CleanupFunction) => {
    cleanupFunctions.current.push(cleanupFn);
  };

  const removeCleanup = (cleanupFn: CleanupFunction) => {
    const index = cleanupFunctions.current.indexOf(cleanupFn);
    if (index > -1) {
      cleanupFunctions.current.splice(index, 1);
    }
  };

  const runCleanup = () => {
    cleanupFunctions.current.forEach((cleanup) => {
      try {
        cleanup();
      } catch (error) {
        console.warn('Cleanup function failed:', error);
      }
    });
    cleanupFunctions.current = [];
  };

  useEffect(() => {
    return runCleanup;
  }, []);

  return {
    addCleanup,
    removeCleanup,
    runCleanup,
  };
};

/**
 * Helper hook for intervals with automatic cleanup
 */
export const useInterval = (callback: () => void, delay: number | null) => {
  const { addCleanup } = useCleanup();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (delay !== null) {
      intervalRef.current = setInterval(callback, delay);

      const cleanup = () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };

      addCleanup(cleanup);
      return cleanup;
    }

    // Return empty cleanup function when delay is null
    return () => {
      // No cleanup needed when delay is null
    };
  }, [callback, delay, addCleanup]);

  return intervalRef;
};
