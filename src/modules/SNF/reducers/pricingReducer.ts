import { PricingState, PricingAction } from '../types';

// Action types
export type PricingActionTypes = 
  | 'SET_DEPOT'
  | 'SET_LOCATION'
  | 'SET_PRODUCTS'
  | 'SET_DEPOT_VARIANTS'
  | 'SET_LOADING'
  | 'SET_ERROR'
  | 'SET_LOCATION_PERMISSION'
  | 'SET_SERVICE_AVAILABILITY';

// Reducer function
export function pricingReducer(state: PricingState, action: PricingAction): PricingState {
  switch (action.type) {
    case 'SET_DEPOT':
      return {
        ...state,
        currentDepot: action.payload,
        error: null, // Clear error when depot is set successfully
      };

    case 'SET_LOCATION':
      return {
        ...state,
        userLocation: action.payload,
        error: null, // Clear error when location is set successfully
      };

    case 'SET_PRODUCTS':
      return {
        ...state,
        products: action.payload,
        error: null, // Clear error when products are loaded successfully
      };

    case 'SET_DEPOT_VARIANTS':
      return {
        ...state,
        depotVariants: action.payload,
        error: null, // Clear error when variants are loaded successfully
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
        isLoading: false, // Stop loading when error occurs
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
      // Ensure exhaustive type checking
      const exhaustiveCheck: never = action as never;
      return state;
  }
}

// Action creators
export const pricingActions = {
  setDepot: (depot: PricingState['currentDepot']): PricingAction => ({
    type: 'SET_DEPOT',
    payload: depot,
  }),

  setLocation: (location: PricingState['userLocation']): PricingAction => ({
    type: 'SET_LOCATION',
    payload: location,
  }),

  setProducts: (products: PricingState['products']): PricingAction => ({
    type: 'SET_PRODUCTS',
    payload: products,
  }),

  setDepotVariants: (variants: PricingState['depotVariants']): PricingAction => ({
    type: 'SET_DEPOT_VARIANTS',
    payload: variants,
  }),

  setLoading: (loading: boolean): PricingAction => ({
    type: 'SET_LOADING',
    payload: loading,
  }),

  setError: (error: PricingState['error']): PricingAction => ({
    type: 'SET_ERROR',
    payload: error,
  }),

  setLocationPermission: (granted: boolean): PricingAction => ({
    type: 'SET_LOCATION_PERMISSION',
    payload: granted,
  }),

  setServiceAvailability: (availability: PricingState['serviceAvailability']): PricingAction => ({
    type: 'SET_SERVICE_AVAILABILITY',
    payload: availability,
  }),
};

// Helper functions for complex actions
export const createAsyncAction = <T,>(
  asyncFn: () => Promise<T>,
  loadingAction: () => PricingAction,
  successAction: (result: T) => PricingAction,
  errorAction: (error: any) => PricingAction
) => {
  return async (dispatch: React.Dispatch<PricingAction>) => {
    try {
      dispatch(loadingAction());
      const result = await asyncFn();
      dispatch(successAction(result));
    } catch (error) {
      dispatch(errorAction(error));
    }
  };
};

// Selectors for common state patterns
export const selectIsLoading = (state: PricingState): boolean => state.isLoading;
export const selectHasError = (state: PricingState): boolean => state.error !== null;
export const selectIsReady = (state: PricingState): boolean => 
  state.currentDepot !== null && state.userLocation !== null && !state.isLoading;
export const selectProductsCount = (state: PricingState): number => state.products.length;
export const selectDepotVariantsCount = (state: PricingState): number => state.depotVariants.length;
export const selectServiceAvailable = (state: PricingState): boolean => 
  state.serviceAvailability?.isAvailable ?? false;