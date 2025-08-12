import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLocation, useDepot, useProducts } from '../hooks';
import { PricingProvider } from '../context/PricingContext';
import { Depot, Product, DepotVariant, LocationData, GeolocationError } from '../types';

// Mock the services
vi.mock('../services/depotMapping', () => ({
  depotMappingService: {
    getOptimalDepot: vi.fn(),
    getOnlineDepot: vi.fn(),
    validateServiceAvailability: vi.fn(),
  },
}));

vi.mock('../services/geolocation', () => ({
  geolocationService: {
    isGeolocationSupported: vi.fn(),
    checkPermissionStatus: vi.fn(),
    requestPermission: vi.fn(),
    requestLocationWithExplanation: vi.fn(),
    getPositionFromPincode: vi.fn(),
  },
}));

vi.mock('../services/productService', () => ({
  productService: {
    getProducts: vi.fn(),
    getDepotVariants: vi.fn(),
  },
}));

const mockDepot: Depot = {
  id: 1,
  name: 'Test Depot',
  address: 'Test Address',
  isOnline: true,
};

const mockLocation: LocationData = {
  latitude: 12.9716,
  longitude: 77.5946,
  pincode: '560001',
  accuracy: 10,
};

const mockProducts: Product[] = [
  {
    id: 1,
    name: 'Test Product 1',
    description: 'Test Description 1',
    isDairyProduct: false,
    maintainStock: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    name: 'Test Product 2',
    description: 'Test Description 2',
    isDairyProduct: true,
    maintainStock: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockVariants: DepotVariant[] = [
  {
    id: 1,
    depotId: 1,
    productId: 1,
    name: 'Test Variant 1',
    minimumQty: 1,
    closingQty: 10,
    notInStock: false,
    isHidden: false,
    mrp: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    depot: mockDepot,
    product: mockProducts[0],
  },
  {
    id: 2,
    depotId: 1,
    productId: 2,
    name: 'Test Variant 2',
    minimumQty: 1,
    closingQty: 5,
    notInStock: false,
    isHidden: false,
    mrp: 200,
    createdAt: new Date(),
    updatedAt: new Date(),
    depot: mockDepot,
    product: mockProducts[1],
  },
];

// Wrapper component for hooks that need the PricingProvider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PricingProvider>{children}</PricingProvider>
);

describe('useLocation Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial location state', () => {
    const { result } = renderHook(() => useLocation(), { wrapper });

    expect(result.current.location).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.permissionGranted).toBe(false);
    expect(typeof result.current.requestLocation).toBe('function');
    expect(typeof result.current.setManualPincode).toBe('function');
  });

  it('should request location successfully', async () => {
    const { geolocationService } = require('../services/geolocation');
    const { depotMappingService } = require('../services/depotMapping');

    geolocationService.requestLocationWithExplanation.mockResolvedValue(mockLocation);
    depotMappingService.getOptimalDepot.mockResolvedValue(mockDepot);

    const { result } = renderHook(() => useLocation(), { wrapper });

    await act(async () => {
      await result.current.requestLocation();
    });

    await waitFor(() => {
      expect(result.current.location).toEqual(mockLocation);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    expect(geolocationService.requestLocationWithExplanation).toHaveBeenCalled();
    expect(depotMappingService.getOptimalDepot).toHaveBeenCalledWith('560001');
  });

  it('should handle location request error', async () => {
    const { geolocationService } = require('../services/geolocation');
    const mockError: GeolocationError = {
      type: 'PERMISSION_DENIED',
      message: 'User denied location access',
      code: 1,
      recoverable: false,
    };

    geolocationService.requestLocationWithExplanation.mockRejectedValue(mockError);

    const { result } = renderHook(() => useLocation(), { wrapper });

    await act(async () => {
      await result.current.requestLocation();
    });

    await waitFor(() => {
      expect(result.current.location).toBeNull();
      expect(result.current.error).toEqual(mockError);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should set manual pincode successfully', async () => {
    const { geolocationService } = require('../services/geolocation');
    const { depotMappingService } = require('../services/depotMapping');

    geolocationService.getPositionFromPincode.mockResolvedValue(mockLocation);
    depotMappingService.getOptimalDepot.mockResolvedValue(mockDepot);

    const { result } = renderHook(() => useLocation(), { wrapper });

    await act(async () => {
      await result.current.setManualPincode('560001');
    });

    await waitFor(() => {
      expect(result.current.location).toEqual(mockLocation);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    expect(geolocationService.getPositionFromPincode).toHaveBeenCalledWith('560001');
    expect(depotMappingService.getOptimalDepot).toHaveBeenCalledWith('560001');
  });

  it('should handle invalid pincode', async () => {
    const { geolocationService } = require('../services/geolocation');
    const mockError: GeolocationError = {
      type: 'INVALID_PINCODE',
      message: 'Invalid pincode provided',
      code: 'INVALID_PINCODE',
      recoverable: true,
    };

    geolocationService.getPositionFromPincode.mockRejectedValue(mockError);

    const { result } = renderHook(() => useLocation(), { wrapper });

    await act(async () => {
      await result.current.setManualPincode('000000');
    });

    await waitFor(() => {
      expect(result.current.location).toBeNull();
      expect(result.current.error).toEqual(mockError);
      expect(result.current.isLoading).toBe(false);
    });
  });
});

describe('useDepot Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial depot state', () => {
    const { result } = renderHook(() => useDepot(), { wrapper });

    expect(result.current.depot).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.setDepot).toBe('function');
    expect(typeof result.current.refreshDepot).toBe('function');
  });

  it('should set depot successfully', async () => {
    const { depotMappingService } = require('../services/depotMapping');
    const { productService } = require('../services/productService');

    depotMappingService.validateServiceAvailability.mockResolvedValue({
      isAvailable: true,
      depot: mockDepot,
    });

    productService.getProducts.mockResolvedValue(mockProducts);
    productService.getDepotVariants.mockResolvedValue(mockVariants);

    const { result } = renderHook(() => useDepot(), { wrapper });

    await act(async () => {
      await result.current.setDepot(mockDepot);
    });

    await waitFor(() => {
      expect(result.current.depot).toEqual(mockDepot);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    expect(depotMappingService.validateServiceAvailability).toHaveBeenCalledWith('560001');
    expect(productService.getProducts).toHaveBeenCalledWith(1);
    expect(productService.getDepotVariants).toHaveBeenCalledWith(1);
  });

  it('should handle depot set error', async () => {
    const { depotMappingService } = require('../services/depotMapping');

    depotMappingService.validateServiceAvailability.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useDepot(), { wrapper });

    await act(async () => {
      await result.current.setDepot(mockDepot);
    });

    await waitFor(() => {
      expect(result.current.depot).toBeNull();
      expect(result.current.error).not.toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should refresh depot successfully', async () => {
    const { depotMappingService } = require('../services/depotMapping');
    const { productService } = require('../services/productService');

    // Set initial depot
    const { result, rerender } = renderHook(() => useDepot(), { wrapper });

    await act(async () => {
      await result.current.setDepot(mockDepot);
    });

    // Mock service calls for refresh
    depotMappingService.validateServiceAvailability.mockResolvedValue({
      isAvailable: true,
      depot: mockDepot,
    });

    productService.getProducts.mockResolvedValue(mockProducts);
    productService.getDepotVariants.mockResolvedValue(mockVariants);

    await act(async () => {
      await result.current.refreshDepot();
    });

    await waitFor(() => {
      expect(result.current.depot).toEqual(mockDepot);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    expect(depotMappingService.validateServiceAvailability).toHaveBeenCalledTimes(2);
    expect(productService.getProducts).toHaveBeenCalledTimes(2);
    expect(productService.getDepotVariants).toHaveBeenCalledTimes(2);
  });
});

describe('useProducts Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial products state', () => {
    const { result } = renderHook(() => useProducts(), { wrapper });

    expect(result.current.products).toEqual([]);
    expect(result.current.variants).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should load products when depot is set', async () => {
    const { productService } = require('../services/productService');

    productService.getProducts.mockResolvedValue(mockProducts);
    productService.getDepotVariants.mockResolvedValue(mockVariants);

    const { result } = renderHook(() => useProducts(), { wrapper });

    // Set depot through context
    const { setDepot } = result.current;
    
    await act(async () => {
      await setDepot(mockDepot);
    });

    await waitFor(() => {
      expect(result.current.products).toEqual(mockProducts);
      expect(result.current.variants).toEqual(mockVariants);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    expect(productService.getProducts).toHaveBeenCalledWith(1);
    expect(productService.getDepotVariants).toHaveBeenCalledWith(1);
  });

  it('should handle products loading error', async () => {
    const { productService } = require('../services/productService');

    productService.getProducts.mockRejectedValue(new Error('Failed to load products'));

    const { result } = renderHook(() => useProducts(), { wrapper });

    // Set depot through context
    const { setDepot } = result.current;
    
    await act(async () => {
      await setDepot(mockDepot);
    });

    await waitFor(() => {
      expect(result.current.products).toEqual([]);
      expect(result.current.variants).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).not.toBeNull();
    });
  });

  it('should return products with pricing information', async () => {
    const { productService } = require('../services/productService');

    productService.getProducts.mockResolvedValue(mockProducts);
    productService.getDepotVariants.mockResolvedValue(mockVariants);

    const { result } = renderHook(() => useProducts(), { wrapper });

    // Set depot through context
    const { setDepot } = result.current;
    
    await act(async () => {
      await setDepot(mockDepot);
    });

    await waitFor(() => {
      expect(result.current.products).toEqual(mockProducts);
      expect(result.current.variants).toEqual(mockVariants);
    });

    const productsWithPricing = result.current.getProductsWithPricing();
    expect(productsWithPricing).toHaveLength(2);
    expect(productsWithPricing[0].product).toEqual(mockProducts[0]);
    expect(productsWithPricing[0].variants).toEqual([mockVariants[0]]);
    expect(productsWithPricing[0].buyOncePrice).toBe(100);
    expect(productsWithPricing[0].mrp).toBe(100);
    expect(productsWithPricing[0].inStock).toBe(true);
  });

  it('should filter products by category', async () => {
    const { productService } = require('../services/productService');

    productService.getProducts.mockResolvedValue(mockProducts);
    productService.getDepotVariants.mockResolvedValue(mockVariants);

    const { result } = renderHook(() => useProducts(), { wrapper });

    // Set depot through context
    const { setDepot } = result.current;
    
    await act(async () => {
      await setDepot(mockDepot);
    });

    await waitFor(() => {
      expect(result.current.products).toEqual(mockProducts);
    });

    const dairyProducts = result.current.getProductsByCategory(true);
    expect(dairyProducts).toHaveLength(1);
    expect(dairyProducts[0].product.isDairyProduct).toBe(true);

    const nonDairyProducts = result.current.getProductsByCategory(false);
    expect(nonDairyProducts).toHaveLength(1);
    expect(nonDairyProducts[0].product.isDairyProduct).toBe(false);
  });
});