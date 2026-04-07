import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { PricingContextType, PricingState, Depot, LocationData, DepotVariant, ServiceAvailability, PricingError, GeolocationError } from '../types';
import { geolocationService } from '../services/geolocation';
import { depotMappingService } from '../services/depotMapping';
import { productService } from '../services/api';

const initialState: PricingState = {
  currentDepot: null,
  userLocation: null,
  depotVariants: [],
  isLoading: false,
  error: null,
  isLocationPermissionGranted: false,
  serviceAvailability: null,
};

type PricingAction =
  | { type: 'SET_DEPOT'; payload: Depot }
  | { type: 'SET_LOCATION'; payload: LocationData }
  | { type: 'SET_DEPOT_VARIANTS'; payload: DepotVariant[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: PricingError | GeolocationError | null }
  | { type: 'SET_LOCATION_PERMISSION'; payload: boolean }
  | { type: 'SET_SERVICE_AVAILABILITY'; payload: ServiceAvailability };

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
    default:
      return state;
  }
}

const PricingContext = createContext<PricingContextType | undefined>(undefined);

export const PricingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(pricingReducer, initialState);

  // Load pricing/variants for a depot
  const loadPricingAndVariants = useCallback(async (depotId: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const variants = await productService.getDepotVariants(depotId);
      dispatch({ type: 'SET_DEPOT_VARIANTS', payload: variants });
    } catch (error) {
      console.error('Error loading pricing and variants:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: {
          type: 'API_ERROR',
          message: 'Failed to load pricing data. Please try again.',
          details: error,
          code: 'FETCH_ERROR'
        } as PricingError
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Initialize location and depot
  useEffect(() => {
    const init = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const permissionStatus = await geolocationService.checkPermissionStatus();
        dispatch({ type: 'SET_LOCATION_PERMISSION', payload: permissionStatus === 'granted' });

        let location: LocationData | null = null;
        if (permissionStatus === 'granted' || permissionStatus === 'prompt') {
          try {
            location = await geolocationService.requestLocationWithExplanation();
            dispatch({ type: 'SET_LOCATION', payload: location });
          } catch (e) {
            console.warn('Geolocation failed, falling back to online depot', e);
          }
        }

        const depot = location 
          ? await depotMappingService.getOptimalDepot(location.pincode)
          : await depotMappingService.getOnlineDepot();

        if (depot) {
          dispatch({ type: 'SET_DEPOT', payload: depot });
          await loadPricingAndVariants(depot.id);
          
          if (location) {
            const availability = await depotMappingService.validateServiceAvailability(location.pincode);
            dispatch({ type: 'SET_SERVICE_AVAILABILITY', payload: availability });
          }
        } else {
          dispatch({
            type: 'SET_ERROR',
            payload: {
              type: 'DEPOT_NOT_FOUND',
              message: 'No service available in your area.',
              code: 'DEPOT_NOT_FOUND'
            } as PricingError
          });
        }
      } catch (error) {
        console.error('PricingContext init error:', error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    init();
  }, [loadPricingAndVariants]);

  const actions = {
    setDepot: useCallback(async (depot: Depot) => {
      dispatch({ type: 'SET_DEPOT', payload: depot });
      await loadPricingAndVariants(depot.id);
    }, [loadPricingAndVariants]),

    setLocation: useCallback(async (location: LocationData) => {
      dispatch({ type: 'SET_LOCATION', payload: location });
      const depot = await depotMappingService.getOptimalDepot(location.pincode);
      if (depot) {
        dispatch({ type: 'SET_DEPOT', payload: depot });
        await loadPricingAndVariants(depot.id);
      }
    }, [loadPricingAndVariants]),

    setLocationWithDepot: useCallback(async (location: LocationData, depot: Depot) => {
      dispatch({ type: 'SET_LOCATION', payload: location });
      dispatch({ type: 'SET_DEPOT', payload: depot });
      await loadPricingAndVariants(depot.id);
    }, [loadPricingAndVariants]),

    refreshPricing: useCallback(async () => {
      if (state.currentDepot) {
        await loadPricingAndVariants(state.currentDepot.id);
      }
    }, [state.currentDepot, loadPricingAndVariants]),

    setError: useCallback((error: PricingError | GeolocationError | null) => {
      dispatch({ type: 'SET_ERROR', payload: error as any });
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

  return (
    <PricingContext.Provider value={{ state, actions }}>
      {children}
    </PricingContext.Provider>
  );
};

export const usePricing = () => {
  const context = useContext(PricingContext);
  if (context === undefined) {
    throw new Error('usePricing must be used within a PricingProvider');
  }
  return context;
};