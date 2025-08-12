import { useState, useEffect, useCallback } from 'react';
import { Product, DepotVariant, ProductWithPricing, PricingError } from '../types';
import { productService } from '../services/api';

/**
 * Custom hook for managing products with pricing
 * 
 * @param depotId - ID of the depot to get products for
 * @returns Products state and functions
 */
export const useProducts = (depotId?: number) => {
  const [products, setProducts] = useState<ProductWithPricing[]>([]);
  const [rawProducts, setRawProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<DepotVariant[]>([]);
  const [error, setError] = useState<PricingError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Transform products and variants into ProductWithPricing
  const transformProducts = useCallback((productsData: Product[], variantsData: DepotVariant[]): ProductWithPricing[] => {
    return productsData
.filter(p => p.isDairyProduct !== true)
      .map(product => {
        const productVariants = variantsData.filter(variant => variant.productId === product.id);
        
        // Find the variant with the lowest buyOncePrice or use MRP if buyOncePrice is not available
        const bestVariant = productVariants.reduce((best, current) => {
          if (!best) return current;
          
          const bestPrice = best.buyOncePrice ?? best.mrp;
          const currentPrice = current.buyOncePrice ?? current.mrp;
          
          return currentPrice < bestPrice ? current : best;
        }, null as DepotVariant | null);

        // Check if any variant is in stock
        const inStock = productVariants.some(variant => !variant.notInStock && variant.closingQty > 0);

        // Calculate discount if applicable
        let discount = 0;
        const buyOncePrice = bestVariant?.buyOncePrice ?? bestVariant?.mrp;
        const mrp = bestVariant?.mrp ?? 0;
        
        // If there's a buyOncePrice that's lower than MRP, calculate discount
        if (buyOncePrice && buyOncePrice < mrp) {
          discount = (mrp - buyOncePrice) / mrp;
        }

        return {
          product,
          variants: productVariants,
          buyOncePrice: buyOncePrice || 0,
          mrp: mrp,
          discount: discount > 0 ? discount : undefined,
          inStock,
          deliveryTime: inStock ? 'Same day delivery' : 'Out of stock',
        };
      })
      .filter(productWithPricing => productWithPricing.variants.length > 0);
  }, []);

  // Fetch products and variants
  const fetchProducts = useCallback(async () => {
    if (!depotId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch from API directly
      const productsData = await productService.getProducts(depotId);
      const variantsData = await productService.getDepotVariants(depotId);

      setRawProducts(productsData);
      setVariants(variantsData);
      
      // Transform and set products with pricing
      const productsWithPricing = transformProducts(productsData, variantsData);
      setProducts(productsWithPricing);
    } catch (err) {
      const pricingError: PricingError = {
        type: 'API_ERROR',
        message: 'Failed to fetch products',
        code: 'PRODUCTS_FETCH_FAILED',
        recoverable: true,
        details: err,
      };
      setError(pricingError);
    } finally {
      setIsLoading(false);
    }
  }, [depotId, transformProducts]);

  // Refresh products
  const refreshProducts = useCallback(async () => {
    if (!depotId) {
      return;
    }

    // Fetch fresh data
    await fetchProducts();
  }, [depotId, fetchProducts]);

  // Fetch products when depot changes
  useEffect(() => {
    if (depotId) {
      fetchProducts();
    }
  }, [depotId, fetchProducts]);

  return {
    products,
    rawProducts,
    variants,
    error,
    isLoading,
    refresh: refreshProducts,
  };
};

/**
 * Hook for getting a single product by ID
 * 
 * @param productId - ID of the product to fetch
 * @param depotId - ID of the depot to get pricing for
 * @returns Product with pricing information
 */
export const useProduct = (productId?: number, depotId?: number) => {
  const [product, setProduct] = useState<ProductWithPricing | null>(null);
  const [error, setError] = useState<PricingError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProduct = useCallback(async () => {
    if (!productId || !depotId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch from API
      const [productData, variantsData] = await Promise.all([
        productService.getProductById(productId),
        productService.getProductVariants(productId, depotId),
      ]);

      if (!productData) {
        throw {
          type: 'API_ERROR',
          message: 'Product not found',
          code: 'PRODUCT_NOT_FOUND',
          recoverable: false,
        } as PricingError;
      }

      console.log('Product data fetched:', productData);
      console.log('Variants data fetched:', variantsData);

      // Transform to ProductWithPricing
      const bestVariant = variantsData.reduce((best, current) => {
        if (!best) return current;
        
        const bestPrice = best.buyOncePrice ?? best.mrp;
        const currentPrice = current.buyOncePrice ?? current.mrp;
        
        return currentPrice < bestPrice ? current : best;
      }, null as DepotVariant | null);

      const buyOncePrice = bestVariant?.buyOncePrice ?? bestVariant?.mrp;
      const mrp = bestVariant?.mrp ?? 0;
      
      // Calculate discount if applicable
      let discount = 0;
      if (buyOncePrice && buyOncePrice < mrp) {
        discount = (mrp - buyOncePrice) / mrp;
      }

      const productWithPricing: ProductWithPricing = {
        product: productData,
        variants: variantsData,
        buyOncePrice: buyOncePrice || 0,
        mrp: mrp,
        discount: discount > 0 ? discount : undefined,
        inStock: variantsData.some(v => !v.notInStock && v.closingQty > 0),
        deliveryTime: variantsData.some(v => !v.notInStock && v.closingQty > 0) ? 'Same day delivery' : 'Out of stock',
      };

      setProduct(productWithPricing);
    } catch (err) {
      const pricingError = err as PricingError;
      setError(pricingError);
    } finally {
      setIsLoading(false);
    }
  }, [productId, depotId]);

  // Fetch product when IDs change
  useEffect(() => {
    if (productId && depotId) {
      fetchProduct();
    }
  }, [productId, depotId, fetchProduct]);

  return {
    product,
    error,
    isLoading,
    refresh: fetchProduct,
  };
};

/**
 * Hook for searching products
 * 
 * @param query - Search query
 * @param depotId - ID of the depot to search in
 * @returns Search results
 */
export const useProductSearch = (query: string, depotId?: number) => {
  const [results, setResults] = useState<ProductWithPricing[]>([]);
  const [error, setError] = useState<PricingError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const searchProducts = useCallback(async () => {
    if (!query.trim() || !depotId) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch from API
      const searchResults = await productService.searchProducts(query, depotId);

      // Get variants for each product
      const productsWithVariants = await Promise.all(
        searchResults.map(async (product) => {
          const variants = await productService.getProductVariants(product.id, depotId);
          // Find the variant with the lowest buyOncePrice or use MRP if buyOncePrice is not available
          const bestVariant = variants.reduce((best, current) => {
            if (!best) return current;
            
            const bestPrice = best.buyOncePrice ?? best.mrp;
            const currentPrice = current.buyOncePrice ?? current.mrp;
            
            return currentPrice < bestPrice ? current : best;
          }, null as DepotVariant | null);

          const buyOncePrice = bestVariant?.buyOncePrice ?? bestVariant?.mrp;
          const mrp = bestVariant?.mrp ?? 0;
          
          // Calculate discount if applicable
          let discount = 0;
          if (buyOncePrice && buyOncePrice < mrp) {
            discount = (mrp - buyOncePrice) / mrp;
          }

          return {
            product,
            variants,
            buyOncePrice: buyOncePrice || 0,
            mrp: mrp,
            discount: discount > 0 ? discount : undefined,
            inStock: variants.some(v => !v.notInStock && v.closingQty > 0),
            deliveryTime: variants.some(v => !v.notInStock && v.closingQty > 0) ? 'Same day delivery' : 'Out of stock',
          };
        })
      );

      setResults(productsWithVariants);
    } catch (err) {
      const pricingError: PricingError = {
        type: 'API_ERROR',
        message: 'Failed to search products',
        code: 'PRODUCT_SEARCH_FAILED',
        recoverable: true,
        details: err,
      };
      setError(pricingError);
    } finally {
      setIsLoading(false);
    }
  }, [query, depotId]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchProducts();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [query, depotId, searchProducts]);

  return {
    results,
    error,
    isLoading,
    search: searchProducts,
  };
};

/**
 * Hook for getting products by category
 * 
 * @param categoryId - ID of the category
 * @param depotId - ID of the depot
 * @returns Products in the category
 */
export const useProductsByCategory = (categoryId?: number, depotId?: number) => {
  const [products, setProducts] = useState<ProductWithPricing[]>([]);
  const [error, setError] = useState<PricingError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProductsByCategory = useCallback(async () => {
    if (!categoryId || !depotId) {
      setProducts([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch from API
      const categoryProducts = await productService.getProductsByCategory(categoryId, depotId);

      // Get variants for each product
      const productsWithVariants = await Promise.all(
        categoryProducts.map(async (product) => {
          const variants = await productService.getProductVariants(product.id, depotId);
          // Find the variant with the lowest buyOncePrice or use MRP if buyOncePrice is not available
          const bestVariant = variants.reduce((best, current) => {
            if (!best) return current;
            
            const bestPrice = best.buyOncePrice ?? best.mrp;
            const currentPrice = current.buyOncePrice ?? current.mrp;
            
            return currentPrice < bestPrice ? current : best;
          }, null as DepotVariant | null);

          const buyOncePrice = bestVariant?.buyOncePrice ?? bestVariant?.mrp;
          const mrp = bestVariant?.mrp ?? 0;
          
          // Calculate discount if applicable
          let discount = 0;
          if (buyOncePrice && buyOncePrice < mrp) {
            discount = (mrp - buyOncePrice) / mrp;
          }

          return {
            product,
            variants,
            buyOncePrice: buyOncePrice || 0,
            mrp: mrp,
            discount: discount > 0 ? discount : undefined,
            inStock: variants.some(v => !v.notInStock && v.closingQty > 0),
            deliveryTime: variants.some(v => !v.notInStock && v.closingQty > 0) ? 'Same day delivery' : 'Out of stock',
          };
        })
      );

      setProducts(productsWithVariants);
    } catch (err) {
      const pricingError: PricingError = {
        type: 'API_ERROR',
        message: 'Failed to fetch products by category',
        code: 'CATEGORY_PRODUCTS_FETCH_FAILED',
        recoverable: true,
        details: err,
      };
      setError(pricingError);
    } finally {
      setIsLoading(false);
    }
  }, [categoryId, depotId]);

  // Fetch products when category or depot changes
  useEffect(() => {
    if (categoryId && depotId) {
      fetchProductsByCategory();
    }
  }, [categoryId, depotId, fetchProductsByCategory]);

  return {
    products,
    error,
    isLoading,
    refresh: fetchProductsByCategory,
  };
};