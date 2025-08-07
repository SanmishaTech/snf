import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductGrid } from '../components/ProductGrid';
import { PricingProvider } from '../context/PricingContext';
import { ProductWithPricing, Depot, Product, DepotVariant } from '../types';

// Mock the hooks
vi.mock('../hooks', () => ({
  useLocation: () => ({
    location: { pincode: '560001' },
    error: null,
    isLoading: false,
    permissionGranted: true,
    requestLocation: vi.fn(),
    setManualPincode: vi.fn(),
  }),
  useDepot: () => ({
    depot: { id: 1, name: 'Test Depot', address: 'Test Address', isOnline: true },
    error: null,
    isLoading: false,
    setDepot: vi.fn(),
    refreshDepot: vi.fn(),
  }),
  useProducts: () => ({
    products: [],
    variants: [],
    isLoading: false,
    error: null,
    getProductsWithPricing: () => mockProductsWithPricing,
    getProductsByCategory: vi.fn(),
  }),
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

const mockProductWithPricing: ProductWithPricing = {
  product: mockProduct,
  variants: [mockVariant],
  bestPrice: 100,
  originalPrice: 120,
  discount: 20,
  inStock: true,
  deliveryTime: 'Same day delivery',
};

const mockProductsWithPricing: ProductWithPricing[] = [
  mockProductWithPricing,
  {
    product: {
      ...mockProduct,
      id: 2,
      name: 'Another Product',
    },
    variants: [
      {
        ...mockVariant,
        id: 2,
        productId: 2,
        mrp: 200,
      },
    ],
    bestPrice: 200,
    inStock: true,
  },
  {
    product: {
      ...mockProduct,
      id: 3,
      name: 'Out of Stock Product',
    },
    variants: [
      {
        ...mockVariant,
        id: 3,
        productId: 3,
        closingQty: 0,
        notInStock: true,
      },
    ],
    bestPrice: 150,
    inStock: false,
  },
];

// Wrapper component
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PricingProvider>{children}</PricingProvider>
);

describe('ProductGrid Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render products with pricing information', () => {
    render(<ProductGrid products={mockProductsWithPricing} onAddToCart={vi.fn()} />, { wrapper });

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Another Product')).toBeInTheDocument();
    expect(screen.getByText('Out of Stock Product')).toBeInTheDocument();
  });

  it('should display correct pricing with discount', () => {
    render(<ProductGrid products={mockProductsWithPricing} onAddToCart={vi.fn()} />, { wrapper });

    // Check for discounted price
    expect(screen.getByText('₹100.00')).toBeInTheDocument();
    
    // Check for original price with strikethrough
    const originalPrice = screen.getByText('₹120.00');
    expect(originalPrice).toBeInTheDocument();
    expect(originalPrice).toHaveClass('line-through');
    
    // Check for discount badge
    expect(screen.getByText('-20%')).toBeInTheDocument();
  });

  it('should display regular price without discount', () => {
    const productsWithoutDiscount = [mockProductsWithPricing[1]]; // Second product has no discount
    render(<ProductGrid products={productsWithoutDiscount} onAddToCart={vi.fn()} />, { wrapper });

    expect(screen.getByText('₹200.00')).toBeInTheDocument();
    
    // Should not have original price or discount badge
    expect(screen.queryByText('₹240.00')).not.toBeInTheDocument();
    expect(screen.queryByText(/-\d+%/)).not.toBeInTheDocument();
  });

  it('should show out of stock badge for unavailable products', () => {
    const outOfStockProducts = [mockProductsWithPricing[2]]; // Third product is out of stock
    render(<ProductGrid products={outOfStockProducts} onAddToCart={vi.fn()} />, { wrapper });

    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
  });

  it('should disable add to cart button for out of stock products', () => {
    const outOfStockProducts = [mockProductsWithPricing[2]]; // Third product is out of stock
    const onAddToCart = vi.fn();
    
    render(<ProductGrid products={outOfStockProducts} onAddToCart={onAddToCart} />, { wrapper });

    const addToCartButton = screen.getByText('Add to cart');
    expect(addToCartButton).toBeDisabled();
    
    fireEvent.click(addToCartButton);
    expect(onAddToCart).not.toHaveBeenCalled();
  });

  it('should call onAddToCart when add to cart button is clicked', () => {
    const onAddToCart = vi.fn();
    
    render(<ProductGrid products={mockProductsWithPricing} onAddToCart={onAddToCart} />, { wrapper });

    const addToCartButtons = screen.getAllByText('Add to cart');
    fireEvent.click(addToCartButtons[0]);
    
    expect(onAddToCart).toHaveBeenCalledWith(mockProductsWithPricing[0]);
  });

  it('should show loading skeleton when isLoading is true', () => {
    const { useProducts } = require('../hooks');
    
    // Override the mock to return loading state
    useProducts.mockReturnValue({
      products: [],
      variants: [],
      isLoading: true,
      error: null,
      getProductsWithPricing: () => [],
      getProductsByCategory: vi.fn(),
    });

    render(<ProductGrid products={[]} onAddToCart={vi.fn()} />, { wrapper });

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('should show error message when there is an error', () => {
    const { useProducts } = require('../hooks');
    
    // Override the mock to return error state
    useProducts.mockReturnValue({
      products: [],
      variants: [],
      isLoading: false,
      error: { type: 'API_ERROR', message: 'Failed to load products', code: 'API_ERROR' },
      getProductsWithPricing: () => [],
      getProductsByCategory: vi.fn(),
    });

    render(<ProductGrid products={[]} onAddToCart={vi.fn()} />, { wrapper });

    expect(screen.getByText('Failed to load products')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should show no products message when products array is empty', () => {
    render(<ProductGrid products={[]} onAddToCart={vi.fn()} />, { wrapper });

    expect(screen.getByText('No products found. Try adjusting filters or search.')).toBeInTheDocument();
  });

  it('should handle retry on error', () => {
    const { useProducts } = require('../hooks');
    const mockRefreshDepot = vi.fn();
    
    // Override the mock to return error state
    useProducts.mockReturnValue({
      products: [],
      variants: [],
      isLoading: false,
      error: { type: 'API_ERROR', message: 'Failed to load products', code: 'API_ERROR' },
      getProductsWithPricing: () => [],
      getProductsByCategory: vi.fn(),
    });

    // Mock useDepot to return refreshDepot function
    const { useDepot } = require('../hooks');
    useDepot.mockReturnValue({
      depot: null,
      error: null,
      isLoading: false,
      setDepot: vi.fn(),
      refreshDepot: mockRefreshDepot,
    });

    render(<ProductGrid products={[]} onAddToCart={vi.fn()} />, { wrapper });

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    
    expect(mockRefreshDepot).toHaveBeenCalled();
  });

  it('should display product images with correct attributes', () => {
    render(<ProductGrid products={mockProductsWithPricing} onAddToCart={vi.fn()} />, { wrapper });

    const productImages = screen.getAllByAltText('Test Product');
    expect(productImages.length).toBeGreaterThan(0);
    
    const firstImage = productImages[0];
    expect(firstImage).toHaveAttribute('loading', 'lazy');
    expect(firstImage).toHaveAttribute('decoding', 'async');
  });

  it('should have correct links for product details', () => {
    render(<ProductGrid products={mockProductsWithPricing} onAddToCart={vi.fn()} />, { wrapper });

    const productLinks = screen.getAllByRole('link', { name: /Test Product/ });
    expect(productLinks.length).toBeGreaterThan(0);
    
    const firstLink = productLinks[0];
    expect(firstLink).toHaveAttribute('href', '/snf/product/1');
  });

  it('should have accessible ARIA labels', () => {
    render(<ProductGrid products={mockProductsWithPricing} onAddToCart={vi.fn()} />, { wrapper });

    const addToCartButtons = screen.getAllByRole('button', { name: /Add to cart/ });
    expect(addToCartButtons.length).toBeGreaterThan(0);
    
    const viewButtons = screen.getAllByRole('link', { name: /View/ });
    expect(viewButtons.length).toBeGreaterThan(0);
  });

  it('should be responsive and adjust grid columns', () => {
    render(<ProductGrid products={mockProductsWithPricing} onAddToCart={vi.fn()} />, { wrapper });

    const grid = screen.getByTestId('products-grid');
    expect(grid).toHaveClass('grid');
    expect(grid).toHaveClass('grid-cols-2'); // Default for mobile
    expect(grid).toHaveClass('sm:grid-cols-3'); // Small screens
    expect(grid).toHaveClass('lg:grid-cols-4'); // Large screens
  });

  it('should apply hover effects to product cards', () => {
    render(<ProductGrid products={mockProductsWithPricing} onAddToCart={vi.fn()} />, { wrapper });

    const productCards = screen.getAllByRole('article');
    expect(productCards.length).toBeGreaterThan(0);
    
    const firstCard = productCards[0];
    expect(firstCard).toHaveClass('hover:shadow');
    expect(firstCard).toHaveClass('transition');
  });
});