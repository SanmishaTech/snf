// Core types for the dynamic pricing system

/**
 * Location data structure
 */
export interface LocationData {
  latitude: number;
  longitude: number;
  pincode: string;
  accuracy?: number;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
}

/**
 * Geolocation error types
 */
export type GeolocationErrorType = 
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'INVALID_PINCODE';

/**
 * Geolocation error structure
 */
export interface GeolocationError {
  type: GeolocationErrorType;
  message: string;
  code: number | string;
  recoverable?: boolean;
  details?: any;
}

/**
 * Geolocation options
 */
export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

/**
 * Geolocation service interface
 */
export interface GeolocationService {
  isGeolocationSupported(): boolean;
  checkPermissionStatus(): Promise<PermissionState>;
  requestPermission(): Promise<PermissionState>;
  requestLocationWithExplanation(options?: GeolocationOptions): Promise<LocationData>;
  getPositionFromPincode(pincode: string): Promise<LocationData>;
  watchPosition(
    callback: (position: LocationData) => void,
    errorCallback?: (error: GeolocationError) => void,
    options?: GeolocationOptions
  ): () => void;
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
}

/**
 * Depot information structure
 */
export interface Depot {
  id: number;
  name: string;
  address: string;
  contactPerson?: string;
  contactNumber?: string;
  isOnline: boolean;
  latitude?: number;
  longitude?: number;
  serviceRadius?: number;
}

/**
 * Service availability information
 */
export interface ServiceAvailability {
  isAvailable: boolean;
  depot?: Depot;
  estimatedDeliveryTime?: string;
  deliveryCharges?: number;
  minimumOrderAmount?: number;
  message?: string;
}

/**
 * Depot mapping service interface
 */
export interface DepotMappingService {
  getOptimalDepot(pincode: string): Promise<Depot | null>;
  getOnlineDepot(): Promise<Depot | null>;
  validateServiceAvailability(pincode: string): Promise<ServiceAvailability>;
  getAllDepots(): Promise<Depot[]>;
  getDepotsByLocation(latitude: number, longitude: number): Promise<Depot[]>;
}

/**
 * Product information structure
 */
export interface Product {
  id: number;
  name: string;
  description?: string;
  url?: string;
  attachmentUrl?: string;
  deliveredQuantity?: number;
  isDairyProduct: boolean;
  maintainStock: boolean;
  categoryId?: number;
  tags?: string;
  createdAt: Date;
  updatedAt: Date;
  category?: Category;
}

/**
 * Category information structure
 */
export interface Category {
  id: number;
  name: string;
  isDairy: boolean;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Depot variant (product variant with depot-specific pricing)
 */
export interface DepotVariant {
  id: number;
  depotId: number;
  productId: number;
  name: string;
  hsnCode?: string;
  minimumQty: number;
  closingQty: number;
  notInStock: boolean;
  isHidden: boolean;
  buyOncePrice?: number;
  price15Day?: number;
  price1Month?: number;
  price3Day?: number;
  price7Day?: number;
  mrp: number;
  purchasePrice?: number;
  createdAt: Date;
  updatedAt: Date;
  depot: Depot;
  product: Product;
}

/**
 * API service interface for products and variants
 */
export interface ProductService {
  getProducts(depotId: number): Promise<Product[]>;
  getProductById(id: number): Promise<Product | null>;
  getDepotVariants(depotId: number): Promise<DepotVariant[]>;
  getProductVariants(productId: number, depotId: number): Promise<DepotVariant[]>;
  getProductsByCategory(categoryId: number, depotId: number): Promise<Product[]>;
  searchProducts(query: string, depotId: number): Promise<Product[]>;
}


/**
 * Pricing error types
 */
export type PricingErrorType =
  | 'API_ERROR'
  | 'DEPOT_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'INVALID_PINCODE';

/**
 * Pricing error structure
 */
export interface PricingError {
  type: PricingErrorType;
  message: string;
  code: string;
  recoverable?: boolean;
  details?: any;
}

/**
 * Pricing state structure
 */
export interface PricingState {
  currentDepot: Depot | null;
  userLocation: LocationData | null;
  products: Product[];
  depotVariants: DepotVariant[];
  isLoading: boolean;
  error: PricingError | GeolocationError | null;
  isLocationPermissionGranted: boolean;
  serviceAvailability: ServiceAvailability | null;
}

/**
 * Pricing context actions
 */
export interface PricingActions {
  setDepot: (depot: Depot) => Promise<void>;
  setLocation: (location: LocationData) => Promise<void>;
  refreshPricing: () => Promise<void>;
  setError: (error: PricingError | GeolocationError | null) => void;
  setLoading: (loading: boolean) => void;
  setLocationPermission: (granted: boolean) => void;
  setServiceAvailability: (availability: ServiceAvailability) => void;
}

/**
 * Pricing context type
 */
export interface PricingContextType {
  state: PricingState;
  actions: PricingActions;
}

/**
 * Hook return types
 */
export interface UseLocationReturn {
  location: LocationData | null;
  error: GeolocationError | null;
  isLoading: boolean;
  requestLocation: () => Promise<void>;
  setManualPincode: (pincode: string) => Promise<void>;
  permissionGranted: boolean;
}

export interface UseDepotReturn {
  depot: Depot | null;
  error: PricingError | null;
  isLoading: boolean;
  setDepot: (depot: Depot) => Promise<void>;
  refreshDepot: () => Promise<void>;
}


/**
 * Product with pricing information for display
 */
export interface ProductWithPricing {
  product: Product;
  variants: DepotVariant[];
  buyOncePrice: number;
  mrp: number;
  discount?: number;
  inStock: boolean;
  deliveryTime?: string;
}

/**
 * Filter and sort options
 */
export interface FilterOptions {
  categories?: number[];
  priceRange?: [number, number];
  inStockOnly?: boolean;
  isDairyProduct?: boolean;
}

export interface SortOptions {
  field: 'price' | 'name' | 'popularity' | 'rating';
  direction: 'asc' | 'desc';
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  timestamp: Date;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Debounce utility type
 */
export type DebouncedFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): Promise<ReturnType<T>>;
  cancel: () => void;
};

/**
 * Event types for real-time updates
 */
export type PricingEventType = 
  | 'PRICE_UPDATE'
  | 'STOCK_UPDATE'
  | 'DEPOT_CHANGE'
  | 'LOCATION_CHANGE'
  | 'SERVICE_AVAILABILITY_CHANGE';

/**
 * Pricing event structure
 */
export interface PricingEvent {
  type: PricingEventType;
  payload: any;
  timestamp: Date;
  source: string;
}

/**
 * Event handler type
 */
export type EventHandler<T = any> = (event: PricingEvent & { payload: T }) => void;

/**
 * Event emitter interface
 */
export interface EventEmitter {
  on<T>(event: PricingEventType, handler: EventHandler<T>): void;
  off<T>(event: PricingEventType, handler: EventHandler<T>): void;
  emit<T>(event: PricingEventType, payload: T): void;
  removeAllListeners(event?: PricingEventType): void;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  apiResponseTime: number;
  errorRate: number;
  lastUpdated: Date;
}

/**
 * User preferences
 */
export interface UserPreferences {
  preferredDepotId?: number;
  savedPincodes: string[];
  notificationSettings: {
    priceUpdates: boolean;
    stockAlerts: boolean;
    deliveryUpdates: boolean;
  };
  displaySettings: {
    currency: string;
    showDiscounts: boolean;
    showOriginalPrice: boolean;
  };
}

/**
 * Pricing action types
 */
export type PricingActionTypes =
  | 'SET_DEPOT'
  | 'SET_LOCATION'
  | 'SET_PRODUCTS'
  | 'SET_DEPOT_VARIANTS'
  | 'SET_LOADING'
  | 'SET_ERROR'
  | 'SET_LOCATION_PERMISSION'
  | 'SET_SERVICE_AVAILABILITY';

/**
 * Pricing action structure
 */
export interface PricingAction<T = any> {
  type: PricingActionTypes;
  payload: T;
}