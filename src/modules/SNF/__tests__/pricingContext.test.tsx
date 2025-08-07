import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { PricingProvider, usePricingContext } from '../context/PricingContext';
import { Depot, Product, DepotVariant, LocationData } from '../types';

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
  },
}));

vi.mock('../services/productService', () => ({
  productService: {
    getProducts: vi.fn(),
    getDepotVariants: vi.fn(),
  },
}));

vi.mock('../services/cache', () => ({
  cacheManager: {
    get: vi.fn(),
    set: vi.fn(),
    invalidate: vi.fn(),
    clear: vi.fn(),
  },
}));

const mockDepot: Depot = {
  id: 1,
  name: 'Test Depot',
  address: 'Test Address',
  isOnline: true,
};

const mockProduct: Product = {
  id: 1,
  name: 'Test Product',
  description: 'Test Description',
  isDairyProduct: false,
  maintainStock: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockVariant: DepotVariant = {
  id: 1,
  depotId: 1,
  productId: 1,
  name: 'Test Variant',
  minimumQty: 1,
  closingQty: 10,
  notInStock: false,
  isHidden: false,
  mrp: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
  depot: mockDepot,
  product: mockProduct,
};

const mockLocation: LocationData = {
  latitude: 12.9716,
  longitude: 77.5946,
  pincode: '560001',
  accuracy: 10,
};

// Test component that uses the pricing context
const TestComponent = () => {
  const { state, actions } = usePricingContext();
  
  return (
    <div>
      <div data-testid="depot-name">{state.currentDepot?.name || 'No depot'}</div>
      <div data-testid="location-pincode">{state.userLocation?.pincode || 'No location'}</div>
      <div data-testid="products-count">{state.products.length}</div>
      <div data-testid="variants-count">{state.depotVariants.length}</div>
      <div data-testid="loading">{state.isLoading ? 'Loading' : 'Not loading'}</div>
      <div data-testid="error">{state.error?.message || 'No error'}</div>
      <div data-testid="permission-granted">{state.isLocationPermissionGranted ? 'Granted' : 'Not granted'}</div>
      <div data-testid="service-available">{state.serviceAvailability?.isAvailable ? 'Available' : 'Not available'}</div>
      
      <button
        data-testid="set-depot"
        onClick={() => actions.setDepot(mockDepot)}
      >
        Set Depot
      </button>
      
      <button
        data-testid="set-location"
        onClick={() => actions.setLocation(mockLocation)}
      >
        Set Location
      </button>
      
      <button
        data-testid="refresh-pricing"
        onClick={() => actions.refreshPricing()}
      >
        Refresh Pricing
      </button>
      
      <button
        data-testid="clear-cache"
        onClick={() => actions.clearCache()}
      >
        Clear Cache
      </button>
      
      <button
        data-testid="set-error"
        onClick={() => actions.setError({ type: 'API_ERROR', message: 'Test error', code: 'TEST_ERROR' })}
      >
        Set Error
      </button>
      
      <button
        data-testid="set-loading"
        onClick={() => actions.setLoading(true)}
      >
        Set Loading
      </button>
      
      <button
        data-testid="set-permission"
        onClick={() => actions.setLocationPermission(true)}
      >
        Set Permission
      </button>
    </div>
  );
};

describe('PricingContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should provide initial state', () => {
    const { getByTestId } = render(
      <PricingProvider>
        <TestComponent />
      </PricingProvider>
    );

    expect(getByTestId('depot-name')).toHaveTextContent('No depot');
    expect(getByTestId('location-pincode')).toHaveTextContent('No location');
    expect(getByTestId('products-count')).toHaveTextContent('0');
    expect(getByTestId('variants-count')).toHaveTextContent('0');
    expect(getByTestId('loading')).toHaveTextContent('Not loading');
    expect(getByTestId('error')).toHaveTextContent('No error');
    expect(getByTestId('permission-granted')).toHaveTextContent('Not granted');
    expect(getByTestId('service-available')).toHaveTextContent('Not available');
  });

  it('should set depot correctly', async () => {
    const { getByTestId } = render(
      <PricingProvider>
        <TestComponent />
      </PricingProvider>
    );

    await act(async () => {
      getByTestId('set-depot').click();
    });

    await waitFor(() => {
      expect(getByTestId('depot-name')).toHaveTextContent('Test Depot');
    });
  });

  it('should set location correctly', async () => {
    const { getByTestId } = render(
      <PricingProvider>
        <TestComponent />
      </PricingProvider>
    );

    await act(async () => {
      getByTestId('set-location').click();
    });

    await waitFor(() => {
      expect(getByTestId('location-pincode')).toHaveTextContent('560001');
    });
  });

  it('should set loading state correctly', async () => {
    const { getByTestId } = render(
      <PricingProvider>
        <TestComponent />
      </PricingProvider>
    );

    await act(async () => {
      getByTestId('set-loading').click();
    });

    await waitFor(() => {
      expect(getByTestId('loading')).toHaveTextContent('Loading');
    });
  });

  it('should set error correctly', async () => {
    const { getByTestId } = render(
      <PricingProvider>
        <TestComponent />
      </PricingProvider>
    );

    await act(async () => {
      getByTestId('set-error').click();
    });

    await waitFor(() => {
      expect(getByTestId('error')).toHaveTextContent('Test error');
    });
  });

  it('should set permission correctly', async () => {
    const { getByTestId } = render(
      <PricingProvider>
        <TestComponent />
      </PricingProvider>
    );

    await act(async () => {
      getByTestId('set-permission').click();
    });

    await waitFor(() => {
      expect(getByTestId('permission-granted')).toHaveTextContent('Granted');
    });
  });

  it('should clear error when set to null', async () => {
    const { getByTestId } = render(
      <PricingProvider>
        <TestComponent />
      </PricingProvider>
    );

    // First set an error
    await act(async () => {
      getByTestId('set-error').click();
    });

    await waitFor(() => {
      expect(getByTestId('error')).toHaveTextContent('Test error');
    });

    // Then clear it by calling setError with null
    await act(async () => {
      const { actions } = usePricingContext();
      actions.setError(null);
    });

    await waitFor(() => {
      expect(getByTestId('error')).toHaveTextContent('No error');
    });
  });

  it('should throw error when usePricingContext is used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('usePricingContext must be used within a PricingProvider');

    console.error = originalError;
  });

  it('should handle multiple state updates correctly', async () => {
    const { getByTestId } = render(
      <PricingProvider>
        <TestComponent />
      </PricingProvider>
    );

    // Set multiple states in sequence
    await act(async () => {
      getByTestId('set-depot').click();
      getByTestId('set-location').click();
      getByTestId('set-permission').click();
    });

    await waitFor(() => {
      expect(getByTestId('depot-name')).toHaveTextContent('Test Depot');
      expect(getByTestId('location-pincode')).toHaveTextContent('560001');
      expect(getByTestId('permission-granted')).toHaveTextContent('Granted');
    });
  });

  it('should maintain state consistency across re-renders', async () => {
    const { getByTestId, rerender } = render(
      <PricingProvider>
        <TestComponent />
      </PricingProvider>
    );

    // Set some state
    await act(async () => {
      getByTestId('set-deot').click();
      getByTestId('set-location').click();
    });

    await waitFor(() => {
      expect(getByTestId('depot-name')).toHaveTextContent('Test Depot');
      expect(getByTestId('location-pincode')).toHaveTextContent('560001');
    });

    // Re-render component
    rerender(
      <PricingProvider>
        <TestComponent />
      </PricingProvider>
    );

    // State should be preserved
    expect(getByTestId('depot-name')).toHaveTextContent('Test Depot');
    expect(getByTestId('location-pincode')).toHaveTextContent('560001');
  });
});