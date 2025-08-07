import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { PricingContextType, PricingState, Depot, LocationData, Product, DepotVariant, ServiceAvailability, PricingError, GeolocationError } from '../types';
import { geolocationService } from '../services/geolocation';
import { depotMappingService } from '../services/depotMapping';
import { productService } from '../services/api';
import { cache } from '../services/cache';

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

// Action types
type PricingAction =
  | { type: 'SET_DEPOT'; payload: Depot }
  | { type: 'SET_LOCATION'; payload: LocationData }
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'SET_DEPOT_VARIANTS'; payload: DepotVariant[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: PricingError | GeolocationError | null }
  | { type: 'SET_LOCATION_PERMISSION'; payload: boolean }
  | { type: 'SET_SERVICE_AVAILABILITY'; payload: ServiceAvailability }
  | { type: 'RESET_STATE' }
  | { type: 'UPDATE_PRODUCT_VARIANTS'; payload: { productId: number; variants: DepotVariant[] } };

// Reducer
function pricingReducer(state: PricingState, action: PricingAction): PricingState {
  switch (action.type) {
    case 'SET_DEPOT':
      return {
        ...state,
        currentDepot: action.payload,
        error: null,
      };
    case 'SET_LOCATION':
      return {
        ...state,
        userLocation: action.payload,
        error: null,
      };
    case 'SET_PRODUCTS':
      return {
        ...state,
        products: action.payload,
        isLoading: false,
      };
    case 'SET_DEPOT_VARIANTS':
      return {
        ...state,
        depotVariants: action.payload,
        isLoading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    case 'SET_LOCATION_PERMISSION':
      return {
        ...state,
        isLocationPermissionGranted: action.payload,
      };
    case 'SET_SERVICE_AVAILABILITY':
      return {
        ...state,
        serviceAvailability: action.payload,
      };
    case 'UPDATE_PRODUCT_VARIANTS':
      return {
        ...state,
        depotVariants: state.depotVariants.map(variant => {
          if (variant.product.id === action.payload.productId) {
            return action.payload.variants.find(v => v.id === variant.id) || variant;
          }
          return variant;
        }),
      };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
}

// Context
const PricingContext = createContext<PricingContextType | undefined>(undefined);

// Provider component
interface PricingProviderProps {
  children: React.ReactNode;
}

export const PricingProvider: React.FC<PricingProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(pricingReducer, initialState);

  // Initialize location and depot on mount
  useEffect(() => {
    initializeLocationAndDepot();
  }, []);

  // Initialize location and depot
  const initializeLocationAndDepot = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Check location permission status
      const permissionStatus = await geolocationService.checkPermissionStatus();
      dispatch({ type: 'SET_LOCATION_PERMISSION', payload: permissionStatus === 'granted' });

      if (permissionStatus === 'granted') {
        // Get current location
        const location = await geolocationService.requestLocationWithExplanation();
        dispatch({ type: 'SET_LOCATION', payload: location });

        // Get depot for location
        const depot = await depotMappingService.getOptimalDepot(location.pincode);
        if (depot) {
          dispatch({ type: 'SET_DEPOT', payload: depot });
          
          // Check service availability
          const serviceAvailability = await depotMappingService.validateServiceAvailability(location.pincode);
          dispatch({ type: 'SET_SERVICE_AVAILABILITY', payload: serviceAvailability });

          // Load products and variants for the depot
          await loadProductsAndVariants(depot.id);
        } else {
          // Fallback to online depot
          const onlineDepot = await depotMappingService.getOnlineDepot();
          if (onlineDepot) {
            dispatch({ type: 'SET_DEPOT', payload: onlineDepot });
            await loadProductsAndVariants(onlineDepot.id);
          } else {
            dispatch({ 
              type: 'SET_ERROR', 
              payload: {
                type: 'DEPOT_NOT_FOUND',
                message: 'No depot found for your location. Please try again later.',
                code: 'DEPOT_NOT_FOUND',
              } as PricingError
            });
          }
        }
      } else if (permissionStatus === 'prompt') {
        // Request permission
        try {
          const location = await geolocationService.requestLocationWithExplanation();
          dispatch({ type: 'SET_LOCATION', payload: location });
          dispatch({ type: 'SET_LOCATION_PERMISSION', payload: true });

          const depot = await depotMappingService.getOptimalDepot(location.pincode);
          if (depot) {
            dispatch({ type: 'SET_DEPOT', payload: depot });
            await loadProductsAndVariants(depot.id);
          }
        } catch (error) {
          const geolocationError = error as GeolocationError;
          dispatch({ type: 'SET_ERROR', payload: geolocationError });
          
          // Fallback to online depot
          const onlineDepot = await depotMappingService.getOnlineDepot();
          if (onlineDepot) {
            dispatch({ type: 'SET_DEPOT', payload: onlineDepot });
            await loadProductsAndVariants(onlineDepot.id);
          }
        }
      } else {
        // Permission denied, fallback to online depot
        const onlineDepot = await depotMappingService.getOnlineDepot();
        if (onlineDepot) {
          dispatch({ type: 'SET_DEPOT', payload: onlineDepot });
          await loadProductsAndVariants(onlineDepot.id);
        } else {
          dispatch({ 
            type: 'SET_ERROR', 
            payload: {
              type: 'DEPOT_NOT_FOUND',
              message: 'Location access denied and no online depot available.',
              code: 'LOCATION_DENIED',
            } as PricingError
          });
        }
      }
    } catch (error) {
      console.error('Error initializing location and depot:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: {
          type: 'API_ERROR',
          message: 'Failed to initialize location services. Please try again.',
          details: error,
        } as PricingError
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Load products and variants for a depot
  const loadProductsAndVariants = useCallback(async (depotId: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Try to get from cache first
      const cacheKey = `products_${depotId}`;
      const cachedProducts = await cache.get<Product[]>(cacheKey);
      
      if (cachedProducts) {
        dispatch({ type: 'SET_PRODUCTS', payload: cachedProducts });
      } else {
        // Fetch from API
        const products = await productService.getProducts(depotId);
        dispatch({ type: 'SET_PRODUCTS', payload: products });
        await cache.set(cacheKey, products);
      }

      // Load variants
      const variantsCacheKey = `variants_${depotId}`;
      const cachedVariants = await cache.get<DepotVariant[]>(variantsCacheKey);
      
      if (cachedVariants) {
        dispatch({ type: 'SET_DEPOT_VARIANTS', payload: cachedVariants });
      } else {
        // Fetch from API
        const variants = await productService.getDepotVariants(depotId);
        dispatch({ type: 'SET_DEPOT_VARIANTS', payload: variants });
        await cache.set(variantsCacheKey, variants);
      }
    } catch (error) {
      console.error('Error loading products and variants:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: {
          type: 'API_ERROR',
          message: 'Failed to load products. Please try again.',
          details: error,
        } as PricingError
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Actions
  const actions = {
    setDepot: useCallback(async (depot: Depot) => {
      dispatch({ type: 'SET_DEPOT', payload: depot });
      await loadProductsAndVariants(depot.id);
    }, [loadProductsAndVariants]),

    setLocation: useCallback(async (location: LocationData) => {
      dispatch({ type: 'SET_LOCATION', payload: location });
      
      try {
        const depot = await depotMappingService.getOptimalDepot(location.pincode);
        if (depot) {
          dispatch({ type: 'SET_DEPOT', payload: depot });
          await loadProductsAndVariants(depot.id);
        }
      } catch (error) {
        console.error('Error setting location:', error);
        dispatch({ 
          type: 'SET_ERROR', 
          payload: {
            type: 'API_ERROR',
            message: 'Failed to set location. Please try again.',
            details: error,
          } as PricingError
        });
      }
    }, [loadProductsAndVariants]),

    refreshPricing: useCallback(async () => {
      if (state.currentDepot) {
        // Clear cache for current depot
        await cache.invalidate(`products_${state.currentDepot.id}`);
        await cache.invalidate(`variants_${state.currentDepot.id}`);
        
        // Reload data
        await loadProductsAndVariants(state.currentDepot.id);
      }
    }, [state.currentDepot, loadProductsAndVariants]),

    clearCache: useCallback(async () => {
      await cache.clear();
      if (state.currentDepot) {
        await loadProductsAndVariants(state.currentDepot.id);
      }
    }, [state.currentDepot, loadProductsAndVariants]),

    setError: useCallback((error: PricingError | GeolocationError | null) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    }, []),

    setLoading: useCallback((loading: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: loading });
    }, []),

    setLocationPermission: useCallback((granted: boolean) => {
      dispatch({ type: 'SET_LOCATION_PERMISSION', payload: granted });
    }, []),

    setServiceAvailability: useCallback((availability: ServiceAvailability) => {
      dispatch({ type: 'SET_SERVICE_AVAILABILITY', payload: availability });
    }, []),
  };

  const value: PricingContextType = {
    state,
    actions,
  };

  return (
    <PricingContext.Provider value={value}>
      {children}
    </PricingContext.Provider>
  );
};

// Hook to use the pricing context
export const usePricing = (): PricingContextType => {
  const context = useContext(PricingContext);
  if (context === undefined) {
    throw new Error('usePricing must be used within a PricingProvider');
  }
  return context;
};

// Hook to get current depot
export const useCurrentDepot = () => {
  const { state } = usePricing();
  return state.currentDepot;
};

// Hook to get user location
export const useUserLocation = () => {
  const { state } = usePricing();
  return state.userLocation;
};

// Hook to get products with depot-specific pricing
export const useDepotProducts = () => {
  const { state } = usePricing();
  return {
    products: state.products,
    variants: state.depotVariants,
    isLoading: state.isLoading,
    error: state.error,
    depot: state.currentDepot,
  };
};

// Hook to get service availability
export const useServiceAvailability = () => {
  const { state } = usePricing();
  return state.serviceAvailability;
};

// Hook to get loading state
export const usePricingLoading = () => {
  const { state } = usePricing();
  return state.isLoading;
};

// Hook to get error state
export const usePricingError = () => {
  const { state, actions } = usePricing();
  return {
    error: state.error,
    clearError: () => actions.setError(null),
  };
};