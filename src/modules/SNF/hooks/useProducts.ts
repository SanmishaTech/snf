import { useState, useEffect, useCallback } from 'react';
import { Product, DepotVariant, ProductWithPricing, PricingError } from '../types';
import { productService } from '../services/api';
import { cacheManager } from '../services/cache';

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
    return productsData.map(product => {
      const productVariants = variantsData.filter(variant => variant.productId === product.id);
      
      // Find the best price (lowest MRP)
      const bestVariant = productVariants.reduce((best, current) => {
        if (!best || current.mrp < best.mrp) {
          return current;
        }
        return best;
      }, null as DepotVariant | null);

      // Check if any variant is in stock
      const inStock = productVariants.some(variant => !variant.notInStock && variant.closingQty > 0);

      // Calculate discount if applicable
      let discount = 0;
      let originalPrice = bestVariant?.mrp || 0;
      
      // If there's a buyOncePrice that's lower than MRP, calculate discount
      if (bestVariant?.buyOncePrice && bestVariant.buyOncePrice < bestVariant.mrp) {
        discount = (bestVariant.mrp - bestVariant.buyOncePrice) / bestVariant.mrp;
      }

      return {
        product,
        variants: productVariants,
        bestPrice: bestVariant?.buyOncePrice || bestVariant?.mrp || 0,
        originalPrice: discount > 0 ? originalPrice : undefined,
        discount: discount > 0 ? discount : undefined,
        inStock,
        deliveryTime: inStock ? 'Same day delivery' : 'Out of stock',
      };
    }).filter(productWithPricing => productWithPricing.variants.length > 0);
  }, []);

  // Fetch products and variants
  const fetchProducts = useCallback(async () => {
    if (!depotId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const cacheKey = `products:${depotId}`;
      const variantsCacheKey = `variants:${depotId}`;

      // Try to get from cache first
      const cachedProducts = await cacheManager.get<Product[]>(cacheKey);
      const cachedVariants = await cacheManager.get<DepotVariant[]>(variantsCacheKey);

      let productsData: Product[];
      let variantsData: DepotVariant[];

      if (cachedProducts && cachedVariants) {
        productsData = cachedProducts;
        variantsData = cachedVariants;
      } else {
        // Fetch from API
        productsData = await productService.getProducts(depotId);
        variantsData = await productService.getDepotVariants(depotId);

        // Cache the results
        await cacheManager.set(cacheKey, productsData, 30 * 60 * 1000); // 30 minutes
        await cacheManager.set(variantsCacheKey, variantsData, 15 * 60 * 1000); // 15 minutes
      }

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

    // Clear cache
    await cacheManager.invalidate(`products:${depotId}`);
    await cacheManager.invalidate(`variants:${depotId}`);

    // Fetch fresh data
    await fetchProducts();
  }, [depotId, fetchProducts]);

  // Fetch products when depot changes
  useEffect(() => {
    if (depotId) {
      fetchProducts();
    }
  }, [depotId, fetchProducts]);

  // Auto-refresh products every 15 minutes
  useEffect(() => {
    if (!depotId) return;

    const interval = setInterval(() => {
      refreshProducts();
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(interval);
  }, [depotId, refreshProducts]);

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
      const cacheKey = `product:${productId}:${depotId}`;

      // Try to get from cache first
      const cachedProduct = await cacheManager.get<ProductWithPricing>(cacheKey);

      if (cachedProduct) {
        setProduct(cachedProduct);
      } else {
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

        // Transform to ProductWithPricing
        const productWithPricing: ProductWithPricing = {
          product: productData,
          variants: variantsData,
          bestPrice: variantsData.length > 0 ? Math.min(...variantsData.map(v => v.buyOncePrice || v.mrp)) : 0,
          originalPrice: variantsData.length > 0 ? Math.min(...variantsData.map(v => v.mrp)) : undefined,
          discount: variantsData.length > 0 ? 
            Math.max(...variantsData.map(v => v.buyOncePrice && v.buyOncePrice < v.mrp ? 
              (v.mrp - v.buyOncePrice) / v.mrp : 0)) : undefined,
          inStock: variantsData.some(v => !v.notInStock && v.closingQty > 0),
          deliveryTime: variantsData.some(v => !v.notInStock && v.closingQty > 0) ? 'Same day delivery' : 'Out of stock',
        };

        setProduct(productWithPricing);

        // Cache the result
        await cacheManager.set(cacheKey, productWithPricing, 10 * 60 * 1000); // 10 minutes
      }
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
      const cacheKey = `search:${query}:${depotId}`;

      // Try to get from cache first
      const cachedResults = await cacheManager.get<ProductWithPricing[]>(cacheKey);

      if (cachedResults) {
        setResults(cachedResults);
      } else {
        // Fetch from API
        const searchResults = await productService.searchProducts(query, depotId);

        // Get variants for each product
        const productsWithVariants = await Promise.all(
          searchResults.map(async (product) => {
            const variants = await productService.getProductVariants(product.id, depotId);
            return {
              product,
              variants,
              bestPrice: variants.length > 0 ? Math.min(...variants.map(v => v.buyOncePrice || v.mrp)) : 0,
              originalPrice: variants.length > 0 ? Math.min(...variants.map(v => v.mrp)) : undefined,
              discount: variants.length > 0 ? 
                Math.max(...variants.map(v => v.buyOncePrice && v.buyOncePrice < v.mrp ? 
                  (v.mrp - v.buyOncePrice) / v.mrp : 0)) : undefined,
              inStock: variants.some(v => !v.notInStock && v.closingQty > 0),
              deliveryTime: variants.some(v => !v.notInStock && v.closingQty > 0) ? 'Same day delivery' : 'Out of stock',
            };
          })
        );

        setResults(productsWithVariants);

        // Cache the results
        await cacheManager.set(cacheKey, productsWithVariants, 5 * 60 * 1000); // 5 minutes
      }
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
  }, [query, searchProducts]);

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
      const cacheKey = `category:${categoryId}:${depotId}`;

      // Try to get from cache first
      const cachedProducts = await cacheManager.get<ProductWithPricing[]>(cacheKey);

      if (cachedProducts) {
        setProducts(cachedProducts);
      } else {
        // Fetch from API
        const categoryProducts = await productService.getProductsByCategory(categoryId, depotId);

        // Get variants for each product
        const productsWithVariants = await Promise.all(
          categoryProducts.map(async (product) => {
            const variants = await productService.getProductVariants(product.id, depotId);
            return {
              product,
              variants,
              bestPrice: variants.length > 0 ? Math.min(...variants.map(v => v.buyOncePrice || v.mrp)) : 0,
              originalPrice: variants.length > 0 ? Math.min(...variants.map(v => v.mrp)) : undefined,
              discount: variants.length > 0 ? 
                Math.max(...variants.map(v => v.buyOncePrice && v.buyOncePrice < v.mrp ? 
                  (v.mrp - v.buyOncePrice) / v.mrp : 0)) : undefined,
              inStock: variants.some(v => !v.notInStock && v.closingQty > 0),
              deliveryTime: variants.some(v => !v.notInStock && v.closingQty > 0) ? 'Same day delivery' : 'Out of stock',
            };
          })
        );

        setProducts(productsWithVariants);

        // Cache the results
        await cacheManager.set(cacheKey, productsWithVariants, 10 * 60 * 1000); // 10 minutes
      }
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