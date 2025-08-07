# TypeScript Interfaces for Dynamic Product Pricing System

This document defines all TypeScript interfaces required for implementing the dynamic product pricing system.

## Core Interfaces

### Depot Interface

```typescript
interface Depot {
  id: string;
  name: string;
  address: string;
  isOnline: boolean;
  contactPerson?: string;
  contactNumber?: string;
}

interface DepotResponse {
  id: number;
  name: string;
  address: string;
  isOnline: boolean;
  contactPerson?: string;
  contactNumber?: string;
}
```

### Product Interface

```typescript
interface Product {
  id: string;
  name: string;
  description?: string;
  url?: string;
  attachmentUrl?: string;
  deliveredQuantity?: number;
  isDairyProduct: boolean;
  maintainStock: boolean;
  categoryId?: string;
  category?: Category;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

interface ProductResponse {
  id: number;
  name: string;
  description?: string;
  url?: string;
  attachmentUrl?: string;
  deliveredQuantity?: number;
  isDairyProduct: boolean;
  maintainStock: boolean;
  categoryId?: number;
  category?: CategoryResponse;
  createdAt: string;
  updatedAt: string;
}
```

### Product Variant Interface

```typescript
interface ProductVariant {
  id: string;
  productId: string;
  hsnCode?: string;
  mrp: number;
  sellingPrice: number;
  name: string;
  purchasePrice: number;
  gstRate: number;
  createdAt: string;
  updatedAt: string;
  product?: Product;
}

interface ProductVariantResponse {
  id: number;
  productId: number;
  hsnCode?: string;
  mrp: number;
  sellingPrice: number;
  name: string;
  purchasePrice: number;
  gstRate: number;
  createdAt: string;
  updatedAt: string;
}
```

### Depot Product Variant Interface

```typescript
interface DepotProductVariant {
  id: string;
  depotId: string;
  productId: string;
  name: string;
  hsnCode?: string;
  minimumQty: number;
  closingQty: number;
  notInStock: boolean;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
  buyOncePrice?: number;
  price15Day?: number;
  price1Month?: number;
  price3Day?: number;
  price7Day?: number;
  mrp: number;
  purchasePrice?: number;
  depot: Depot;
  product: Product;
  unit: string;
  isAvailable: boolean;
}

interface DepotProductVariantResponse {
  id: number;
  depotId: number;
  productId: number;
  name: string;
  hsnCode?: string;
  minimumQty: number;
  closingQty: number;
  notInStock: boolean;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
  buyOncePrice?: number;
  price15Day?: number;
  price1Month?: number;
  price3Day?: number;
  price7Day?: number;
  mrp: number;
  purchasePrice?: number;
  depot: DepotResponse;
  product: ProductResponse;
}
```

### Category Interface

```typescript
interface Category {
  id: string;
  name: string;
  isDairy: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface CategoryResponse {
  id: number;
  name: string;
  isDairy: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Area Master Interface

```typescript
interface AreaMaster {
  id: string;
  name: string;
  pincodes: string;
  deliveryType: "HandDelivery" | "Courier";
  depotId?: string;
  cityId?: string;
  isDairyProduct: boolean;
  depot?: Depot;
  city?: City;
  createdAt: string;
  updatedAt: string;
}

interface AreaMasterResponse {
  id: number;
  name: string;
  pincodes: string;
  deliveryType: "HandDelivery" | "Courier";
  depotId?: number;
  cityId?: number;
  isDairyProduct: boolean;
  depot?: DepotResponse;
  city?: CityResponse;
  createdAt: string;
  updatedAt: string;
}
```

### City Interface

```typescript
interface City {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface CityResponse {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}
```

## Service Interfaces

### Geolocation Service Interface

```typescript
interface GeolocationService {
  getCurrentPosition(): Promise<GeolocationPosition>;
  getCurrentPincode(): Promise<string>;
  getCoordinatesFromPincode(pincode: string): Promise<GeolocationCoordinates>;
  requestPermission(): Promise<PermissionState>;
}

interface GeolocationError {
  code: number;
  message: string;
  PERMISSION_DENIED: number;
  POSITION_UNAVAILABLE: number;
  TIMEOUT: number;
}
```

### Depot Mapping Service Interface

```typescript
interface DepotMappingService {
  getDepotByPincode(pincode: string): Promise<Depot>;
  getAllDepotsForPincode(pincode: string): Promise<Depot[]>;
  getDefaultDepot(depots: Depot[]): Depot | null;
  validatePincode(pincode: string): Promise<boolean>;
}

interface DepotMappingError {
  message: string;
  code: "INVALID_PINCODE" | "NO_DEPOT_FOUND" | "API_ERROR" | "NETWORK_ERROR";
}
```

### Product Service Interface

```typescript
interface ProductService {
  getProductsWithDepotPricing(depotId: string): Promise<Product[]>;
  getProductVariants(
    productId: string,
    depotId: string
  ): Promise<DepotProductVariant[]>;
  getProductById(productId: string): Promise<Product>;
  getProductsByCategory(
    categoryId: string,
    depotId: string
  ): Promise<Product[]>;
  searchProducts(query: string, depotId: string): Promise<Product[]>;
}

interface ProductError {
  message: string;
  code:
    | "PRODUCT_NOT_FOUND"
    | "VARIANT_NOT_FOUND"
    | "API_ERROR"
    | "NETWORK_ERROR";
}
```

### Cache Service Interface

```typescript
interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  invalidate(pattern: string): Promise<void>;
  getKeys(pattern?: string): Promise<string[]>;
}

interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  storage: "memory" | "localStorage" | "sessionStorage";
}
```

## Context Interfaces

### Depot Context Interface

```typescript
interface DepotContextType {
  currentDepot: Depot | null;
  setCurrentDepot: (depot: Depot) => void;
  isLoading: boolean;
  error: string | null;
  refreshDepot: () => Promise<void>;
  clearDepot: () => void;
}

interface DepotState {
  depot: Depot | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}
```

### Product Context Interface

```typescript
interface ProductContextType {
  products: Product[];
  loading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  searchProducts: (query: string) => Product[];
}

interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  searchQuery: string;
}
```

## Component Props Interfaces

### Pincode Input Component

```typescript
interface PincodeInputProps {
  value: string;
  onChange: (pincode: string) => void;
  onDepotChange: (depot: Depot) => void;
  error?: string;
  loading?: boolean;
  className?: string;
  placeholder?: string;
  showGeolocation?: boolean;
  onGeolocationError?: (error: GeolocationError) => void;
}

interface PincodeInputState {
  inputValue: string;
  isGeolocating: boolean;
  isValidating: boolean;
  localError: string | null;
}
```

### Depot Selector Component

```typescript
interface DepotSelectorProps {
  depots: Depot[];
  selectedDepot: Depot | null;
  onDepotSelect: (depot: Depot) => void;
  loading?: boolean;
  error?: string;
  className?: string;
  showDefaultOption?: boolean;
}

interface DepotSelectorState {
  isOpen: boolean;
  searchTerm: string;
  filteredDepots: Depot[];
}
```

### Product Grid Component

```typescript
interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  error?: string;
  onAddToCart?: (product: Product, variant: DepotProductVariant) => void;
  onViewDetails?: (product: Product) => void;
  className?: string;
  showPagination?: boolean;
  itemsPerPage?: number;
}

interface ProductGridState {
  currentPage: number;
  sortBy: "name" | "price" | "rating";
  sortOrder: "asc" | "desc";
  filteredProducts: Product[];
}
```

### Product Detail Page Component

```typescript
interface ProductDetailPageProps {
  productId: string;
  depotId?: string;
  onAddToCart?: (
    product: Product,
    variant: DepotProductVariant,
    quantity: number
  ) => void;
  onBuyNow?: (
    product: Product,
    variant: DepotProductVariant,
    quantity: number
  ) => void;
  className?: string;
}

interface ProductDetailPageState {
  product: Product | null;
  selectedVariant: DepotProductVariant | null;
  quantity: number;
  loading: boolean;
  error: string | null;
  activeImageIndex: number;
}
```

## API Response Interfaces

### API Response Wrapper

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  total?: number;
  page?: number;
  limit?: number;
}

interface ApiError {
  status: number;
  message: string;
  errors: string[];
  data?: any;
  originalError: any;
}
```

### Area Master API Responses

```typescript
interface AreaMasterListResponse extends ApiResponse<AreaMasterResponse[]> {
  total: number;
}

interface AreaMasterByPincodeResponse
  extends ApiResponse<AreaMasterResponse[]> {
  count: number;
}

interface DairyValidationResponse
  extends ApiResponse<{
    supported: boolean;
    message: string;
    areas: AreaMasterResponse[];
    dairySupportedAreas: AreaMasterResponse[];
  }> {}
```

### Depot Variants API Responses

```typescript
interface DepotVariantsListResponse
  extends ApiResponse<{
    depot: DepotResponse;
    variants: DepotProductVariantResponse[];
  }> {
  total: number;
}

interface DepotVariantsByProductResponse
  extends ApiResponse<DepotProductVariantResponse[]> {
  total: number;
}

interface AllDepotVariantsResponse
  extends ApiResponse<{
    depot: DepotResponse;
    products: {
      product: ProductResponse;
      variants: DepotProductVariantResponse[];
    }[];
  }> {
  total: number;
}
```

## Utility Interfaces

### Loading State Interface

```typescript
interface LoadingState {
  isLoading: boolean;
  error: string | null;
  hasLoaded: boolean;
  lastLoaded: string | null;
}
```

### Pagination Interface

```typescript
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
```

### Filter Options Interface

```typescript
interface FilterOptions {
  category?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  rating?: number;
  inStock?: boolean;
  isDairy?: boolean;
  searchQuery?: string;
}

interface SortOptions {
  field: "name" | "price" | "rating" | "createdAt";
  order: "asc" | "desc";
}
```

## Event Handler Interfaces

```typescript
interface GeolocationEventHandlers {
  onSuccess?: (position: GeolocationPosition) => void;
  onError?: (error: GeolocationError) => void;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}

interface DepotEventHandlers {
  onDepotChange?: (depot: Depot) => void;
  onDepotLoad?: (depots: Depot[]) => void;
  onDepotError?: (error: DepotMappingError) => void;
}

interface ProductEventHandlers {
  onProductLoad?: (products: Product[]) => void;
  onProductError?: (error: ProductError) => void;
  onAddToCart?: (product: Product, variant: DepotProductVariant) => void;
  onBuyNow?: (product: Product, variant: DepotProductVariant) => void;
}
```

These interfaces provide a comprehensive type system for the dynamic product pricing system, ensuring type safety and better developer experience throughout the implementation.
