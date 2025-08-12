import { useCallback, useEffect, useState } from 'react';
import { usePricing } from '../context/PricingContext';
import { geolocationService } from '../services/geolocation';
import { depotMappingService } from '../services/depotMapping';
import { productService } from '../services/api';
import { UseLocationReturn, UseDepotReturn, LocationData, GeolocationError, Depot, PricingError } from '../types';

/**
 * Hook for managing user location with automatic detection and manual entry
 */
export const useLocation = (): UseLocationReturn => {
  const { state, actions } = usePricing();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<GeolocationError | null>(null);

  const requestLocation = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const location = await geolocationService.requestLocationWithExplanation();
      actions.setLocation(location);
      actions.setLocationPermission(true);
    } catch (err) {
      const geolocationError = err as GeolocationError;
      setError(geolocationError);
      actions.setError(geolocationError);
    } finally {
      setIsLoading(false);
    }
  }, [actions]);

  const setManualPincode = useCallback(async (pincode: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const location = await geolocationService.getPositionFromPincode(pincode);
      actions.setLocation(location);
    } catch (err) {
      const geolocationError = err as GeolocationError;
      setError(geolocationError);
      actions.setError(geolocationError);
    } finally {
      setIsLoading(false);
    }
  }, [actions]);

  return {
    location: state.userLocation,
    error,
    isLoading,
    requestLocation,
    setManualPincode,
    permissionGranted: state.isLocationPermissionGranted,
  };
};

/**
 * Hook for managing depot selection and fallback
 */
export const useDepot = (): UseDepotReturn => {
  const { state, actions } = usePricing();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<PricingError | null>(null);

  const setDepot = useCallback(async (depot: Depot) => {
    try {
      setIsLoading(true);
      setError(null);
      actions.setDepot(depot);
    } catch (err) {
      const pricingError = err as PricingError;
      setError(pricingError);
      actions.setError(pricingError);
    } finally {
      setIsLoading(false);
    }
  }, [actions]);

  const refreshDepot = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (state.userLocation) {
        const depot = await depotMappingService.getOptimalDepot(state.userLocation.pincode);
        if (depot) {
          actions.setDepot(depot);
        } else {
          const onlineDepot = await depotMappingService.getOnlineDepot();
          if (onlineDepot) {
            actions.setDepot(onlineDepot);
          } else {
            setError({
              type: 'DEPOT_NOT_FOUND',
              message: 'No depot found for your location.',
              code: 'DEPOT_NOT_FOUND',
            } as PricingError);
          }
        }
      } else {
        const onlineDepot = await depotMappingService.getOnlineDepot();
        if (onlineDepot) {
          actions.setDepot(onlineDepot);
        } else {
          setError({
            type: 'DEPOT_NOT_FOUND',
            message: 'No online depot available.',
            code: 'NO_ONLINE_DEPOT',
          } as PricingError);
        }
      }
    } catch (err) {
      const pricingError = err as PricingError;
      setError(pricingError);
      actions.setError(pricingError);
    } finally {
      setIsLoading(false);
    }
  }, [state.userLocation, actions]);

  return {
    depot: state.currentDepot,
    error,
    isLoading,
    setDepot,
    refreshDepot,
  };
};


/**
 * Hook for managing product pricing with real-time updates
 */
export const useProductPricing = (productId?: number) => {
  const { state } = usePricing();
  const [isLoading, setIsLoading] = useState(false);

  const getProductVariants = useCallback(() => {
    if (!productId) return [];
    return state.depotVariants.filter(variant => variant.product.id === productId);
  }, [productId, state.depotVariants]);

  const getProductPrice = useCallback(() => {
    const variants = getProductVariants();
    return variants.length > 0 ? variants[0].mrp : 0;
  }, [getProductVariants]);

  const refreshProductPricing = useCallback(async () => {
    if (!productId || !state.currentDepot) return;

    try {
      setIsLoading(true);
      const variants = await productService.getProductVariants(productId, state.currentDepot.id);
      
      // Update the variants in state
      const updatedVariants = state.depotVariants.map(variant => {
        if (variant.product.id === productId) {
          const newVariant = variants.find(v => v.id === variant.id);
          return newVariant || variant;
        }
        return variant;
      });

      // Update through context actions
      const { actions } = usePricing();
      actions.refreshPricing();
    } catch (error) {
      console.error('Error refreshing product pricing:', error);
    } finally {
      setIsLoading(false);
    }
  }, [productId, state.currentDepot, state.depotVariants]);

  return {
    variants: getProductVariants(),
    price: getProductPrice(),
    isLoading,
    refreshPricing: refreshProductPricing,
  };
};

/**
 * Hook for managing location permission
 */
export const useLocationPermission = () => {
  const { state, actions } = usePricing();
  const [isChecking, setIsChecking] = useState(false);

  const checkPermission = useCallback(async () => {
    try {
      setIsChecking(true);
      const permission = await geolocationService.checkPermissionStatus();
      actions.setLocationPermission(permission === 'granted');
      return permission;
    } catch (error) {
      console.error('Error checking location permission:', error);
      return 'prompt';
    } finally {
      setIsChecking(false);
    }
  }, [actions]);

  const requestPermission = useCallback(async () => {
    try {
      setIsChecking(true);
      const permission = await geolocationService.requestPermission();
      actions.setLocationPermission(permission === 'granted');
      return permission;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return 'denied';
    } finally {
      setIsChecking(false);
    }
  }, [actions]);

  return {
    granted: state.isLocationPermissionGranted,
    isChecking,
    checkPermission,
    requestPermission,
  };
};

/**
 * Hook for managing service availability
 */
export const useServiceAvailability = () => {
  const { state } = usePricing();
  const [isLoading, setIsLoading] = useState(false);

  const checkServiceAvailability = useCallback(async (pincode: string) => {
    try {
      setIsLoading(true);
      const availability = await depotMappingService.validateServiceAvailability(pincode);
      const { actions } = usePricing();
      actions.setServiceAvailability(availability);
      return availability;
    } catch (error) {
      console.error('Error checking service availability:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    availability: state.serviceAvailability,
    isLoading,
    checkServiceAvailability,
  };
};

/**
 * Hook for managing loading states with debounce
 */
export const useDebouncedLoading = (delay: number = 300) => {
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedLoading, setDebouncedLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLoading(isLoading);
    }, delay);

    return () => clearTimeout(timer);
  }, [isLoading, delay]);

  return {
    isLoading: debouncedLoading,
    setLoading: setIsLoading,
  };
};

/**
 * Hook for managing error states with auto-dismiss
 */
export const useAutoDismissError = (dismissDelay: number = 5000) => {
  const { state, actions } = usePricing();
  const [visibleError, setVisibleError] = useState<GeolocationError | PricingError | null>(null);

  useEffect(() => {
    if (state.error) {
      setVisibleError(state.error);
      const timer = setTimeout(() => {
        setVisibleError(null);
        actions.setError(null);
      }, dismissDelay);

      return () => clearTimeout(timer);
    }
  }, [state.error, actions, dismissDelay]);

  return {
    error: visibleError,
    dismissError: () => {
      setVisibleError(null);
      actions.setError(null);
    },
  };
};

/**
 * Hook for managing background data refresh
 */
export const useBackgroundRefresh = (refreshInterval: number = 5 * 60 * 1000) => {
  const { state, actions } = usePricing();

  useEffect(() => {
    if (!state.currentDepot) return;

    const interval = setInterval(async () => {
      try {
        await actions.refreshPricing();
      } catch (error) {
        console.error('Error during background refresh:', error);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [state.currentDepot, actions, refreshInterval]);
};

/**
 * Hook for managing online/offline status
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

/**
 * Hook for managing responsive breakpoints
 */
export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setBreakpoint('sm');
      } else if (width < 768) {
        setBreakpoint('md');
      } else if (width < 1024) {
        setBreakpoint('lg');
      } else {
        setBreakpoint('xl');
      }
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);

    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
};