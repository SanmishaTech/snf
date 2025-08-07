import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { 
  PricingState, 
  PricingActions, 
  PricingContextType, 
  Product, 
  Depot, 
  LocationData, 
  ServiceAvailability,
  PricingError,
  GeolocationError
} from '../types';
import { pricingReducer } from '../reducers/pricingReducer';
import { depotMappingService } from '../services/depotMapping';
import { productService } from '../services/api';
import { cacheManager } from '../services/cache';

// Initial state
const initialState: PricingState = {
  currentDepot: null,
  userLocation: null,
  products: [],
  depotVariants: [],
  isLoading: false,
  error: null,
  isLocationPermissionGranted: false,
  serviceAvailability: null,
};

// Create context
const PricingContext = createContext<PricingContextType | undefined>(undefined);

// Context provider component
interface PricingProviderProps {
  children: React.ReactNode;
}

export const PricingProvider: React.FC<PricingProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(pricingReducer, initialState);

  // Actions
  const actions: PricingActions = {
    setDepot: async (depot: Depot) => {
      dispatch({ type: 'SET_DEPOT', payload: depot });
      
      // Clear products cache when depot changes
      await cacheManager.invalidate('products:*');
      
      // Load products for the new depot
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const products = await productService.getProducts(depot.id);
        dispatch({ type: 'SET_PRODUCTS', payload: products });
      } catch (error) {
        const pricingError: PricingError = {
          type: 'API_ERROR',
          message: 'Failed to load products for the selected depot',
          code: 'PRODUCTS_LOAD_FAILED',
          recoverable: true,
          details: error,
        };
        dispatch({ type: 'SET_ERROR', payload: pricingError });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    setLocation: async (location: LocationData) => {
      dispatch({ type: 'SET_LOCATION', payload: location });
      
      // Get optimal depot for the location
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const depot = await depotMappingService.getOptimalDepot(location.pincode);
        
        if (depot) {
          await actions.setDepot(depot);
        }
        
        // Check service availability
        const serviceAvailability = await depotMappingService.validateServiceAvailability(location.pincode);
        dispatch({ type: 'SET_SERVICE_AVAILABILITY', payload: serviceAvailability });
      } catch (error) {
        const pricingError: PricingError = {
          type: 'DEPOT_NOT_FOUND',
          message: 'No depot found for your location',
          code: 'DEPOT_NOT_FOUND',
          recoverable: true,
          details: error,
        };
        dispatch({ type: 'SET_ERROR', payload: pricingError });
        
        // Fallback to online depot
        try {
          const onlineDepot = await depotMappingService.getOnlineDepot();
          if (onlineDepot) {
            await actions.setDepot(onlineDepot);
          }
        } catch (fallbackError) {
          console.error('Fallback to online depot failed:', fallbackError);
        }
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    refreshPricing: async () => {
      if (!state.currentDepot) return;
      
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });
        
        // Clear cache
        await cacheManager.invalidate('products:*');
        await cacheManager.invalidate('variants:*');
        
        // Reload products
        const products = await productService.getProducts(state.currentDepot.id);
        dispatch({ type: 'SET_PRODUCTS', payload: products });
        
        // Reload depot variants
        const variants = await productService.getDepotVariants(state.currentDepot.id);
        dispatch({ type: 'SET_DEPOT_VARIANTS', payload: variants });
      } catch (error) {
        const pricingError: PricingError = {
          type: 'API_ERROR',
          message: 'Failed to refresh pricing information',
          code: 'PRICING_REFRESH_FAILED',
          recoverable: true,
          details: error,
        };
        dispatch({ type: 'SET_ERROR', payload: pricingError });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    clearCache: async () => {
      await cacheManager.clear();
      dispatch({ type: 'SET_PRODUCTS', payload: [] });
      dispatch({ type: 'SET_DEPOT_VARIANTS', payload: [] });
    },

    setError: (error: PricingError | GeolocationError | null) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    },

    setLoading: (loading: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: loading });
    },

    setLocationPermission: (granted: boolean) => {
      dispatch({ type: 'SET_LOCATION_PERMISSION', payload: granted });
    },

    setServiceAvailability: (availability: ServiceAvailability) => {
      dispatch({ type: 'SET_SERVICE_AVAILABILITY', payload: availability });
    },
  };

  // Auto-refresh pricing every 15 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.currentDepot && !state.isLoading) {
        actions.refreshPricing();
      }
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(interval);
  }, [state.currentDepot, state.isLoading]);

  // Prefetch products when depot is set
  useEffect(() => {
    if (state.currentDepot && state.products.length === 0) {
      const prefetchProducts = async () => {
        try {
          const cacheKey = `products:${state.currentDepot!.id}`;
          await cacheManager.prefetch(cacheKey, () => 
            productService.getProducts(state.currentDepot!.id)
          );
        } catch (error) {
          console.warn('Failed to prefetch products:', error);
        }
      };
      
      prefetchProducts();
    }
  }, [state.currentDepot, state.products.length]);

  return (
    <PricingContext.Provider value={{ state, actions }}>
      {children}
    </PricingContext.Provider>
  );
};

// Hook to use the pricing context
export const usePricingContext = (): PricingContextType => {
  const context = useContext(PricingContext);
  if (context === undefined) {
    throw new Error('usePricingContext must be used within a PricingProvider');
  }
  return context;
};

// Hook to use pricing state
export const usePricingState = (): PricingState => {
  const { state } = usePricingContext();
  return state;
};

// Hook to use pricing actions
export const usePricingActions = (): PricingActions => {
  const { actions } = usePricingContext();
  return actions;
};