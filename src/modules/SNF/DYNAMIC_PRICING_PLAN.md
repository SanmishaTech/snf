# Dynamic Product Pricing System Implementation Plan

## Overview

This document outlines the implementation plan for a dynamic product pricing system that retrieves real products and variants from the database, linking each product to its depot-specific variants through the depotvariants module. The system will automatically determine the user's depot by capturing their pincode via Chrome's geolocation API, then map the pincode to a depot using the area master module.

## System Architecture

### 1. Data Flow

```
User Location → Geolocation API → Pincode → Area Master → Depot → Depot Variants → Product Pricing
```

### 2. Key Components

#### 2.1 Geolocation Service

- **Purpose**: Capture user's location and convert to pincode
- **Implementation**:
  - Use Chrome's Geolocation API
  - Reverse geocoding to get pincode from coordinates
  - Fallback to manual pincode entry
  - Error handling for permission denied or unavailable

#### 2.2 Pincode-to-Depot Mapping Service

- **Purpose**: Map user's pincode to the appropriate depot
- **Implementation**:
  - Use existing `/api/public/area-masters/by-pincode/:pincode` endpoint
  - Handle multiple depots per pincode (priority logic)
  - Cache results for performance

#### 2.3 Depot Context Provider

- **Purpose**: Global state management for user's selected depot
- **Implementation**:
  - React Context API for depot state
  - Persistent storage (localStorage) for depot preference
  - Real-time updates across components

#### 2.4 Product Data Service

- **Purpose**: Fetch products with depot-specific pricing
- **Implementation**:
  - Use existing `/api/public/depot-variants` endpoints
  - Batch queries for optimized performance
  - Caching strategy for frequently accessed data

#### 2.5 UI Components

- **PincodeInput**: Component for pincode entry with geolocation
- **DepotSelector**: Component for manual depot selection
- **ProductGrid**: Updated to show real products with depot pricing
- **ProductDetailPage**: Updated to show depot-specific variants

## Implementation Steps

### Phase 1: Core Services

#### 1.1 Create Geolocation Service

```typescript
// services/geolocationService.ts
interface GeolocationService {
  getCurrentPincode(): Promise<string>;
  getCoordinatesFromPincode(pincode: string): Promise<Coordinates>;
}
```

#### 1.2 Create Pincode-to-Depot Mapping Service

```typescript
// services/depotMappingService.ts
interface DepotMappingService {
  getDepotByPincode(pincode: string): Promise<Depot>;
  getAllDepotsForPincode(pincode: string): Promise<Depot[]>;
}
```

#### 1.3 Create Depot Context Provider

```typescript
// contexts/DepotContext.tsx
interface DepotContextType {
  currentDepot: Depot | null;
  setCurrentDepot: (depot: Depot) => void;
  isLoading: boolean;
  error: string | null;
}
```

### Phase 2: Data Services

#### 2.1 Create Product Data Service

```typescript
// services/productService.ts
interface ProductService {
  getProductsWithDepotPricing(depotId: string): Promise<Product[]>;
  getProductVariants(productId: string, depotId: string): Promise<Variant[]>;
}
```

#### 2.2 Implement Caching Strategy

```typescript
// services/cacheService.ts
interface CacheService {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
}
```

### Phase 3: UI Components

#### 3.1 Create Pincode Input Component

```typescript
// components/PincodeInput.tsx
interface PincodeInputProps {
  onPincodeChange: (pincode: string) => void;
  onDepotChange: (depot: Depot) => void;
  error?: string;
}
```

#### 3.2 Create Depot Selector Component

```typescript
// components/DepotSelector.tsx
interface DepotSelectorProps {
  depots: Depot[];
  selectedDepot: Depot | null;
  onDepotSelect: (depot: Depot) => void;
}
```

#### 3.3 Update Product Grid Component

- Replace mock data with real API calls
- Add loading states
- Implement depot-specific pricing
- Add error handling

#### 3.4 Update Product Detail Page

- Fetch real product data
- Show depot-specific variants
- Implement dynamic pricing
- Add variant selection

### Phase 4: Integration

#### 4.1 Update Header Component

- Add pincode input
- Add depot selector
- Show current depot info

#### 4.2 Update Landing Page

- Integrate depot context
- Add loading states
- Implement real-time price updates

#### 4.3 Implement Error Handling

- Geolocation permission errors
- Invalid pincodes
- Network errors
- API error handling

## API Endpoints to be Used

### Existing Endpoints

- `GET /api/public/area-masters/by-pincode/:pincode` - Get area masters by pincode
- `GET /api/public/depot-variants` - Get all depot variants
- `GET /api/public/depot-variants/:productId` - Get variants for specific product
- `GET /api/public/depots/:depotId/variants` - Get variants for specific depot

### Data Models

#### Depot

```typescript
interface Depot {
  id: string;
  name: string;
  address: string;
  isOnline: boolean;
  contactPerson?: string;
  contactNumber?: string;
}
```

#### Product

```typescript
interface Product {
  id: string;
  name: string;
  description?: string;
  isDairyProduct: boolean;
  variants: Variant[];
}
```

#### Variant

```typescript
interface Variant {
  id: string;
  name: string;
  mrp: number;
  buyOncePrice?: number;
  price3Day?: number;
  price7Day?: number;
  price15Day?: number;
  price1Month?: number;
  minimumQty: number;
  unit: string;
  depot: Depot;
}
```

## Performance Optimizations

### 1. Caching Strategy

- Cache depot variants by depot ID
- Cache area masters by pincode
- Implement TTL for cache invalidation
- Use localStorage for user's depot preference

### 2. Batched Queries

- Fetch all variants for a depot in single request
- Pre-fetch related products
- Implement pagination for large datasets

### 3. Real-time Updates

- Use React Context for global depot state
- Implement optimistic updates
- Add loading states for better UX

## Error Handling

### 1. Geolocation Errors

- Permission denied
- Position unavailable
- Timeout
- Fallback to manual entry

### 2. API Errors

- Network errors
- Invalid responses
- Rate limiting
- Server errors

### 3. User Experience

- Loading skeletons
- Error messages
- Retry mechanisms
- Fallback options

## Testing Strategy

### 1. Unit Tests

- Geolocation service
- Depot mapping service
- Cache service
- Utility functions

### 2. Integration Tests

- API integration
- Context provider
- Component interactions

### 3. E2E Tests

- User flow from location to pricing
- Error scenarios
- Performance testing

## Timeline Estimate

- Phase 1 (Core Services): 2-3 days
- Phase 2 (Data Services): 2-3 days
- Phase 3 (UI Components): 3-4 days
- Phase 4 (Integration): 2-3 days
- Testing & Bug Fixes: 2-3 days

**Total Estimated Time: 11-16 days**

## Success Metrics

1. User can automatically detect location and see depot-specific pricing
2. Manual pincode entry works as fallback
3. Prices update in real-time without page reload
4. Performance is optimized with caching
5. Error handling covers all edge cases
6. System works across different browsers and devices
