import { useEffect, useRef, useCallback } from 'react';
import { usePricing } from '../context/PricingContext';
import { useProducts } from './useProducts';
import { useDepot } from './useDepot';
import { ProductWithPricing } from '../types';

interface UseRealTimePricingOptions {
  refreshInterval?: number; // in milliseconds, default 5 minutes
  enableBackgroundRefresh?: boolean; // default true
  onPriceUpdate?: (updatedProducts: ProductWithPricing[]) => void;
}

interface UseRealTimePricingReturn {
  isRefreshing: boolean;
  lastRefreshTime: Date | null;
  refreshPrices: () => Promise<void>;
  refreshError: Error | null;
}

export const useRealTimePricing = ({
  refreshInterval = 5 * 60 * 1000, // 5 minutes
  enableBackgroundRefresh = true,
  onPriceUpdate,
}: UseRealTimePricingOptions = {}): UseRealTimePricingReturn => {
  const { state: pricingState, actions: pricingActions } = usePricing();
  const { depot } = useDepot(pricingState.currentDepot?.id ? undefined : pricingState.userLocation?.pincode);
  const { products, refresh: refreshProducts, error: productsError } = useProducts(depot?.id);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);
  const lastRefreshTimeRef = useRef<Date | null>(null);
  const refreshErrorRef = useRef<Error | null>(null);

  // Function to refresh prices
  const refreshPrices = useCallback(async () => {
    if (isRefreshingRef.current || !depot) return;

    try {
      isRefreshingRef.current = true;
      refreshErrorRef.current = null;

      // Refresh products to get updated pricing
      await refreshProducts();

      // Update last refresh time
      lastRefreshTimeRef.current = new Date();

      // Notify callback if provided
      if (onPriceUpdate && products) {
        onPriceUpdate(products);
      }

      // Note: setLastPriceUpdate is not available in PricingActions, so we'll skip this
    } catch (error) {
      console.error('Error refreshing prices:', error);
      refreshErrorRef.current = error as Error;

      // Update pricing context with error
      pricingActions.setError({
        type: 'API_ERROR',
        message: 'Failed to refresh prices. Please try again.',
        code: 'PRICING_REFRESH_FAILED',
        recoverable: true,
      });
    } finally {
      isRefreshingRef.current = false;
    }
  }, [depot, refreshProducts, onPriceUpdate, products, pricingActions]);

  // Set up background refresh
  useEffect(() => {
    if (enableBackgroundRefresh && depot) {
      intervalRef.current = setInterval(refreshPrices, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enableBackgroundRefresh, depot, refreshInterval]); // Remove refreshPrices from dependencies

  // Refresh prices when depot changes
  useEffect(() => {
    if (depot) {
      refreshPrices();
    }
  }, [depot]); // Remove refreshPrices from dependencies to prevent infinite loops

  // Handle visibility change to pause/resume refresh when tab is not visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause refresh when tab is not visible
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        // Resume refresh when tab becomes visible
        if (enableBackgroundRefresh && depot) {
          intervalRef.current = setInterval(refreshPrices, refreshInterval);

          // Also refresh immediately if it's been more than the refresh interval
          if (lastRefreshTimeRef.current) {
            const timeSinceLastRefresh = Date.now() - lastRefreshTimeRef.current.getTime();
            if (timeSinceLastRefresh > refreshInterval) {
              refreshPrices();
            }
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enableBackgroundRefresh, depot, refreshInterval]); // Remove refreshPrices dependency

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      // Refresh prices when coming back online
      if (depot) {
        refreshPrices();
      }
    };

    const handleOffline = () => {
      // Set error state when going offline
      refreshErrorRef.current = new Error('You are offline. Prices may not be up to date.');
      pricingActions.setError({
        type: 'NETWORK_ERROR',
        message: 'You are offline. Please check your internet connection.',
        code: 'NETWORK_OFFLINE',
        recoverable: true,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [depot, pricingActions]); // Remove refreshPrices dependency

  return {
    isRefreshing: isRefreshingRef.current,
    lastRefreshTime: lastRefreshTimeRef.current,
    refreshPrices,
    refreshError: refreshErrorRef.current instanceof Error ? refreshErrorRef.current :
      productsError instanceof Error ? productsError : null,
  };
};

export default useRealTimePricing;