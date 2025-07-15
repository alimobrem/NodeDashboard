// Production-grade performance optimization utilities

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { config } from '../config/production';

// Debounce function for performance optimization
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number = config.performance.debounceDelay,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Throttle function for rate limiting
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// Memoization with TTL (Time To Live)
export class MemoCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();
  private defaultTTL: number;

  constructor(defaultTTL = 300000) {
    // 5 minutes default
    this.defaultTTL = defaultTTL;
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);

    if (!item) {
      return undefined;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  set(key: string, value: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
export const globalCache = new MemoCache();

// React hook for debounced values
export function useDebounce<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay || config.performance.debounceDelay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// React hook for memoized API calls
export function useMemoizedApiCall<T>(
  apiCall: () => Promise<T>,
  dependencies: unknown[],
  cacheKey?: string,
  ttl?: number,
): {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const memoizedApiCall = useCallback(apiCall, dependencies);

  const fetchData = useCallback(async () => {
    const key = cacheKey || JSON.stringify(dependencies);

    // Check cache first
    if (config.performance.enableMemoization) {
      const cachedData = globalCache.get(key);
      if (cachedData !== undefined) {
        setData(cachedData as T);
        return;
      }
    }

    try {
      setLoading(true);
      setError(undefined);

      const result = await memoizedApiCall();
      setData(result);

      // Cache the result
      if (config.performance.enableMemoization) {
        globalCache.set(key, result, ttl);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [memoizedApiCall, cacheKey, dependencies, ttl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// React hook for throttled callbacks
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  limit: number,
): (...args: Parameters<T>) => void {
  const throttledCallback = useMemo(() => throttle(callback, limit), [callback, limit]);

  return throttledCallback;
}

// React hook for optimized event handlers
export function useOptimizedEventHandler<T extends (...args: unknown[]) => unknown>(
  handler: T,
  dependencies: unknown[],
): T {
  return useCallback(handler, dependencies) as T;
}

// Performance monitor for measuring component render times
export class PerformanceMonitor {
  private static measurements = new Map<string, number[]>();

  static startMeasurement(componentName: string): string {
    const measurementId = `${componentName}_${Date.now()}_${Math.random()}`;
    performance.mark(`${measurementId}_start`);
    return measurementId;
  }

  static endMeasurement(measurementId: string): number {
    performance.mark(`${measurementId}_end`);
    performance.measure(measurementId, `${measurementId}_start`, `${measurementId}_end`);

    const measurement = performance.getEntriesByName(measurementId)[0];
    const duration = measurement.duration;

    // Store measurement for analysis
    const componentName = measurementId.split('_')[0];
    if (!this.measurements.has(componentName)) {
      this.measurements.set(componentName, []);
    }
    const measurements = this.measurements.get(componentName);
    if (measurements) {
      measurements.push(duration);
    }

    // Clean up
    performance.clearMarks(`${measurementId}_start`);
    performance.clearMarks(`${measurementId}_end`);
    performance.clearMeasures(measurementId);

    return duration;
  }

  static getAverageRenderTime(componentName: string): number | undefined {
    const measurements = this.measurements.get(componentName);
    if (!measurements || measurements.length === 0) {
      return undefined;
    }

    const sum = measurements.reduce((acc, val) => acc + val, 0);
    return sum / measurements.length;
  }

  static getAllMeasurements(): Record<string, { average: number; count: number }> {
    const result: Record<string, { average: number; count: number }> = {};

    for (const [componentName, measurements] of this.measurements.entries()) {
      const average = measurements.reduce((acc, val) => acc + val, 0) / measurements.length;
      result[componentName] = {
        average,
        count: measurements.length,
      };
    }

    return result;
  }

  static clearMeasurements(componentName?: string): void {
    if (componentName) {
      this.measurements.delete(componentName);
    } else {
      this.measurements.clear();
    }
  }
}

// React hook for performance monitoring
export function usePerformanceMonitor(componentName: string): void {
  useEffect(() => {
    if (config.monitoring.enablePerformanceTracking) {
      const measurementId = PerformanceMonitor.startMeasurement(componentName);

      return () => {
        const duration = PerformanceMonitor.endMeasurement(measurementId);

        // Log slow renders (> 16ms for 60fps)
        if (duration > 16) {
          console.warn(`Slow render detected: ${componentName} took ${duration.toFixed(2)}ms`);
        }
      };
    }

    // Return empty cleanup function when performance tracking is disabled
    return () => {
      // Intentionally empty - no cleanup needed when tracking is disabled
    };
  });
}

// Virtual scrolling helper for large lists
export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  itemCount: number;
  overscan?: number;
}

export function calculateVirtualScrollRange(
  scrollTop: number,
  options: VirtualScrollOptions,
): { start: number; end: number; offsetY: number } {
  const { itemHeight, containerHeight, itemCount, overscan = 5 } = options;

  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const end = Math.min(itemCount, start + visibleCount + overscan * 2);

  return {
    start,
    end,
    offsetY: start * itemHeight,
  };
}

// React hook for virtual scrolling
export function useVirtualScroll(options: VirtualScrollOptions): {
  visibleRange: { start: number; end: number; offsetY: number };
  setScrollTop: (scrollTop: number) => void;
} {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(
    () => calculateVirtualScrollRange(scrollTop, options),
    [scrollTop, options],
  );

  return { visibleRange, setScrollTop };
}

// Bundle size analyzer helper
export function analyzeBundleSize(): void {
  if (process.env.NODE_ENV === 'development') {
    // Analyze webpack bundle
    console.group('Bundle Analysis');

    // This would integrate with webpack-bundle-analyzer in a real setup
    console.log('Module sizes:');

    // Example analysis
    const modules = ['@patternfly/react-core', '@patternfly/react-icons', 'react', 'react-dom'];

    modules.forEach((module) => {
      try {
        // Use dynamic import for TypeScript compatibility
        import(`${module}/package.json`)
          .then((moduleInfo: { version: string }) => {
            console.log(`${module}: ${moduleInfo.version}`);
          })
          .catch(() => {
            console.log(`${module}: Not found`);
          });
      } catch {
        console.log(`${module}: Not found`);
      }
    });

    console.groupEnd();
  }
}

// Lazy loading helper for components
export function createLazyComponent<T extends React.ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> {
  if (!config.performance.enableLazyLoading) {
    // Fallback to eager loading in environments that don't support lazy loading
    throw new Error('Lazy loading is disabled');
  }

  return React.lazy(factory);
}
