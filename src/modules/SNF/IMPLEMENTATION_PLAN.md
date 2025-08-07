# Dynamic Product Pricing System Implementation Plan

## Overview

This document outlines the implementation plan for a dynamic product pricing system that retrieves real products and variants from the database, linking each product to its depot-specific variants through the depotvariants module. The system will automatically determine the user's depot by capturing their pincode via Chrome's geolocation API, then map the pincode to a depot using the area master module.

## System Architecture

### Current State Analysis

- **SNF Frontend Module**: Currently uses mock data for products and categories
- **Backend APIs**: Existing APIs for depot variants, area masters, and products are available
- **Database Schema**: Complete schema with DepotProductVariant, AreaMaster, Product, and related models
- **Current Limitations**: Static pricing, no location-based features, mock data only

### Target Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Device   │    │   Frontend      │    │   Backend API   │
│                 │    │   (SNF Module)  │    │                 │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │Geolocation  │ │◄──►│ │Location     │ │◄──►│ │Area Master │ │
│ │API          │ │    │ │Service      │ │    │ │API         │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │Manual Pin   │ │◄──►│ │Pricing      │ │◄──►│ │Depot       │ │
│ │Code Entry   │ │    │ │Service      │ │    │ │Variants API│ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│                 │    │ │Cache        │ │◄──►│ │Products    │ │
│                 │    │ │Manager      │ │    │ │API         │ │
│                 │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Implementation Steps

### 1. Analyze Current SNF Module Structure and Identify Integration Points

**Objective**: Understand the current module structure and identify where to integrate the new dynamic pricing system.

**Key Integration Points**:

- `SNFLandingPage.tsx` - Main component that needs depot context
- `ProductGrid.tsx` - Component that displays products with pricing
- `Header.tsx` - Component that will house location selector
- `filtering.ts` - Utility functions that need to consider depot-specific pricing

**Deliverables**:

- Integration analysis document
- Component dependency map
- Data flow diagram

### 2. Design Geolocation Service for Pincode Detection

**Objective**: Create a service that automatically detects user's pincode using Chrome's geolocation API.

**Technical Approach**:

```typescript
interface GeolocationService {
  getCurrentPosition(): Promise<GeolocationPosition>;
  getPositionFromPincode(pincode: string): Promise<GeolocationPosition>;
  requestPermission(): Promise<PermissionStatus>;
}

interface LocationData {
  latitude: number;
  longitude: number;
  pincode: string;
  accuracy: number;
}
```

**Error Handling**:

- Permission denied
- Position unavailable
- Timeout
- Invalid pincode format

**Deliverables**:

- `services/geolocation.ts` - Geolocation service implementation
- Type definitions for location data
- Error handling utilities

### 3. Create Pincode-to-Depot Mapping Service

**Objective**: Implement a service that maps pincodes to depots using the area master API.

**API Endpoints to Use**:

- `GET /api/public/area-masters/by-pincode/:pincode` - Get area masters by pincode
- `GET /api/public/area-masters/validate-dairy/:pincode` - Validate dairy support

**Technical Approach**:

```typescript
interface DepotMappingService {
  getDepotByPincode(pincode: string): Promise<Depot | null>;
  getAllDepotsForPincode(pincode: string): Promise<Depot[]>;
  validateServiceAvailability(pincode: string): Promise<ServiceAvailability>;
}

interface ServiceAvailability {
  isAvailable: boolean;
  depots: Depot[];
  supportedProducts: string[];
}
```

**Deliverables**:

- `services/depotMapping.ts` - Depot mapping service
- API client functions
- Type definitions for depot and area data

### 4. Implement API Service Layer for Products and Depot Variants

**Objective**: Create a comprehensive API service layer for fetching products and depot variants.

**API Endpoints to Use**:

- `GET /api/public/depot-variants` - Get all depot variants
- `GET /api/public/depot-variants/:productId` - Get variants for specific product
- `GET /api/public/depots/:depotId/variants` - Get variants for specific depot
- `GET /api/products/public` - Get public products

**Technical Approach**:

```typescript
interface ProductService {
  getProducts(depotId?: number): Promise<Product[]>;
  getProductVariants(
    productId: number,
    depotId: number
  ): Promise<DepotVariant[]>;
  getDepotVariants(depotId: number): Promise<DepotVariant[]>;
  getAllDepotVariants(): Promise<DepotVariant[]>;
}

interface Product {
  id: number;
  name: string;
  description: string;
  attachmentUrl?: string;
  isDairyProduct: boolean;
  category?: Category;
}

interface DepotVariant {
  id: string;
  name: string;
  mrp: number;
  buyOncePrice?: number;
  price3Day?: number;
  price7Day?: number;
  price15Day?: number;
  price1Month?: number;
  minimumQty: number;
  depot: Depot;
  product: Product;
}
```

**Deliverables**:

- `services/api.ts` - API service layer
- Type definitions for all API responses
- Request/response interceptors for error handling

### 5. Design Client-Side State Management for Depot-Specific Pricing

**Objective**: Create a state management system to handle depot-specific pricing and user location.

**State Structure**:

```typescript
interface PricingState {
  currentDepot: Depot | null;
  userLocation: LocationData | null;
  products: Product[];
  depotVariants: DepotVariant[];
  isLoading: boolean;
  error: string | null;
  pricingCache: Map<string, DepotVariant[]>;
}

interface PricingContextType {
  state: PricingState;
  actions: {
    setDepot: (depot: Depot) => void;
    setLocation: (location: LocationData) => void;
    refreshPricing: () => Promise<void>;
    clearCache: () => void;
  };
}
```

**Technical Approach**:

- Use React Context API for state management
- Implement custom hooks for accessing pricing state
- Create selectors for optimized re-renders

**Deliverables**:

- `context/PricingContext.tsx` - Pricing context provider
- `hooks/usePricing.ts` - Custom hook for accessing pricing data
- `hooks/useDepot.ts` - Custom hook for depot management
- State selectors and utilities

### 6. Create Caching Mechanism for Products and Variants

**Objective**: Implement an efficient caching system to minimize API calls and improve performance.

**Caching Strategy**:

```typescript
interface CacheManager {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, data: T, ttl?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
  clear(): Promise<void>;
}

interface CacheConfig {
  products: { ttl: number; maxSize: number };
  variants: { ttl: number; maxSize: number };
  depotMapping: { ttl: number; maxSize: number };
}
```

**Cache Keys Structure**:

- `products:{depotId}` - Cached products for depot
- `variants:{productId}:{depotId}` - Cached variants for product-depot combination
- `depot:{pincode}` - Cached depot mapping for pincode

**Deliverables**:

- `services/cache.ts` - Cache management service
- Cache configuration and utilities
- Cache invalidation strategies

### 7. Implement Error Handling for Geolocation Failures and Invalid Pincodes

**Objective**: Create comprehensive error handling for all location and pricing-related failures.

**Error Types**:

```typescript
interface GeolocationError {
  type:
    | "PERMISSION_DENIED"
    | "POSITION_UNAVAILABLE"
    | "TIMEOUT"
    | "INVALID_PINCODE";
  message: string;
  recoverable: boolean;
  fallbackAction?: () => Promise<void>;
}

interface PricingError {
  type:
    | "API_ERROR"
    | "NETWORK_ERROR"
    | "DEPOT_NOT_FOUND"
    | "VARIANTS_NOT_AVAILABLE";
  message: string;
  details?: any;
}
```

**Error Handling Strategy**:

- Graceful degradation to manual pincode entry
- Retry mechanisms for transient failures
- User-friendly error messages
- Fallback to default depot when needed

**Deliverables**:

- `services/errorHandling.ts` - Error handling utilities
- Error boundary components
- User notification system
- Fallback strategies

### 8. Add Manual Pincode Entry Fallback Functionality

**Objective**: Implement a manual pincode entry system as a fallback when geolocation fails.

**Component Structure**:

```typescript
interface PincodeEntryProps {
  onPincodeSubmit: (pincode: string) => Promise<void>;
  onLocationRequest: () => Promise<void>;
  isLoading: boolean;
  error?: string;
}

interface LocationSelectorProps {
  currentLocation: LocationData | null;
  currentDepot: Depot | null;
  onPincodeChange: (pincode: string) => void;
  onUseCurrentLocation: () => void;
}
```

**Features**:

- Pincode validation
- Recent pincodes history
- Autocomplete for known pincodes
- Service availability indicator

**Deliverables**:

- `components/LocationSelector.tsx` - Location selector component
- `components/PincodeEntry.tsx` - Pincode entry modal
- Pincode validation utilities
- Recent locations storage

### 9. Update ProductGrid Component to Display Dynamic Pricing

**Objective**: Modify the ProductGrid component to display depot-specific pricing dynamically.

**Component Changes**:

```typescript
interface ProductCardProps {
  product: Product;
  variants: DepotVariant[];
  depot: Depot;
  onAddToCart: (variant: DepotVariant) => void;
  onViewDetails: (productId: number) => void;
}

interface ProductGridProps {
  products: Product[];
  depot: Depot;
  variants: DepotVariant[];
  loading: boolean;
  onAddToCart: (variant: DepotVariant) => void;
}
```

**Pricing Display Logic**:

- Show MRP from depot variants
- Display subscription pricing options
- Highlight best available price
- Show stock availability

**Deliverables**:

- Updated `components/ProductGrid.tsx`
- New `components/ProductCard.tsx`
- Pricing display utilities
- Variant selection logic

### 10. Create Responsive Price Update System Without Page Reloads

**Objective**: Implement a system that updates prices dynamically when the depot changes without page reloads.

**Technical Approach**:

```typescript
interface PriceUpdateSystem {
  subscribeToDepotChanges(callback: (depot: Depot) => void): () => void;
  updatePricesForDepot(depotId: number): Promise<void>;
  prefetchDepotData(depotId: number): Promise<void>;
}

interface PriceAnimationProps {
  oldPrice: number;
  newPrice: number;
  currency: string;
  duration?: number;
}
```

**Optimizations**:

- Prefetch depot data for nearby locations
- Smooth price transition animations
- Debounced rapid depot changes
- Loading states during price updates

**Deliverables**:

- Price update service
- Price animation components
- Depot change handlers
- Performance optimization utilities

### 11. Implement Loading States and Skeleton Screens During Data Fetching

**Objective**: Create comprehensive loading states and skeleton screens for better user experience.

**Loading States**:

- Initial location detection
- Depot mapping
- Product fetching
- Price updates
- Variant loading

**Skeleton Components**:

```typescript
interface ProductSkeletonProps {
  count?: number;
  showPrice?: boolean;
  showImage?: boolean;
}

interface PricingSkeletonProps {
  showVariants?: boolean;
  variantCount?: number;
}
```

**Deliverables**:

- Enhanced `components/LoadingSkeleton.tsx`
- Loading state management utilities
- Skeleton components for all data fetching scenarios
- Loading overlay components

### 12. Add Comprehensive Testing for the Dynamic Pricing System

**Objective**: Create thorough test coverage for all new functionality.

**Test Areas**:

- Geolocation service tests
- Depot mapping service tests
- API service tests
- Cache management tests
- State management tests
- Component integration tests
- Error handling tests
- Performance tests

**Test Structure**:

```typescript
// Example test structure
describe("GeolocationService", () => {
  describe("getCurrentPosition", () => {
    it("should return current position when permission granted", async () => {
      // Test implementation
    });

    it("should handle permission denied error", async () => {
      // Test implementation
    });
  });
});

describe("PricingContext", () => {
  describe("depot changes", () => {
    it("should update prices when depot changes", async () => {
      // Test implementation
    });
  });
});
```

**Deliverables**:

- Comprehensive test suite
- Test utilities and mocks
- Performance benchmarks
- Test coverage reports

### 13. Optimize Performance with Batched Queries and Efficient Data Fetching

**Objective**: Implement performance optimizations to ensure smooth user experience.

**Optimization Strategies**:

- Batch API requests for multiple products
- Implement request deduplication
- Use React.memo for component optimization
- Virtualize large product lists
- Implement lazy loading for images
- Optimize bundle size with code splitting

**Performance Metrics**:

- Initial load time
- Price update time
- Memory usage
- API call count
- Bundle size impact

**Deliverables**:

- Performance optimization utilities
- Batched API request handlers
- Component optimization implementations
- Performance monitoring tools
- Optimization documentation

### 14. Create Documentation for the New Dynamic Pricing System

**Objective**: Create comprehensive documentation for the new dynamic pricing system.

**Documentation Areas**:

- System architecture overview
- API documentation
- Component documentation
- Service documentation
- Integration guide
- Troubleshooting guide
- Performance optimization guide

**Documentation Structure**:

```markdown
# Dynamic Pricing System Documentation

## 1. Architecture Overview

## 2. API Integration

## 3. Component Guide

## 4. State Management

## 5. Caching Strategy

## 6. Error Handling

## 7. Performance Optimization

## 8. Testing Guide

## 9. Deployment Guide

## 10. Troubleshooting
```

**Deliverables**:

- Complete system documentation
- API reference documentation
- Component documentation with examples
- Integration guides
- Troubleshooting guides
- Performance optimization guides

## Technology Stack

### Frontend Technologies

- **React 18** - UI framework
- **TypeScript** - Type safety
- **React Context API** - State management
- **React Query/SWR** - Data fetching (optional)
- **Tailwind CSS** - Styling
- **Vite** - Build tool

### Backend Integration

- **REST APIs** - Backend communication
- **Prisma ORM** - Database models (existing)
- **Express.js** - Backend framework (existing)

### Additional Libraries

- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **React Hot Toast** - Notifications
- **Framer Motion** - Animations
- **Vitest** - Testing framework

## Success Metrics

### Performance Metrics

- Initial load time < 3 seconds
- Price update time < 1 second
- API call reduction by 60% through caching
- Bundle size increase < 200KB

### User Experience Metrics

- Geolocation success rate > 90%
- Pincode validation accuracy > 95%
- Error recovery success rate > 80%
- User satisfaction score > 4.0/5.0

### Technical Metrics

- Test coverage > 90%
- Lighthouse score > 90
- No critical vulnerabilities
- Responsive design compliance

## Risk Assessment and Mitigation

### Technical Risks

1. **Geolocation API Limitations**

   - Risk: Browser compatibility issues
   - Mitigation: Implement robust fallback mechanisms

2. **API Performance**

   - Risk: Slow response times affecting UX
   - Mitigation: Implement caching and batched requests

3. **State Management Complexity**
   - Risk: Unpredictable state updates
   - Mitigation: Use immutable state patterns and thorough testing

### Business Risks

1. **User Privacy Concerns**

   - Risk: Users uncomfortable with location tracking
   - Mitigation: Transparent permission requests and clear privacy policy

2. **Service Availability**
   - Risk: Limited service areas
   - Mitigation: Clear communication of service areas and expansion plans

## Timeline and Milestones

### Phase 1: Foundation (Week 1-2)

- [ ] Analyze current system
- [ ] Design geolocation service
- [ ] Create depot mapping service
- [ ] Implement API service layer

### Phase 2: Core Implementation (Week 3-4)

- [ ] Design state management
- [ ] Create caching mechanism
- [ ] Implement error handling
- [ ] Add manual pincode entry

### Phase 3: UI Integration (Week 5-6)

- [ ] Update ProductGrid component
- [ ] Create price update system
- [ ] Implement loading states
- [ ] Add animations and transitions

### Phase 4: Testing and Optimization (Week 7-8)

- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Documentation
- [ ] Final review and deployment

## Conclusion

This implementation plan provides a comprehensive approach to implementing a dynamic product pricing system that will enhance the user experience by providing location-based pricing. The system will be robust, performant, and user-friendly with proper error handling and fallback mechanisms.

The implementation will follow modern React best practices with TypeScript for type safety, comprehensive testing, and thorough documentation. The modular architecture will allow for easy maintenance and future enhancements.
